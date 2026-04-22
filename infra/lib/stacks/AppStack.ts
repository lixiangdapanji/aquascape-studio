import { Stack, StackProps, RemovalPolicy, Duration, CfnOutput } from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  AllowedMethods,
  CachePolicy,
  OriginRequestPolicy,
  OriginProtocolPolicy,
  ViewerProtocolPolicy,
} from "aws-cdk-lib/aws-cloudfront";
import { LoadBalancerV2Origin } from "aws-cdk-lib/aws-cloudfront-origins";
import { Distribution } from "aws-cdk-lib/aws-cloudfront";
import { IVpc, Peer, Port, SecurityGroup, SubnetType } from "aws-cdk-lib/aws-ec2";
import {
  Cluster,
  FargateService,
  FargateTaskDefinition,
  ContainerImage,
  LogDriver,
  Protocol as EcsProtocol,
} from "aws-cdk-lib/aws-ecs";
import {
  ApplicationLoadBalancer,
  ApplicationProtocol,
  ApplicationTargetGroup,
  TargetType,
  ListenerAction,
  HttpCodeTarget,
} from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { Table, AttributeType, BillingMode, StreamViewType } from "aws-cdk-lib/aws-dynamodb";
import { Bucket, BlockPublicAccess, BucketEncryption, HttpMethods } from "aws-cdk-lib/aws-s3";
import { Repository, TagMutability } from "aws-cdk-lib/aws-ecr";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { Topic } from "aws-cdk-lib/aws-sns";
import { EmailSubscription } from "aws-cdk-lib/aws-sns-subscriptions";
import {
  Alarm,
  ComparisonOperator,
  Metric,
  MathExpression,
  TreatMissingData,
} from "aws-cdk-lib/aws-cloudwatch";
import { SnsAction } from "aws-cdk-lib/aws-cloudwatch-actions";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Budget } from "./Budget";

export interface AppStackProps extends StackProps {
  envName: "dev" | "stage" | "prod";
  domainName: string;
  vpc: IVpc;
  /**
   * CloudFront distribution from EdgeStack. AppStack mutates it via
   * `addBehavior()` to route `/app/*` and `/api/*` to the ALB. Passing
   * the distribution object avoids a hard cross-stack export and keeps
   * the EdgeStack free of app-tier references.
   */
  distribution: Distribution;
}

/**
 * App-tier: ECS Fargate service behind an internal-facing ALB, DynamoDB
 * user-scape table, S3 assets bucket, ECR repo, cost budget, and
 * CloudWatch alarms → SNS.
 *
 * The Fargate service starts with a placeholder nginx image so the ALB
 * target group can register a healthy task before `app-agent` builds and
 * pushes the real web image via the `deploy-web` workflow.
 */
export class AppStack extends Stack {
  readonly cluster: Cluster;
  readonly service: FargateService;
  readonly loadBalancer: ApplicationLoadBalancer;
  readonly opsTopic: Topic;

  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id, props);

    const isProd = props.envName === "prod";

    // ECS cluster.
    this.cluster = new Cluster(this, "Cluster", {
      clusterName: `aquascape-studio-${props.envName}`,
      vpc: props.vpc,
      containerInsights: isProd,
    });

    // ECR repo for the web image.
    const repo = new Repository(this, "WebRepo", {
      repositoryName: `aquascape-studio-web-${props.envName}`,
      imageTagMutability: TagMutability.IMMUTABLE,
      lifecycleRules: [{ maxImageCount: 20 }],
      removalPolicy: isProd ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    });

    // DynamoDB — user-saved scapes.
    const table = new Table(this, "UserScapesTable", {
      tableName: `UserScapes-${props.envName}`,
      partitionKey: { name: "pk", type: AttributeType.STRING },
      sortKey:      { name: "sk", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      stream: StreamViewType.NEW_AND_OLD_IMAGES,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: isProd },
      removalPolicy: isProd ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    });
    table.addGlobalSecondaryIndex({
      indexName: "gsi1",
      partitionKey: { name: "gsi1pk", type: AttributeType.STRING },
      sortKey:      { name: "gsi1sk", type: AttributeType.STRING },
    });

    // S3 bucket for user-uploaded reference images.
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

    // ---- Ops SNS topic ----
    this.opsTopic = new Topic(this, "OpsTopic", {
      topicName: `aquascape-ops-${props.envName}`,
      displayName: `Aquascape Studio ops alerts (${props.envName})`,
    });
    this.opsTopic.addSubscription(new EmailSubscription("chengxiaopusuperman@gmail.com"));

    // ---- ALB (internet-facing; CloudFront origin) ----
    const albSg = new SecurityGroup(this, "AlbSg", {
      vpc: props.vpc,
      description: `aquascape ALB SG (${props.envName})`,
      allowAllOutbound: true,
    });
    // Phase 1: open :80 to the world. CloudFront sits in front (once
    // EdgeStack adds the ALB behavior) but there is no network-level
    // lockdown yet. Phase 3 locks this down to the
    // `com.amazonaws.global.cloudfront.origin-facing` managed prefix list
    // and adds WAFv2 managed rules on CloudFront.
    albSg.addIngressRule(Peer.anyIpv4(), Port.tcp(80), "HTTP from CloudFront");

    this.loadBalancer = new ApplicationLoadBalancer(this, "Alb", {
      vpc: props.vpc,
      internetFacing: true, // required so CloudFront can reach it without VPC PrivateLink
      loadBalancerName: `aquascape-${props.envName}`,
      securityGroup: albSg,
      vpcSubnets: { subnetType: SubnetType.PUBLIC },
    });

    const serviceSg = new SecurityGroup(this, "ServiceSg", {
      vpc: props.vpc,
      description: `aquascape Fargate task SG (${props.envName})`,
      allowAllOutbound: true,
    });
    serviceSg.addIngressRule(albSg, Port.tcp(3000), "ALB to task");

    // ---- Task definition + container ----
    const logGroup = new LogGroup(this, "WebLogs", {
      logGroupName: `/aquascape-studio/web/${props.envName}`,
      retention: isProd ? RetentionDays.ONE_MONTH : RetentionDays.TWO_WEEKS,
      removalPolicy: isProd ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    });

    const taskDef = new FargateTaskDefinition(this, "WebTaskDef", {
      family: `aquascape-web-${props.envName}`,
      cpu: 256,
      memoryLimitMiB: 512,
    });

    // Scoped permissions: DynamoDB table and uploads bucket.
    table.grantReadWriteData(taskDef.taskRole);
    uploads.grantReadWrite(taskDef.taskRole);

    // Placeholder image — app-agent replaces via deploy-web workflow (force
    // new deployment pointing at the ECR `latest` tag once the first real
    // image is pushed).
    taskDef.addContainer("web", {
      containerName: "web",
      image: ContainerImage.fromRegistry("public.ecr.aws/nginx/nginx:stable"),
      portMappings: [{ containerPort: 3000, protocol: EcsProtocol.TCP }],
      logging: LogDriver.awsLogs({ streamPrefix: "web", logGroup }),
      environment: {
        NODE_ENV: props.envName === "prod" ? "production" : "development",
        AQUASCAPE_ENV: props.envName,
      },
      essential: true,
    });

    // ---- Service ----
    this.service = new FargateService(this, "WebService", {
      serviceName: `aquascape-web-${props.envName}`,
      cluster: this.cluster,
      taskDefinition: taskDef,
      desiredCount: isProd ? 2 : 1,
      minHealthyPercent: 50,
      maxHealthyPercent: 200,
      assignPublicIp: false,
      vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [serviceSg],
      enableExecuteCommand: !isProd,
      circuitBreaker: { rollback: true },
      healthCheckGracePeriod: Duration.seconds(60),
    });

    // ---- Target group + listener ----
    const targetGroup = new ApplicationTargetGroup(this, "WebTg", {
      vpc: props.vpc,
      port: 3000,
      protocol: ApplicationProtocol.HTTP,
      targetType: TargetType.IP,
      targets: [this.service],
      healthCheck: {
        path: "/",
        interval: Duration.seconds(30),
        timeout: Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
        // nginx returns 200 on / — real app must expose /healthz and we'll
        // switch to it once app-agent lands.
        healthyHttpCodes: "200-399",
      },
      deregistrationDelay: Duration.seconds(30),
    });

    const httpListener = this.loadBalancer.addListener("HttpListener", {
      port: 80,
      protocol: ApplicationProtocol.HTTP,
      defaultAction: ListenerAction.forward([targetGroup]),
    });
    // Make TS happy about unused var; the listener side-effects register
    // the target group.
    void httpListener;

    // Export ALB DNS for EdgeStack (cross-stack via SSM to avoid a hard
    // CloudFormation export that would block future stack splits).
    new StringParameter(this, "AlbDnsNameParam", {
      parameterName: `/aquascape-studio/${props.envName}/alb-dns-name`,
      stringValue: this.loadBalancer.loadBalancerDnsName,
      description: "ALB DNS name for CloudFront origin",
    });

    // ---- Alarms ----
    // 5xx ratio > 1% over 5 minutes (ALB-level, covers both task crashes
    // and upstream 5xx from the container).
    const requests = this.loadBalancer.metrics.requestCount({ period: Duration.minutes(5) });
    const http5xx = this.loadBalancer.metrics.httpCodeTarget(
      HttpCodeTarget.TARGET_5XX_COUNT,
      { period: Duration.minutes(5) },
    );
    const error5xxRatio = new MathExpression({
      expression: "IF(reqs > 0, (err5xx / reqs) * 100, 0)",
      usingMetrics: { reqs: requests, err5xx: http5xx },
      period: Duration.minutes(5),
      label: "5xx ratio %",
    });
    const alarm5xx = new Alarm(this, "Alb5xxRatioAlarm", {
      alarmName: `aquascape-${props.envName}-alb-5xx-ratio`,
      metric: error5xxRatio,
      threshold: 1, // percent
      evaluationPeriods: 1,
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
      alarmDescription: "ALB target 5xx > 1% over 5m",
    });
    alarm5xx.addAlarmAction(new SnsAction(this.opsTopic));

    // Running task count below desired count — stuck deployments, OOM
    // loops, or capacity exhaustion all trip this.
    const runningTasks = new Metric({
      namespace: "ECS/ContainerInsights",
      metricName: "RunningTaskCount",
      dimensionsMap: {
        ClusterName: this.cluster.clusterName,
        ServiceName: this.service.serviceName,
      },
      statistic: "Average",
      period: Duration.minutes(1),
    });
    const alarmTasks = new Alarm(this, "RunningTasksLowAlarm", {
      alarmName: `aquascape-${props.envName}-running-tasks-low`,
      metric: runningTasks,
      threshold: isProd ? 2 : 1,
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      comparisonOperator: ComparisonOperator.LESS_THAN_THRESHOLD,
      treatMissingData: TreatMissingData.BREACHING,
      alarmDescription: "ECS service is below desired task count",
    });
    alarmTasks.addAlarmAction(new SnsAction(this.opsTopic));

    // ALB target response time P99 > 2s over 5 minutes.
    const p99 = this.loadBalancer.metrics.targetResponseTime({
      period: Duration.minutes(5),
      statistic: "p99",
    });
    const alarmLatency = new Alarm(this, "AlbP99LatencyAlarm", {
      alarmName: `aquascape-${props.envName}-alb-p99-latency`,
      metric: p99,
      threshold: 2, // seconds
      evaluationPeriods: 2,
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
      alarmDescription: "ALB target response time p99 > 2s",
    });
    alarmLatency.addAlarmAction(new SnsAction(this.opsTopic));

    // ---- CloudFront behaviors → ALB ----
    // `/app/*` (SSR-rendered routes) and `/api/*` (Next.js API routes) bypass
    // the S3 default origin and go to the ALB. CachingDisabled is used
    // because these are dynamic; AllViewer forwards headers/cookies/query.
    const albOrigin = new LoadBalancerV2Origin(this.loadBalancer, {
      protocolPolicy: OriginProtocolPolicy.HTTP_ONLY,
      httpPort: 80,
      readTimeout: Duration.seconds(30),
      keepaliveTimeout: Duration.seconds(5),
    });

    for (const pathPattern of ["/app/*", "/api/*"]) {
      props.distribution.addBehavior(pathPattern, albOrigin, {
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: AllowedMethods.ALLOW_ALL,
        cachePolicy: CachePolicy.CACHING_DISABLED,
        originRequestPolicy: OriginRequestPolicy.ALL_VIEWER,
        compress: true,
      });
    }

    // ---- Outputs ----
    new CfnOutput(this, "UploadsBucketName", { value: uploads.bucketName });
    new CfnOutput(this, "ClusterName", { value: this.cluster.clusterName });
    new CfnOutput(this, "ServiceName", { value: this.service.serviceName });
    new CfnOutput(this, "EcrRepoUri", { value: repo.repositoryUri });
    new CfnOutput(this, "AlbDnsName", { value: this.loadBalancer.loadBalancerDnsName });
    new CfnOutput(this, "OpsTopicArn", { value: this.opsTopic.topicArn });
    new CfnOutput(this, "WebLogGroupName", { value: logGroup.logGroupName });
  }
}
