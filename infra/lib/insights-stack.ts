import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import type { Construct } from 'constructs';
import * as path from 'path';

export class InsightsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const openAiApiKey = new cdk.CfnParameter(this, 'OpenAiApiKey', {
      type: 'String',
      noEcho: true,
      description: 'OpenAI API key (sk-...). Not stored in git.',
    });

    const proxySecret = new cdk.CfnParameter(this, 'ProxySecret', {
      type: 'String',
      noEcho: true,
      description:
        'Shared secret: clients send Authorization: Bearer <this>. Rotate if leaked.',
    });

    const insightsFn = new lambdaNodejs.NodejsFunction(this, 'InsightsFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../lambda/insights/handler.ts'),
      handler: 'handler',
      timeout: cdk.Duration.seconds(45),
      memorySize: 256,
      environment: {
        OPENAI_API_KEY: openAiApiKey.valueAsString,
        PROXY_SECRET: proxySecret.valueAsString,
      },
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: [],
      },
    });

    const fnUrl = insightsFn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins: ['*'],
        allowedMethods: [lambda.HttpMethod.POST],
        allowedHeaders: ['*'],
      },
    });

    new cdk.CfnOutput(this, 'InsightsFunctionUrl', {
      value: fnUrl.url,
      description: 'POST JSON body; header Authorization: Bearer <ProxySecret>',
    });
  }
}
