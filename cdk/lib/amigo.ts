import { readFileSync } from "fs";
import { CfnInclude } from "@aws-cdk/cloudformation-include";
import type { CfnIncludeProps } from "@aws-cdk/cloudformation-include/lib/cfn-include";
import type { App, IConstruct } from "@aws-cdk/core";
import { Annotations, CfnResource, TagManager } from "@aws-cdk/core";
import type {
  GuStackProps,
  GuStageParameter,
} from "@guardian/cdk/lib/constructs/core";
import { GuStack } from "@guardian/cdk/lib/constructs/core";
import { yamlParse } from "yaml-cfn";

const areArraysEqual = <T>(arrayOne: T[], arrayTwo: T[]) => {
  return (
    arrayOne.length === arrayTwo.length &&
    arrayOne.every((value, index) => value === arrayTwo[index])
  );
};

interface CfnYaml {
  Resources: Record<string, { Properties: { Tags?: Array<{ Key: string }> } }>;
}

interface GuStackForYamlMigrationProps extends GuStackProps, CfnIncludeProps {}

class GuStackForYamlMigration extends GuStack {
  private readonly cfnYaml: CfnYaml;

  private validateTags() {
    this.node.findAll().forEach((construct: IConstruct) => {
      if (
        CfnResource.isCfnResource(construct) &&
        TagManager.isTaggable(construct)
      ) {
        const identityTags = ["App", "Stack", "Stage"];

        const constructId = construct.node.id;

        const currentTags = (
          this.cfnYaml.Resources[constructId].Properties.Tags ?? []
        ).map((_) => _.Key);

        const expectedTags = Array.from(
          new Set([...identityTags, ...currentTags])
        );
        const expectedTagsInOrder = [...expectedTags].sort();

        const isTagOrderCorrect = areArraysEqual<string>(
          expectedTags,
          expectedTagsInOrder
        );

        const hasMissingTags =
          expectedTags.filter(
            (identityTag) => !currentTags.includes(identityTag)
          ).length > 0;

        console.log(
          constructId,
          currentTags,
          expectedTagsInOrder,
          hasMissingTags,
          isTagOrderCorrect
        );

        if (hasMissingTags || !isTagOrderCorrect) {
          Annotations.of(construct).addError(
            `TAGGING ERROR. Missing identity tags or tags not listed in correct order. Expected: [${expectedTagsInOrder.join(
              ", "
            )}]. Actual: [${currentTags.join(", ")}]`
          );
        }
      }
    });
  }

  constructor(app: App, id: string, props: GuStackForYamlMigrationProps) {
    super(app, id, { ...props, migratedFromCloudFormation: true });

    this.cfnYaml = yamlParse(
      readFileSync(props.templateFile, "utf8")
    ) as CfnYaml;

    const yamlTemplateProps: CfnIncludeProps = {
      ...props,
      parameters: {
        ...props.parameters,
        Stage: this.getParam<GuStageParameter>("Stage"), // TODO `GuStageParameter` could be a singleton to simplify this
      },
    };

    new CfnInclude(this, `${id}Yaml`, yamlTemplateProps);

    this.validateTags();
  }
}

export class AmigoStack extends GuStack {
  constructor(scope: App, id: string, props: GuStackForYamlMigrationProps) {
    super(scope, id, props);
  }
}
