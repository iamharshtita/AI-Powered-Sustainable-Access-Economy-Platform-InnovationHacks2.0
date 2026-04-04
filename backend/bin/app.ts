#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { SustainableAccessPlatformStack } from "../lib/sustainable-access-platform-stack";

const app = new cdk.App();

new SustainableAccessPlatformStack(app, "SustainableAccessPlatformStack", {
  description:
    "AI-Powered Sustainable Access Economy Platform — serverless backend infrastructure",
});
