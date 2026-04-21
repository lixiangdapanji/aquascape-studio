#\!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { BootstrapStack } from "../lib/stacks/BootstrapStack";
import { NetworkStack } from "../lib/stacks/NetworkStack";
import { EdgeStack } from "../lib/stacks/EdgeStack";
import { AppStack } from "../lib/stacks/AppStack";

const app = new cdk.App();

/**
 * One-off per account. Creates the GitHub OIDC provider and the per-env
 * deploy roles. Deploy this ONCE manually from a human session with admin
 * credentials; after that, Actions takes over using the roles it creates.
 */
new BootstrapStack(app, "AquascapeStudio-Bootstrap", {
  env: { account: "063418083301", region: "us-east-1" },
  githubUser: "lixiangdapanji",
  repoName: "aquascape-studio",
  environments: ["dev", "stage", "prod"],
});

/**
 * Per-env stacks. Selected by `cdk deploy --context env=dev`.
 */
const envName = (app.node.tryGetContext("env") ?? "dev") as "dev" | "stage" | "prod";
const common = {
  env: { account: "063418083301", region: "us-east-1" },
  envName,
  domainName: "efferves.live",
};

const network = new NetworkStack(app, `AquascapeStudio-Network-${envName}`, common);
const edge = new EdgeStack(app, `AquascapeStudio-Edge-${envName}`, {
  ...common,
  subdomain: envName === "prod" ? undefined : envName,
});
const appStack = new AppStack(app, `AquascapeStudio-App-${envName}`, {
  ...common,
  vpc: network.vpc,
});
appStack.addDependency(network);
appStack.addDependency(edge);

app.synth();
