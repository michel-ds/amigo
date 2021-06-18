import { readFileSync } from "fs";
import path from "path";
import { CfnInclude } from "@aws-cdk/cloudformation-include";
import type { CfnIncludeProps } from "@aws-cdk/cloudformation-include/lib/cfn-include";
import type { App, IConstruct } from "@aws-cdk/core";
import { Annotations, TagManager } from "@aws-cdk/core";
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

class GuYamlMigration extends CfnInclude {
  constructor(stack: GuStack, props: CfnIncludeProps) {
    super(stack, "YamlTemplate", props);

    const template = yamlParse(
      readFileSync(props.templateFile, "utf8")
    ) as CfnYaml;

    this.node.findAll().forEach((construct: IConstruct) => {
      if (TagManager.isTaggable(construct)) {
        const identityTags = ["App", "Stack", "Stage"];

        const constructId = construct.node.id;

        const currentTags = (
          template.Resources[constructId].Properties.Tags ?? []
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
}

export class AmigoStack extends GuStack {
  constructor(scope: App, id: string, props: GuStackProps) {
    super(scope, id, props);

    const templateFile = path.join(__dirname, "../../cloudformation.yaml");

    new GuYamlMigration(this, {
      templateFile,
      parameters: {
        Stage: this.getParam<GuStageParameter>("Stage"), // TODO `GuStageParameter` could be a singleton to simplify this
      },
    });
  }
}
