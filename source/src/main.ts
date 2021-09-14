import { App } from '@aws-cdk/core';
import { BootstraplessStackSynthesizer } from 'cdk-bootstrapless-synthesizer';
import { IntelligentCaptchaStack } from './stack';

const app = new App();

const vpcId = app.node.tryGetContext('vpcId');
const env = vpcId ? {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
} : undefined;

new IntelligentCaptchaStack(app, 'IntelligentCaptchaStack', {
  env: env,
  synthesizer: newSynthesizer(),
  tags: {
    app: 'intelligent-captcha',
  },

});

app.synth();

function newSynthesizer() {
  return process.env.USE_BSS ? new BootstraplessStackSynthesizer(): undefined;
}
