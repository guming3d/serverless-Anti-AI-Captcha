import { Construct,  NestedStack, NestedStackProps } from '@aws-cdk/core';
import * as ec2 from "@aws-cdk/aws-ec2";
import * as ecs from "@aws-cdk/aws-ecs";
import * as ecs_patterns from "@aws-cdk/aws-ecs-patterns";

export class CaptchaGeneratorStack extends NestedStack {

  constructor(scope: Construct, id: string, props: NestedStackProps) {
    super(scope, id, props);
    const vpc = new ec2.Vpc(this, "MyVpc", {
      maxAzs: 3 // Default is all AZs in region
    });

    const cluster = new ecs.Cluster(this, "CaptchaGeneratorCluster", {
      vpc: vpc
    });

    //TODO:need to implement
    new ecs_patterns.ScheduledFargateTask(this, "CaptchaGeneratorTask",{
      cluster: cluster,
      desiredTaskCount: 1,
      enabled: true,
      ruleName: "",
      schedule: undefined,
      securityGroups: [],
      subnetSelection: undefined,
      vpc: vpc

    });
    // Create a load-balanced Fargate service and make it public
    new ecs_patterns.ApplicationLoadBalancedFargateService(this, "MyFargateService", {
      cluster: cluster, // Required
      cpu: 512, // Default is 256
      desiredCount: 6, // Default is 1
      taskImageOptions: { image: ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample") },
      memoryLimitMiB: 2048, // Default is 512
      publicLoadBalancer: true // Default is false
    });
  }
}
