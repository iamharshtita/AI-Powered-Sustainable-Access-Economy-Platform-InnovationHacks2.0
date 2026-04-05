"""Upload all images from frontend/public/items/ to S3.

Usage:
    python3 backend/scripts/upload_images_to_s3.py

Requires AWS credentials with s3:PutObject permission on the bucket.
"""

import boto3
import os
import mimetypes
from pathlib import Path

S3_BUCKET = "sustainableaccessplatform-listingimagesbucket35876-phncghrg4bto"
S3_PREFIX = "items/"
REGION = "us-east-1"

# Path to images (relative to repo root, or override with env)
IMAGES_DIR = os.environ.get(
    "IMAGES_DIR",
    os.path.join(
        os.path.dirname(__file__),  # backend/scripts/
        "..", "..",                  # back to repo root
        "frontend", "public", "items"
    )
)


def get_content_type(filename: str) -> str:
    mime, _ = mimetypes.guess_type(filename)
    return mime or "application/octet-stream"


def upload_images():
    s3 = boto3.client("s3", region_name=REGION)
    images_path = Path(IMAGES_DIR).resolve()

    if not images_path.exists():
        print(f"ERROR: Images directory not found: {images_path}")
        return

    image_files = list(images_path.glob("*"))
    image_files = [f for f in image_files if f.is_file() and f.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp", ".gif")]

    print(f"Found {len(image_files)} images in {images_path}")
    print(f"Uploading to s3://{S3_BUCKET}/{S3_PREFIX}\n")

    uploaded = []
    failed = []

    for img_path in sorted(image_files):
        key = f"{S3_PREFIX}{img_path.name}"
        content_type = get_content_type(img_path.name)

        try:
            s3.upload_file(
                str(img_path),
                S3_BUCKET,
                key,
                ExtraArgs={
                    "ContentType": content_type,
                    "CacheControl": "max-age=31536000",  # 1-year cache
                    # AES256 (SSE-S3) — matches the CDK stack's S3_MANAGED encryption.
                    # Do NOT use aws:kms here — KMS-encrypted objects require AWS Signature
                    # v4 on every request, so browsers cannot load them as public images.
                    "ServerSideEncryption": "AES256",
                },
            )
            s3_url = f"https://{S3_BUCKET}.s3.{REGION}.amazonaws.com/{key}"
            print(f"  ✓ {img_path.name}")
            print(f"    → {s3_url}")
            uploaded.append((img_path.name, s3_url))
        except Exception as e:
            print(f"  ✗ {img_path.name}: {e}")
            failed.append(img_path.name)

    print(f"\n{'='*60}")
    print(f"Done! {len(uploaded)} uploaded, {len(failed)} failed.")

    if failed:
        print(f"\nFailed: {failed}")

    print("\n=== S3 URL Reference ===")
    for name, url in uploaded:
        print(f'  "{name}": "{url}",')


if __name__ == "__main__":
    upload_images()
