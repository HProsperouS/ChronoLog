#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { InsightsStack } from '../lib/insights-stack';

const app = new cdk.App();

new InsightsStack(app, 'ChronoLogInsightsStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'ap-southeast-1',
  },
  description: 'ChronoLog AI insights Lambda + Function URL',
});

app.synth();
