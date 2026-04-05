import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as kms from "aws-cdk-lib/aws-kms";
import { Construct } from "constructs";

export class SustainableAccessPlatformStack extends cdk.Stack {
  /** DynamoDB Tables */
  public readonly usersTable: dynamodb.Table;
  public readonly itemsTable: dynamodb.Table;
  public readonly transactionsTable: dynamodb.Table;
  public readonly eventsTable: dynamodb.Table;
  public readonly consumptionProfilesTable: dynamodb.Table;

  /** S3 Buckets */
  public readonly audioAssetsBucket: s3.Bucket;
  public readonly listingImagesBucket: s3.Bucket;

  /** API Gateway */
  public readonly api: apigateway.RestApi;
  public readonly apiRoot: apigateway.Resource;
  public readonly authorizer: apigateway.IAuthorizer;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ---------------------------------------------------------------
    // KMS Key for encryption at rest (shared across tables & buckets)
    // ---------------------------------------------------------------
    const encryptionKey = new kms.Key(this, "PlatformEncryptionKey", {
      alias: "sustainable-access-platform-key",
      description: "KMS key for encrypting DynamoDB tables and S3 buckets",
      enableKeyRotation: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ---------------------------------------------------------------
    // 1.1 — DynamoDB Tables
    // ---------------------------------------------------------------

    // Users Table
    this.usersTable = new dynamodb.Table(this, "UsersTable", {
      tableName: `${id}-Users`,
      partitionKey: { name: "user_id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
    });

    this.usersTable.addGlobalSecondaryIndex({
      indexName: "trust_score-index",
      partitionKey: {
        name: "user_id",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "trust_score",
        type: dynamodb.AttributeType.NUMBER,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Items Table
    this.itemsTable = new dynamodb.Table(this, "ItemsTable", {
      tableName: `${id}-Items`,
      partitionKey: { name: "item_id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
    });

    this.itemsTable.addGlobalSecondaryIndex({
      indexName: "category-index",
      partitionKey: {
        name: "category",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "updated_at",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    this.itemsTable.addGlobalSecondaryIndex({
      indexName: "owner-index",
      partitionKey: {
        name: "owner_id",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    this.itemsTable.addGlobalSecondaryIndex({
      indexName: "status-index",
      partitionKey: {
        name: "status",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "updated_at",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Transactions Table
    this.transactionsTable = new dynamodb.Table(this, "TransactionsTable", {
      tableName: `${id}-Transactions`,
      partitionKey: {
        name: "transaction_id",
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
    });

    this.transactionsTable.addGlobalSecondaryIndex({
      indexName: "user-index",
      partitionKey: {
        name: "user_id",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "created_at",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    this.transactionsTable.addGlobalSecondaryIndex({
      indexName: "item-index",
      partitionKey: {
        name: "item_id",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Events Table
    this.eventsTable = new dynamodb.Table(this, "EventsTable", {
      tableName: `${id}-Events`,
      partitionKey: { name: "event_id", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "timestamp", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
    });

    this.eventsTable.addGlobalSecondaryIndex({
      indexName: "user-event-index",
      partitionKey: {
        name: "user_id",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "timestamp",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Consumption Profiles Table
    this.consumptionProfilesTable = new dynamodb.Table(
      this,
      "ConsumptionProfilesTable",
      {
        tableName: `${id}-ConsumptionProfiles`,
        partitionKey: {
          name: "user_id",
          type: dynamodb.AttributeType.STRING,
        },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
        encryptionKey,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        pointInTimeRecoverySpecification: {
          pointInTimeRecoveryEnabled: true,
        },
      }
    );

    // ---------------------------------------------------------------
    // 1.2 — S3 Buckets with KMS encryption
    // ---------------------------------------------------------------

    this.audioAssetsBucket = new s3.Bucket(this, "AudioAssetsBucket", {
      bucketName: cdk.PhysicalName.GENERATE_IF_NEEDED,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    this.listingImagesBucket = new s3.Bucket(this, "ListingImagesBucket", {
      bucketName: cdk.PhysicalName.GENERATE_IF_NEEDED,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // ---------------------------------------------------------------
    // 1.3 — API Gateway REST API with Auth0 JWT authorizer
    // ---------------------------------------------------------------

    this.api = new apigateway.RestApi(this, "PlatformApi", {
      restApiName: "SustainableAccessPlatformAPI",
      description: "REST API for the Sustainable Access Economy Platform",
      deployOptions: {
        stageName: "prod",
        throttlingRateLimit: 100,
        throttlingBurstLimit: 200,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          "Content-Type",
          "Authorization",
          "X-Amz-Date",
          "X-Api-Key",
          "X-Amz-Security-Token",
        ],
        allowCredentials: true,
      },
    });

    // Auth0 JWT authorizer Lambda — validates JWT tokens using Auth0 JWKS (RS256).
    const authorizerFn = new lambda.Function(this, "AuthorizerFn", {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: "authorizer/handler.handler",
      code: lambda.Code.fromAsset("lambda"),
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        AUTH0_DOMAIN: "dev-ld7wncxpjhac4pae.us.auth0.com",
        AUTH0_AUDIENCE: "https://sustainable-access-platform-api",
      },
    });

    const auth0Authorizer = new apigateway.TokenAuthorizer(
      this,
      "Auth0JwtAuthorizer",
      {
        handler: authorizerFn,
        identitySource: "method.request.header.Authorization",
        resultsCacheTtl: cdk.Duration.minutes(5),
      }
    );

    // Attach the authorizer to a placeholder health-check endpoint so CDK
    // can synthesize the authorizer resource (it must be used by at least one method).
    const apiRoot = this.api.root.addResource("api");
    this.apiRoot = apiRoot;
    this.authorizer = auth0Authorizer;

    apiRoot.addMethod(
      "GET",
      new apigateway.MockIntegration({
        integrationResponses: [{ statusCode: "200" }],
        requestTemplates: { "application/json": '{"statusCode": 200}' },
      }),
      {
        authorizer: auth0Authorizer,
        authorizationType: apigateway.AuthorizationType.CUSTOM,
        methodResponses: [{ statusCode: "200" }],
      }
    );

    // ---------------------------------------------------------------
    // ElevenLabs API Key — stored in Secrets Manager (set manually after deploy)
    // ---------------------------------------------------------------

    const elevenLabsSecret = new secretsmanager.Secret(this, "ElevenLabsApiKey", {
      secretName: `${id}/elevenlabs-api-key`,
      description: "ElevenLabs API key — set this manually after deploy via AWS CLI or console",
    });

    // ---------------------------------------------------------------
    // 3.2 — Auth/Trust Service Lambda + API Gateway routes
    // ---------------------------------------------------------------

    const authTrustFn = new lambda.Function(this, "AuthTrustFn", {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: "auth_trust/handler.handler",
      code: lambda.Code.fromAsset("lambda"),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        USERS_TABLE: this.usersTable.tableName,
      },
    });

    // Least-privilege: read/write on Users table only
    this.usersTable.grantReadWriteData(authTrustFn);

    const authTrustIntegration = new apigateway.LambdaIntegration(authTrustFn);

    // POST /api/auth/callback — no authorizer (this IS the auth callback)
    const authResource = this.apiRoot.addResource("auth");
    const callbackResource = authResource.addResource("callback");
    callbackResource.addMethod("POST", authTrustIntegration, {
      authorizationType: apigateway.AuthorizationType.NONE,
    });

    // GET /api/users/profile — requires authorizer
    const usersResource = this.apiRoot.addResource("users");
    const profileResource = usersResource.addResource("profile");
    profileResource.addMethod("GET", authTrustIntegration, {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    // PUT /api/users/trust — requires authorizer
    const trustResource = usersResource.addResource("trust");
    trustResource.addMethod("PUT", authTrustIntegration, {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    // ---------------------------------------------------------------
    // 4.2 — Listing Management Lambda + API Gateway routes
    // ---------------------------------------------------------------

    const listingManagementFn = new lambda.Function(this, "ListingManagementFn", {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: "listing_management/handler.handler",
      code: lambda.Code.fromAsset("lambda"),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        ITEMS_TABLE: this.itemsTable.tableName,
        LISTING_IMAGES_BUCKET: this.listingImagesBucket.bucketName,
      },
    });

    // Least-privilege: read/write on Items table + write to listing images bucket
    this.itemsTable.grantReadWriteData(listingManagementFn);
    this.listingImagesBucket.grantPut(listingManagementFn);

    const listingIntegration = new apigateway.LambdaIntegration(listingManagementFn);

    // POST /api/listings — requires authorizer
    const listingsResource = this.apiRoot.addResource("listings");
    listingsResource.addMethod("POST", listingIntegration, {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    // PUT /api/listings/{item_id} — requires authorizer
    const listingItemResource = listingsResource.addResource("{item_id}");
    listingItemResource.addMethod("PUT", listingIntegration, {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    // DELETE /api/listings/{item_id} — requires authorizer
    listingItemResource.addMethod("DELETE", listingIntegration, {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    // GET /api/listings/{item_id} — requires authorizer
    listingItemResource.addMethod("GET", listingIntegration, {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    // GET /api/listings/{item_id}/upload-url — requires authorizer
    const uploadUrlResource = listingItemResource.addResource("upload-url");
    uploadUrlResource.addMethod("GET", listingIntegration, {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    // ---------------------------------------------------------------
    // 5.2 — Search Service Lambda + API Gateway routes
    // ---------------------------------------------------------------

    const searchFn = new lambda.Function(this, "SearchFn", {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: "search/handler.handler",
      code: lambda.Code.fromAsset("lambda"),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        ITEMS_TABLE: this.itemsTable.tableName,
        VOICE_SERVICE_URL: "", // placeholder — set when Voice Service is deployed
      },
    });

    // Read-only access to Items table
    this.itemsTable.grantReadData(searchFn);

    const searchIntegration = new apigateway.LambdaIntegration(searchFn);

    // GET /api/search — requires authorizer
    const searchResource = this.apiRoot.addResource("search");
    searchResource.addMethod("GET", searchIntegration, {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    // POST /api/search/voice — requires authorizer
    const voiceSearchResource = searchResource.addResource("voice");
    voiceSearchResource.addMethod("POST", searchIntegration, {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    // ---------------------------------------------------------------
    // 7.2 — Voice Service Lambda + API Gateway routes
    // ---------------------------------------------------------------

    const voiceServiceFn = new lambda.Function(this, "VoiceServiceFn", {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: "voice_service/handler.handler",
      code: lambda.Code.fromAsset("lambda"),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        AUDIO_BUCKET: this.audioAssetsBucket.bucketName,
        ELEVENLABS_SECRET_ARN: elevenLabsSecret.secretArn,
      },
    });

    // Least-privilege: S3 read/write on audio-assets bucket
    this.audioAssetsBucket.grantReadWrite(voiceServiceFn);
    // Secrets Manager read for ElevenLabs API key
    elevenLabsSecret.grantRead(voiceServiceFn);

    const voiceIntegration = new apigateway.LambdaIntegration(voiceServiceFn);

    // POST /api/voice/tts — requires authorizer
    const voiceResource = this.apiRoot.addResource("voice");
    const ttsResource = voiceResource.addResource("tts");
    ttsResource.addMethod("POST", voiceIntegration, {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    // POST /api/voice/transcribe — requires authorizer
    const transcribeResource = voiceResource.addResource("transcribe");
    transcribeResource.addMethod("POST", voiceIntegration, {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    // ---------------------------------------------------------------
    // 8.2 — Decision Engine Lambda + API Gateway route
    // ---------------------------------------------------------------

    const decisionEngineFn = new lambda.Function(this, "DecisionEngineFn", {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: "decision_engine/handler.handler",
      code: lambda.Code.fromAsset("lambda"),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        USERS_TABLE: this.usersTable.tableName,
        ITEMS_TABLE: this.itemsTable.tableName,
        TRANSACTIONS_TABLE: this.transactionsTable.tableName,
        BEDROCK_MODEL_ID: "amazon.nova-lite-v1:0",
      },
    });

    // Least-privilege: read-only on Users, Items, Transactions tables
    this.usersTable.grantReadData(decisionEngineFn);
    this.itemsTable.grantReadData(decisionEngineFn);
    this.transactionsTable.grantReadData(decisionEngineFn);
    // Bedrock invoke access for Nova Lite
    decisionEngineFn.addToRolePolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: ["bedrock:InvokeModel", "bedrock:Converse"],
        resources: ["arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-lite-v1:0"],
      })
    );

    const decisionEngineIntegration = new apigateway.LambdaIntegration(
      decisionEngineFn
    );

    // GET /api/recommendations/{item_id} — requires authorizer
    const recommendationsResource =
      this.apiRoot.addResource("recommendations");
    const recommendationItemResource =
      recommendationsResource.addResource("{item_id}");
    recommendationItemResource.addMethod("GET", decisionEngineIntegration, {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    // ---------------------------------------------------------------
    // 9.2 — Consumption Engine Lambda + API Gateway routes
    // ---------------------------------------------------------------

    const consumptionEngineFn = new lambda.Function(this, "ConsumptionEngineFn", {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: "consumption_engine/handler.handler",
      code: lambda.Code.fromAsset("lambda"),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        EVENTS_TABLE: this.eventsTable.tableName,
        CONSUMPTION_PROFILES_TABLE: this.consumptionProfilesTable.tableName,
        TRANSACTIONS_TABLE: this.transactionsTable.tableName,
      },
    });

    // Least-privilege: read/write on Events and Consumption Profiles, read on Transactions
    this.eventsTable.grantReadWriteData(consumptionEngineFn);
    this.consumptionProfilesTable.grantReadWriteData(consumptionEngineFn);
    this.transactionsTable.grantReadData(consumptionEngineFn);

    const consumptionIntegration = new apigateway.LambdaIntegration(consumptionEngineFn);

    // POST /api/events — requires authorizer
    const eventsResource = this.apiRoot.addResource("events");
    eventsResource.addMethod("POST", consumptionIntegration, {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    // GET /api/consumption/profile — requires authorizer
    const consumptionResource = this.apiRoot.addResource("consumption");
    const consumptionProfileResource = consumptionResource.addResource("profile");
    consumptionProfileResource.addMethod("GET", consumptionIntegration, {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    // GET /api/consumption/mirror — requires authorizer
    const consumptionMirrorResource = consumptionResource.addResource("mirror");
    consumptionMirrorResource.addMethod("GET", consumptionIntegration, {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    // ---------------------------------------------------------------
    // 10.2 — Lifecycle Agent Lambda + API Gateway routes
    // ---------------------------------------------------------------

    const lifecycleAgentFn = new lambda.Function(this, "LifecycleAgentFn", {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: "lifecycle_agent/handler.handler",
      code: lambda.Code.fromAsset("lambda"),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        EVENTS_TABLE: this.eventsTable.tableName,
        CONSUMPTION_PROFILES_TABLE: this.consumptionProfilesTable.tableName,
        ITEMS_TABLE: this.itemsTable.tableName,
        TRANSACTIONS_TABLE: this.transactionsTable.tableName,
      },
    });

    // Least-privilege: read-only on Events, Consumption Profiles, Items, Transactions
    this.eventsTable.grantReadData(lifecycleAgentFn);
    this.consumptionProfilesTable.grantReadData(lifecycleAgentFn);
    this.itemsTable.grantReadData(lifecycleAgentFn);
    this.transactionsTable.grantReadData(lifecycleAgentFn);

    const lifecycleIntegration = new apigateway.LambdaIntegration(lifecycleAgentFn);

    // GET /api/nudges — requires authorizer
    const nudgesResource = this.apiRoot.addResource("nudges");
    nudgesResource.addMethod("GET", lifecycleIntegration, {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    // GET /api/suggestions — requires authorizer
    const suggestionsResource = this.apiRoot.addResource("suggestions");
    suggestionsResource.addMethod("GET", lifecycleIntegration, {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    // ---------------------------------------------------------------
    // 11.2 — Reward Engine Lambda + API Gateway routes
    // ---------------------------------------------------------------

    const rewardEngineFn = new lambda.Function(this, "RewardEngineFn", {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: "reward_engine/handler.handler",
      code: lambda.Code.fromAsset("lambda"),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        USERS_TABLE: this.usersTable.tableName,
        TRANSACTIONS_TABLE: this.transactionsTable.tableName,
      },
    });

    // Least-privilege: read/write on Users and Transactions tables
    this.usersTable.grantReadWriteData(rewardEngineFn);
    this.transactionsTable.grantReadWriteData(rewardEngineFn);

    const rewardIntegration = new apigateway.LambdaIntegration(rewardEngineFn);

    // POST /api/rewards/award — requires authorizer
    const rewardsResource = this.apiRoot.addResource("rewards");
    const rewardAwardResource = rewardsResource.addResource("award");
    rewardAwardResource.addMethod("POST", rewardIntegration, {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    // POST /api/rewards/redeem — requires authorizer
    const rewardRedeemResource = rewardsResource.addResource("redeem");
    rewardRedeemResource.addMethod("POST", rewardIntegration, {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    // POST /api/rewards/deduct — requires authorizer
    const rewardDeductResource = rewardsResource.addResource("deduct");
    rewardDeductResource.addMethod("POST", rewardIntegration, {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    // GET /api/rewards/balance — requires authorizer
    const rewardBalanceResource = rewardsResource.addResource("balance");
    rewardBalanceResource.addMethod("GET", rewardIntegration, {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    // ---------------------------------------------------------------
    // 12.2 — CO2 Tracker Lambda + API Gateway routes
    // ---------------------------------------------------------------

    const co2TrackerFn = new lambda.Function(this, "Co2TrackerFn", {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: "co2_tracker/handler.handler",
      code: lambda.Code.fromAsset("lambda"),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        TRANSACTIONS_TABLE: this.transactionsTable.tableName,
        ITEMS_TABLE: this.itemsTable.tableName,
        CONSUMPTION_PROFILES_TABLE: this.consumptionProfilesTable.tableName,
      },
    });

    // Least-privilege: read-only on Transactions, Items, and Consumption Profiles tables
    this.transactionsTable.grantReadData(co2TrackerFn);
    this.itemsTable.grantReadData(co2TrackerFn);
    this.consumptionProfilesTable.grantReadData(co2TrackerFn);

    const co2Integration = new apigateway.LambdaIntegration(co2TrackerFn);

    // GET /api/co2/transaction/{transaction_id} — requires authorizer
    const co2Resource = this.apiRoot.addResource("co2");
    const co2TransactionResource = co2Resource.addResource("transaction");
    const co2TransactionIdResource =
      co2TransactionResource.addResource("{transaction_id}");
    co2TransactionIdResource.addMethod("GET", co2Integration, {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    // GET /api/co2/cumulative — requires authorizer
    const co2CumulativeResource = co2Resource.addResource("cumulative");
    co2CumulativeResource.addMethod("GET", co2Integration, {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    // ---------------------------------------------------------------
    // Location Service — Amazon Location Place Index + Lambda
    // ---------------------------------------------------------------

    const placeIndex = new cdk.aws_location.CfnPlaceIndex(
      this,
      "PlatformPlaceIndex",
      {
        indexName: `${id}-PlaceIndex`,
        dataSource: "Esri",
        description: "Place index for geocoding listing addresses",
      }
    );

    const locationServiceFn = new lambda.Function(this, "LocationServiceFn", {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: "location_service/handler.handler",
      code: lambda.Code.fromAsset("lambda"),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        ITEMS_TABLE: this.itemsTable.tableName,
        PLACE_INDEX_NAME: placeIndex.indexName!,
      },
    });

    // Least-privilege: read Items table, use Location Service Place Index
    this.itemsTable.grantReadData(locationServiceFn);
    locationServiceFn.addToRolePolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: ["geo:SearchPlaceIndexForText"],
        resources: [placeIndex.attrArn],
      })
    );

    const locationIntegration = new apigateway.LambdaIntegration(
      locationServiceFn
    );

    // GET /api/listings/nearby — requires authorizer
    // Note: /api/listings already exists from listing management, so we add "nearby" under it
    const nearbyResource = listingsResource.addResource("nearby");
    nearbyResource.addMethod("GET", locationIntegration, {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    // POST /api/geocode — requires authorizer
    const geocodeResource = this.apiRoot.addResource("geocode");
    geocodeResource.addMethod("POST", locationIntegration, {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    // ---------------------------------------------------------------
    // Stack Outputs
    // ---------------------------------------------------------------

    new cdk.CfnOutput(this, "ApiUrl", {
      value: this.api.url,
      description: "API Gateway endpoint URL",
    });

    new cdk.CfnOutput(this, "UsersTableName", {
      value: this.usersTable.tableName,
    });

    new cdk.CfnOutput(this, "ItemsTableName", {
      value: this.itemsTable.tableName,
    });

    new cdk.CfnOutput(this, "TransactionsTableName", {
      value: this.transactionsTable.tableName,
    });

    new cdk.CfnOutput(this, "EventsTableName", {
      value: this.eventsTable.tableName,
    });

    new cdk.CfnOutput(this, "ConsumptionProfilesTableName", {
      value: this.consumptionProfilesTable.tableName,
    });

    new cdk.CfnOutput(this, "AudioAssetsBucketName", {
      value: this.audioAssetsBucket.bucketName,
    });

    new cdk.CfnOutput(this, "ListingImagesBucketName", {
      value: this.listingImagesBucket.bucketName,
    });
  }
}
