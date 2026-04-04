"""DynamoDB client helper.

Provides a thin wrapper around the boto3 DynamoDB *resource* interface so
that every Lambda handler uses a consistent client configuration.
"""

from __future__ import annotations

import os
from typing import Any

import boto3
from boto3.dynamodb.table import TableResource


_resource: Any | None = None


def _get_resource() -> Any:
    """Return a shared boto3 DynamoDB resource (lazy-initialised)."""
    global _resource
    if _resource is None:
        region = os.environ.get("AWS_REGION", "us-east-1")
        _resource = boto3.resource("dynamodb", region_name=region)
    return _resource


def get_dynamo_table(table_name: str) -> TableResource:
    """Return a DynamoDB Table reference for *table_name*.

    The underlying boto3 resource is created once per Lambda cold-start
    and reused across invocations.

    Args:
        table_name: Name of the DynamoDB table.

    Returns:
        A ``boto3.dynamodb.Table`` object.
    """
    return _get_resource().Table(table_name)
