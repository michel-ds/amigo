import path from "path";
import { App } from "@aws-cdk/core";
import { AmigoStack } from "../lib/amigo";

const app = new App();

const templateFile = path.join(__dirname, "../../cloudformation.yaml");

new AmigoStack(app, "AMIgo", {
  stack: "deploy",
  templateFile,
});
