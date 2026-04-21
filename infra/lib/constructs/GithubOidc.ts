import { Construct } from "constructs";
import {
  OpenIdConnectProvider,
  Role,
  WebIdentityPrincipal,
  ManagedPolicy,
  PolicyStatement,
  Effect,
} from "aws-cdk-lib/aws-iam";
import { CfnOutput } from "aws-cdk-lib";

export interface GithubOidcProps {
  githubUser: string;
  repoName: string;
  environments: Array<"dev" | "stage" | "prod">;
}

export class GithubOidc extends Construct {
  readonly roles: Record<string, Role> = {};

  constructor(scope: Construct, id: string, props: GithubOidcProps) {
    super(scope, id);

    const provider = new OpenIdConnectProvider(this, "Provider", {
      url: "https://token.actions.githubusercontent.com",
      clientIds: ["sts.amazonaws.com"],
    });

    for (const env of props.environments) {
      const principal = new WebIdentityPrincipal(provider.openIdConnectProviderArn, {
        StringEquals: { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
        StringLike: {
          "token.actions.githubusercontent.com:sub":
            `repo:${props.githubUser}/${props.repoName}:environment:${env}`,
        },
      });

      const role = new Role(this, `DeployRole-${env}`, {
        roleName: `GithubDeployRole-${env}`,
        assumedBy: principal,
        description: `Assumed by GitHub Actions in environment=${env}`,
        managedPolicies:
          env === "prod"
            ? []
            : [ManagedPolicy.fromAwsManagedPolicyName("PowerUserAccess")],
      });

      if (env === "prod") {
        role.addToPolicy(new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            "cloudformation:*", "s3:*", "cloudfront:*",
            "ecs:*", "ecr:*", "dynamodb:*",
            "iam:PassRole", "iam:GetRole",
            "logs:*", "acm:*",
            "route53:ChangeResourceRecordSets", "route53:GetHostedZone",
            "route53:ListHostedZones", "route53:ListResourceRecordSets",
            "ssm:GetParameter*", "ssm:PutParameter",
            "secretsmanager:GetSecretValue",
          ],
          resources: ["*"],
        }));
      }

      new CfnOutput(this, `DeployRoleArn-${env}`, {
        value: role.roleArn,
        exportName: `GithubDeployRoleArn-${env}`,
      });

      this.roles[env] = role;
    }
  }
}
