import { App } from '@aws-cdk/core';
import { BootstraplessStackSynthesizer } from 'cdk-bootstrapless-synthesizer';
import { IntelligentCaptchaStack } from './stack';

const app = new App();

new IntelligentCaptchaStack(app, 'IntelligentCaptchaStack', { synthesizer: newSynthesizer() });

app.synth();

function newSynthesizer() {
  return process.env.USE_BSS ? new BootstraplessStackSynthesizer(): undefined;
}
