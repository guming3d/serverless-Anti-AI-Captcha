import * as path from "path";
import * as iam from "@aws-cdk/aws-iam";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as ecs from "@aws-cdk/aws-ecs";
import * as logs from "@aws-cdk/aws-logs";
import * as events from "@aws-cdk/aws-events";
import * as ecs_patterns from "@aws-cdk/aws-ecs-patterns";
import { ContainerImage } from "@aws-cdk/aws-ecs";
import { DockerImageAsset } from '@aws-cdk/aws-ecr-assets';
import { Aws, Construct, IgnoreMode, NestedStack, NestedStackProps } from '@aws-cdk/core';

export interface CaptchaGeneratorStackProps extends NestedStackProps {
  readonly ddb_name: string,
  readonly captcha_number: string,
  readonly captcha_s3_bucket: string
}

export class CaptchaGeneratorStack extends NestedStack {

  constructor(scope: Construct, id: string, props: CaptchaGeneratorStackProps) {
    super(scope, id, props);

    const ddbName = props.ddb_name
    const captchaNumber = props.captcha_number
    const s3_bucket_name = props.captcha_s3_bucket
    const vpc = new ec2.Vpc(this, "MyVpc", {
      maxAzs: 3 // Default is all AZs in region
    });

    const cluster = new ecs.Cluster(this, "CaptchaGeneratorCluster", {
      vpc: vpc,
      containerInsights: true
    });

    const taskDefinitionDailyGenerateCaptcha= new ecs.FargateTaskDefinition(this, "DailyGenerateCaptchaFargateTask", {
      memoryLimitMiB: 2048,
      cpu: 256
    })

    const dailyCaptchaGeneratorImage = new DockerImageAsset(this, 'BulkLoadCaptchaDataImage', {
      directory: path.join(__dirname, '../'),
      file: 'container.d/load-captcha-data/Dockerfile',
      exclude: [
        'container.d/(!load-captcha-data)',
        'lambda.d/**',
        'lib/**',
        'scripts/**',
      ],
      ignoreMode: IgnoreMode.GLOB,
    });

    taskDefinitionDailyGenerateCaptcha.addContainer("DailyCaptchaGeneratorContainer", {
      image: ContainerImage.fromDockerImageAsset(dailyCaptchaGeneratorImage),
      cpu: 256,
      memoryLimitMiB: 2048,
      memoryReservationMiB: 2048,
      logging: ecs.LogDriver.awsLogs({
        streamPrefix: "ecs",
        logGroup: new logs.LogGroup(this, "DailyGenerateCaptchaLogGroup", {
          logGroupName: "/ecs/DailyGenerateCaptchaLogGroup/ContainerLogs",
          retention: logs.RetentionDays.ONE_WEEK
        })
      }),
      environment:
        {
          CAPTCHA_DDB_NAME: ddbName,
          CAPTCHA_NUMBER: captchaNumber,
          REGION_NAME: Aws.REGION,
          S3_BUCKET_NAME: s3_bucket_name
        },
    })

    const permissions = new iam.PolicyStatement({
      actions: [
        "s3:*",
        "cloudwatch:*",
        "dynamodb:*"
      ],
      resources: ["*"]
    })

    taskDefinitionDailyGenerateCaptcha.addToTaskRolePolicy(permissions);
    new ecs_patterns.ScheduledFargateTask(this, "CaptchaGeneratorTask",{
      cluster: cluster,
      desiredTaskCount: 1,
      enabled: true,
      schedule: events.Schedule.expression("cron(* 16 * * ? *)"),
      vpc: vpc,
      scheduledFargateTaskDefinitionOptions: {taskDefinition: taskDefinitionDailyGenerateCaptcha}
    });

  }
}
