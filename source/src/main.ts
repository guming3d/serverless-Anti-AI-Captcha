import { App } from '@aws-cdk/core';
import { BootstraplessStackSynthesizer } from 'cdk-bootstrapless-synthesizer';
import { IntelligentCaptchaStack } from './stack';

const app = new App();

// const envBJS = { account: '812669741844', region: 'cn-north-1' };
new IntelligentCaptchaStack(app, 'IntelligentCaptchaStack', { synthesizer: newSynthesizer() });

app.synth();

function newSynthesizer() {
  return process.env.USE_BSS ? new BootstraplessStackSynthesizer(): undefined;
}
