import { Stack, StackProps, RemovalPolicy, Duration, CfnOutput } from "aws-cdk-lib";
import { Construct } from "constructs";
import { IVpc } from "aws-cdk-lib/aws-ec2";
import { Cluster } from "aws-cdk-lib/aws-ecs";
import { Table, AttributeType, BillingMode, StreamViewType } from "aws-cdk-lib/aws-dynamodb";
import { Bucket, BlockPublicAccess, BucketEncryption, HttpMethods } from "aws-cdk-lib/aws-s3";
import { Repository, TagMutability } from "aws-cdk-lib/aws-ecr";
import { Budget } from "./Budget";

export interface AppStackProps extends StackProps {
  envName: "dev" | "stage" | "prod";
  domainName: string;
  vpc: IVpc;
}

/**
 * App-tier: ECS cluster (empty for Phase 1; infra-agent fills in the Fargate
 * service in Phase 2), DynamoDB user-scape table, S3 assets bucket, ECR repo,
 * cost budget.
 */
export class AppStack extends Stack {
  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id, props);

    const isProd = props.envName === "prod";

    // ECS cluster — empty container runs land here in Phase 2.
    new Cluster(this, "Cluster", {
      clusterName: `aquascape-studio-${props.envName}`,
      vpc: props.vpc,
      containerInsights: isProd,
    });

    // ECR repo for the web image.
    new Repository(this, "WebRepo", {
      repositoryName: `aquascape-studio-web-${props.envName}`,
      imageTagMutability: TagMutability.IMMUTABLE,
      lifecycleRules: [{ maxImageCount: 20 }],
      removalPolicy: isProd ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    });

    // DynamoDB — user-saved scapes.
    new Table(this, "UserScapesTable", {
      tableName: `UserScapes-${props.envName}`,
      partitionKey: { name: "pk", type: AttributeType.STRING },
      sortKey:      { name: "sk", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      stream: StreamViewType.NEW_AND_OLD_IMAGES,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: isProd },
      removalPolicy: isProd ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    }).addGlobalSecondaryIndex({
      indexName: "gsi1",
      partitionKey: { name: "gsi1pk", type: AttributeType.STRING },
      sortKey:      { name: "gsi1sk", type: AttributeType.STRING },
    });

    // S3 bucket for user-uploaded reference images (hardscape photos, plant
    // photos for CV-based calibration).
    const uploads = new Bucket(this, "UploadsBucket", {
      bucketName: `aquascape-studio-uploads-${props.envName}-${this.account}`,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      lifecycleRules: [
        {
          id: "transition-archive",
          transitions: [{ storageClass: { value: "GLACIER" } as never, transitionAfter: Duration.days(90) }],
          enabled: true,
        },
      ],
      cors: [
        {
          allowedMethods: [HttpMethods.GET, HttpMethods.PUT, HttpMethods.POST],
          allowedOrigins: ["*"], // tightened in Phase 3
          allowedHeaders: ["*"],
          maxAge: 3000,
        },
      ],
      removalPolicy: isProd ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      autoDeleteObjects: !isProd,
    });

    // Cost guardrail.
    new Budget(this, "Budget", {
      envName: props.envName,
      monthlyLimitUsd: isProd ? 600 : 150,
      notifyEmail: "chengxiaopusuperman@gmail.com",
    });

    new CfnOutput(this, "UploadsBucketName", { value: uploads.bucketName });
  }
}
