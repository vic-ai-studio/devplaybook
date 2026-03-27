---
title: "AWS CDK with TypeScript: Build Cloud Infrastructure as Code"
description: "Learn AWS CDK with TypeScript from scratch. Understand constructs, stacks, L1/L2/L3 levels, testing, and deployment patterns for production-grade cloud infrastructure."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["aws-cdk", "typescript", "infrastructure-as-code", "aws", "devops", "cloud"]
readingTime: "13 min read"
---

AWS CDK (Cloud Development Kit) takes infrastructure as code to the next level: instead of YAML or HCL, you write real programming code in TypeScript, Python, Java, or Go to define your cloud infrastructure. This means you get loops, conditionals, abstractions, type safety, and unit tests — applied to your infrastructure.

This tutorial covers AWS CDK with TypeScript from project setup through production-grade patterns.

---

## Why CDK Over CloudFormation or Terraform?

CloudFormation is verbose YAML with limited abstraction. Terraform is excellent but uses its own DSL. CDK lets you use TypeScript (with full IDE support) to generate CloudFormation under the hood.

**CDK advantages:**
- Use real programming constructs (loops, functions, classes)
- Type-safe — your IDE catches misconfigurations before deployment
- Higher-level abstractions that encode best practices
- Unit-testable infrastructure with Jest
- Strong AWS-native integration

**When to stick with Terraform:**
- Multi-cloud environments (CDK is AWS-specific)
- Team is already invested in Terraform with existing modules
- You need drift detection across non-AWS resources

---

## Getting Started

### Prerequisites

- Node.js 18+
- AWS CLI configured (`aws configure`)
- AWS CDK CLI: `npm install -g aws-cdk`

### Bootstrap Your AWS Account

Before first deploy, CDK needs to provision some bootstrap resources (S3 bucket for assets, IAM roles):

```bash
cdk bootstrap aws://ACCOUNT-ID/us-east-1
```

### Create a New CDK App

```bash
mkdir my-cdk-app && cd my-cdk-app
cdk init app --language typescript
```

This creates the project structure:

```
my-cdk-app/
├── bin/
│   └── my-cdk-app.ts      # Entry point — instantiates stacks
├── lib/
│   └── my-cdk-app-stack.ts  # Your stack definition
├── test/
│   └── my-cdk-app.test.ts
├── cdk.json
└── package.json
```

---

## Understanding CDK Constructs

Everything in CDK is a **construct** — a cloud component that can contain other constructs, forming a tree.

### The Three Levels of Constructs

**L1 (CloudFormation Resources)** — Direct 1:1 mapping to CloudFormation. Prefixed with `Cfn`:

```typescript
import { aws_s3 as s3 } from 'aws-cdk-lib';

// L1: every CloudFormation property exposed manually
const cfnBucket = new s3.CfnBucket(this, 'MyCfnBucket', {
  bucketName: 'my-raw-bucket',
  versioningConfiguration: {
    status: 'Enabled',
  },
});
```

**L2 (Intent-Based)** — Higher-level abstractions with sensible defaults and helper methods. This is what you'll use most:

```typescript
// L2: secure defaults, helper methods, event integrations
const bucket = new s3.Bucket(this, 'MyBucket', {
  versioned: true,
  encryption: s3.BucketEncryption.S3_MANAGED,
  removalPolicy: cdk.RemovalPolicy.DESTROY,
  autoDeleteObjects: true,
});

// Helper methods grant IAM permissions
bucket.grantRead(myLambdaFunction);
bucket.grantPut(myEcsTask);
```

**L3 (Patterns)** — High-level patterns that combine multiple resources for a complete use case:

```typescript
import { aws_ecs_patterns as ecsPatterns } from 'aws-cdk-lib';

// L3: creates load balancer + ECS service + all supporting resources
const loadBalancedService = new ecsPatterns.ApplicationLoadBalancedFargateService(
  this,
  'MyService',
  {
    cluster,
    taskImageOptions: {
      image: ecs.ContainerImage.fromRegistry('nginx'),
    },
    publicLoadBalancer: true,
    desiredCount: 2,
  }
);
```

---

## Building a Real Stack: S3 + Lambda + API Gateway

Let's build a serverless API that processes images stored in S3.

### Stack Definition

```typescript
// lib/image-processor-stack.ts
import * as cdk from 'aws-cdk-lib';
import {
  aws_s3 as s3,
  aws_lambda as lambda,
  aws_apigateway as apigw,
  aws_iam as iam,
  aws_s3_notifications as s3n,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class ImageProcessorStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 bucket for uploads
    const uploadBucket = new s3.Bucket(this, 'UploadBucket', {
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      lifecycleRules: [
        {
          expiration: cdk.Duration.days(30),
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(7),
            },
          ],
        },
      ],
    });

    // Lambda function for processing
    const processorFn = new lambda.Function(this, 'ProcessorFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/processor'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        BUCKET_NAME: uploadBucket.bucketName,
        REGION: this.region,
      },
    });

    // Grant Lambda read/write access to bucket
    uploadBucket.grantReadWrite(processorFn);

    // Trigger Lambda on new S3 uploads
    uploadBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(processorFn),
      { suffix: '.jpg' }
    );

    // API Gateway for upload URLs
    const api = new apigw.RestApi(this, 'ImageApi', {
      restApiName: 'Image Processor API',
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS,
      },
    });

    const uploads = api.root.addResource('upload');
    uploads.addMethod('POST', new apigw.LambdaIntegration(processorFn));

    // Output the API URL
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'Image Processor API URL',
    });

    new cdk.CfnOutput(this, 'BucketName', {
      value: uploadBucket.bucketName,
    });
  }
}
```

### Entry Point

```typescript
// bin/my-cdk-app.ts
import * as cdk from 'aws-cdk-lib';
import { ImageProcessorStack } from '../lib/image-processor-stack';

const app = new cdk.App();

new ImageProcessorStack(app, 'ImageProcessorProd', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1',
  },
  tags: {
    Project: 'image-processor',
    Environment: 'production',
  },
});
```

---

## Multiple Stacks and Cross-Stack References

Split large applications into multiple stacks:

```typescript
// lib/network-stack.ts
export class NetworkStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, 'AppVpc', {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });
  }
}

// lib/app-stack.ts
interface AppStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
}

export class AppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id, props);

    // Use VPC from NetworkStack
    const cluster = new ecs.Cluster(this, 'AppCluster', {
      vpc: props.vpc,
    });
  }
}

// bin/app.ts
const networkStack = new NetworkStack(app, 'NetworkStack');
const appStack = new AppStack(app, 'AppStack', {
  vpc: networkStack.vpc,
});

// Explicit dependency
appStack.addDependency(networkStack);
```

---

## Custom Constructs: Reusable Infrastructure Components

Create reusable constructs for common patterns:

```typescript
// constructs/secure-bucket.ts
import * as cdk from 'aws-cdk-lib';
import { aws_s3 as s3, aws_kms as kms } from 'aws-cdk-lib';
import { Construct } from 'constructs';

interface SecureBucketProps {
  bucketName?: string;
  retentionDays?: number;
  enableVersioning?: boolean;
}

export class SecureBucket extends Construct {
  public readonly bucket: s3.Bucket;
  public readonly encryptionKey: kms.Key;

  constructor(scope: Construct, id: string, props: SecureBucketProps = {}) {
    super(scope, id);

    // Always create KMS key for encryption
    this.encryptionKey = new kms.Key(this, 'BucketKey', {
      enableKeyRotation: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.bucket = new s3.Bucket(this, 'Bucket', {
      bucketName: props.bucketName,
      versioned: props.enableVersioning ?? true,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: this.encryptionKey,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      lifecycleRules: props.retentionDays
        ? [{ expiration: cdk.Duration.days(props.retentionDays) }]
        : [],
    });
  }
}

// Usage
const dataBucket = new SecureBucket(this, 'DataBucket', {
  retentionDays: 90,
  enableVersioning: true,
});

dataBucket.bucket.grantRead(myRole);
```

---

## Testing CDK Infrastructure

CDK's `assertions` module lets you unit test your infrastructure:

```typescript
// test/image-processor.test.ts
import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { ImageProcessorStack } from '../lib/image-processor-stack';

describe('ImageProcessorStack', () => {
  let template: Template;

  beforeEach(() => {
    const app = new cdk.App();
    const stack = new ImageProcessorStack(app, 'TestStack');
    template = Template.fromStack(stack);
  });

  test('S3 bucket has versioning enabled', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      VersioningConfiguration: {
        Status: 'Enabled',
      },
    });
  });

  test('S3 bucket blocks all public access', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });

  test('Lambda has correct runtime', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'nodejs20.x',
      Timeout: 30,
      MemorySize: 512,
    });
  });

  test('Exactly one API Gateway created', () => {
    template.resourceCountIs('AWS::ApiGateway::RestApi', 1);
  });

  test('Lambda can read and write to bucket', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith(['s3:GetObject', 's3:PutObject']),
            Effect: 'Allow',
          }),
        ]),
      },
    });
  });
});
```

Run tests with:
```bash
npm test
```

---

## CDK Deploy Workflow

```bash
# List all stacks in the app
cdk list

# Synthesize CloudFormation template (dry run)
cdk synth

# See what will change before deploying
cdk diff

# Deploy a specific stack
cdk deploy ImageProcessorProd

# Deploy all stacks
cdk deploy --all

# Deploy with approval bypass (CI/CD)
cdk deploy --require-approval never

# Destroy resources
cdk destroy ImageProcessorProd
```

---

## Environment-Specific Configurations

Handle multiple environments cleanly:

```typescript
// bin/app.ts
interface EnvConfig {
  account: string;
  region: string;
  instanceType: string;
  minCapacity: number;
  maxCapacity: number;
}

const envConfigs: Record<string, EnvConfig> = {
  staging: {
    account: '123456789012',
    region: 'us-east-1',
    instanceType: 't3.small',
    minCapacity: 1,
    maxCapacity: 3,
  },
  production: {
    account: '987654321098',
    region: 'us-east-1',
    instanceType: 't3.large',
    minCapacity: 2,
    maxCapacity: 10,
  },
};

const targetEnv = process.env.DEPLOY_ENV ?? 'staging';
const config = envConfigs[targetEnv];

new AppStack(app, `AppStack-${targetEnv}`, {
  env: { account: config.account, region: config.region },
  ...config,
});
```

Deploy to specific environments:
```bash
DEPLOY_ENV=staging cdk deploy
DEPLOY_ENV=production cdk deploy
```

---

## CDK Pipelines: Automated Deployment

CDK Pipelines automates multi-stage deployments using CodePipeline:

```typescript
import { pipelines } from 'aws-cdk-lib';

class MyPipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const pipeline = new pipelines.CodePipeline(this, 'Pipeline', {
      synth: new pipelines.ShellStep('Synth', {
        input: pipelines.CodePipelineSource.gitHub('owner/repo', 'main'),
        commands: ['npm ci', 'npm run build', 'npx cdk synth'],
      }),
    });

    // Add staging stage
    pipeline.addStage(new MyAppStage(this, 'Staging', {
      env: { account: '123456789012', region: 'us-east-1' },
    }));

    // Add production stage with manual approval
    pipeline.addStage(new MyAppStage(this, 'Production', {
      env: { account: '987654321098', region: 'us-east-1' },
    }), {
      pre: [new pipelines.ManualApprovalStep('ApproveProduction')],
    });
  }
}
```

---

## Best Practices

1. **Use L2/L3 constructs by default** — only drop to L1 when you need unsupported properties
2. **Create custom L2 constructs** for patterns your team uses repeatedly
3. **Write tests for critical infrastructure** — especially IAM policies and security configurations
4. **Use `cdk diff` before every deploy** in production
5. **Pin CDK versions** across all packages to avoid version skew
6. **Tag all resources** via `cdk.Tags.of(app).add('ManagedBy', 'cdk')`
7. **Separate network, data, and application stacks** for independent deployability

---

## Key Takeaways

AWS CDK with TypeScript brings software engineering practices to infrastructure. You get type safety, IDE autocomplete, unit testing, and real abstractions — all generating battle-tested CloudFormation. The L1/L2/L3 construct hierarchy lets you choose the right level of abstraction for each component.

Start with the official CDK workshop, build a simple stack, and then explore the `aws-cdk-lib` constructs that match your stack. Once you've written your first custom construct and seen it snap into multiple projects, CDK becomes the natural choice for any AWS-native infrastructure work.

---

## Further Reading

- [AWS CDK Workshop](https://cdkworkshop.com) — hands-on tutorial
- [aws-cdk-lib API Reference](https://docs.aws.amazon.com/cdk/api/v2/)
- [CDK Patterns](https://cdkpatterns.com) — community-contributed patterns
- [Projen](https://github.com/projen/projen) — CDK-based project scaffolding
