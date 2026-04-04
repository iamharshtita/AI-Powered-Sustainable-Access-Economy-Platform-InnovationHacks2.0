import * as cdk from "aws-cdk-lib";
import { Template, Match } from "aws-cdk-lib/assertions";
import { SustainableAccessPlatformStack } from "../lib/sustainable-access-platform-stack";

describe("SustainableAccessPlatformStack", () => {
  let template: Template;

  beforeAll(() => {
    const app = new cdk.App();
    const stack = new SustainableAccessPlatformStack(
      app,
      "TestStack"
    );
    template = Template.fromStack(stack);
  });

  // --- DynamoDB Tables ---

  test("creates 5 DynamoDB tables with PAY_PER_REQUEST billing", () => {
    template.resourceCountIs("AWS::DynamoDB::Table", 5);

    template.allResourcesProperties("AWS::DynamoDB::Table", {
      BillingMode: "PAY_PER_REQUEST",
    });
  });

  test("Users table has correct key schema and trust_score GSI", () => {
    template.hasResourceProperties("AWS::DynamoDB::Table", {
      TableName: "TestStack-Users",
      KeySchema: [{ AttributeName: "user_id", KeyType: "HASH" }],
      GlobalSecondaryIndexes: Match.arrayWith([
        Match.objectLike({
          IndexName: "trust_score-index",
          KeySchema: Match.arrayWith([
            { AttributeName: "user_id", KeyType: "HASH" },
            { AttributeName: "trust_score", KeyType: "RANGE" },
          ]),
        }),
      ]),
    });
  });

  test("Items table has correct key schema and 3 GSIs", () => {
    template.hasResourceProperties("AWS::DynamoDB::Table", {
      TableName: "TestStack-Items",
      KeySchema: [{ AttributeName: "item_id", KeyType: "HASH" }],
      GlobalSecondaryIndexes: Match.arrayWith([
        Match.objectLike({ IndexName: "category-index" }),
        Match.objectLike({ IndexName: "owner-index" }),
        Match.objectLike({ IndexName: "status-index" }),
      ]),
    });
  });

  test("Transactions table has user-index and item-index GSIs", () => {
    template.hasResourceProperties("AWS::DynamoDB::Table", {
      TableName: "TestStack-Transactions",
      KeySchema: [{ AttributeName: "transaction_id", KeyType: "HASH" }],
      GlobalSecondaryIndexes: Match.arrayWith([
        Match.objectLike({
          IndexName: "user-index",
          KeySchema: Match.arrayWith([
            { AttributeName: "user_id", KeyType: "HASH" },
            { AttributeName: "created_at", KeyType: "RANGE" },
          ]),
        }),
        Match.objectLike({
          IndexName: "item-index",
          KeySchema: Match.arrayWith([
            { AttributeName: "item_id", KeyType: "HASH" },
          ]),
        }),
      ]),
    });
  });

  test("Events table has composite key and user-event-index GSI", () => {
    template.hasResourceProperties("AWS::DynamoDB::Table", {
      TableName: "TestStack-Events",
      KeySchema: [
        { AttributeName: "event_id", KeyType: "HASH" },
        { AttributeName: "timestamp", KeyType: "RANGE" },
      ],
      GlobalSecondaryIndexes: Match.arrayWith([
        Match.objectLike({
          IndexName: "user-event-index",
          KeySchema: Match.arrayWith([
            { AttributeName: "user_id", KeyType: "HASH" },
            { AttributeName: "timestamp", KeyType: "RANGE" },
          ]),
        }),
      ]),
    });
  });

  test("Consumption Profiles table has user_id partition key", () => {
    template.hasResourceProperties("AWS::DynamoDB::Table", {
      TableName: "TestStack-ConsumptionProfiles",
      KeySchema: [{ AttributeName: "user_id", KeyType: "HASH" }],
    });
  });

  test("all DynamoDB tables use KMS encryption", () => {
    template.allResourcesProperties("AWS::DynamoDB::Table", {
      SSESpecification: {
        SSEEnabled: true,
        SSEType: "KMS",
        KMSMasterKeyId: Match.anyValue(),
      },
    });
  });

  // --- S3 Buckets ---

  test("creates 2 S3 buckets with KMS encryption and blocked public access", () => {
    // 2 app buckets + 1 CDK auto-delete custom resource bucket = we check properties
    template.hasResourceProperties("AWS::S3::Bucket", {
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [
          {
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: "aws:kms",
              KMSMasterKeyID: Match.anyValue(),
            },
          },
        ],
      },
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });

  // --- API Gateway ---

  test("creates REST API with CORS configuration", () => {
    template.hasResourceProperties("AWS::ApiGateway::RestApi", {
      Name: "SustainableAccessPlatformAPI",
    });
  });

  test("creates a Token authorizer for JWT validation", () => {
    template.hasResourceProperties("AWS::ApiGateway::Authorizer", {
      Type: "TOKEN",
      IdentitySource: "method.request.header.Authorization",
    });
  });

  // --- Secrets Manager ---

  test("creates 3 Secrets Manager secrets", () => {
    template.resourceCountIs("AWS::SecretsManager::Secret", 3);
  });

  test("creates ElevenLabs API key secret", () => {
    template.hasResourceProperties("AWS::SecretsManager::Secret", {
      Name: "TestStack/elevenlabs-api-key",
      Description: Match.stringLikeRegexp("ElevenLabs"),
    });
  });

  test("creates AI service API key secret", () => {
    template.hasResourceProperties("AWS::SecretsManager::Secret", {
      Name: "TestStack/ai-service-api-key",
      Description: Match.stringLikeRegexp("AI/LLM"),
    });
  });

  test("creates Auth0 credentials secret", () => {
    template.hasResourceProperties("AWS::SecretsManager::Secret", {
      Name: "TestStack/auth0-credentials",
      Description: Match.stringLikeRegexp("Auth0"),
    });
  });

  // --- KMS ---

  test("creates KMS key with rotation enabled", () => {
    template.hasResourceProperties("AWS::KMS::Key", {
      EnableKeyRotation: true,
    });
  });
});
