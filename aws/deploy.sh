#!/bin/bash

# AWS S3 Deployment Script for Subscription Revenue Simulator
# Account ID: 697697503244
# Using AWS Free Tier

set -e

# Configuration
BUCKET_NAME="subscription-revenue-simulator-697697503244"
REGION="us-east-1"
PROJECT_DIR="$(dirname "$0")/.."

echo "=========================================="
echo "AWS S3 Deployment Script"
echo "Account: 697697503244"
echo "Bucket: $BUCKET_NAME"
echo "Region: $REGION"
echo "=========================================="

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install AWS CLI first."
    echo "Download: https://aws.amazon.com/cli/"
    exit 1
fi

# Check if user is logged in
echo "🔍 Checking AWS credentials..."
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ Not logged in to AWS. Please run: aws configure"
    exit 1
fi

ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
echo "✅ Logged in as Account: $ACCOUNT"

# Create S3 Bucket if it doesn't exist
echo "🪣 Creating S3 bucket (if not exists)..."
if ! aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
    aws s3api create-bucket \
        --bucket "$BUCKET_NAME" \
        --region "$REGION"
    echo "✅ Bucket created"
else
    echo "✅ Bucket already exists"
fi

# Configure bucket for static website hosting
echo "🌐 Configuring static website hosting..."
aws s3api put-bucket-website \
    --bucket "$BUCKET_NAME" \
    --website-configuration '{
        "IndexDocument": {"Suffix": "index.html"},
        "ErrorDocument": {"Key": "index.html"}
    }'
echo "✅ Static website hosting enabled"

# Remove public access block (required for static website)
echo "🔓 Configuring public access..."
aws s3api put-public-access-block \
    --bucket "$BUCKET_NAME" \
    --public-access-block-configuration '{
        "BlockPublicAcls": false,
        "IgnorePublicAcls": false,
        "BlockPublicPolicy": false,
        "RestrictPublicBuckets": false
    }'
echo "✅ Public access configured"

# Apply bucket policy
echo "📋 Applying bucket policy..."
aws s3api put-bucket-policy \
    --bucket "$BUCKET_NAME" \
    --policy file://"$(dirname "$0")/bucket-policy.json"
echo "✅ Bucket policy applied"

# Upload files
echo "📤 Uploading project files..."
cd "$PROJECT_DIR"

# Sync files to S3 (excluding unnecessary files)
aws s3 sync . "s3://$BUCKET_NAME" \
    --delete \
    --exclude ".git/*" \
    --exclude ".windsurf/*" \
    --exclude "tests/*" \
    --exclude "node_modules/*" \
    --exclude "aws/*" \
    --exclude "*.md" \
    --content-type "text/html" \
    --cache-control "max-age=3600" \
    --acl public-read

echo "✅ Files uploaded successfully"

# Get website URL
WEBSITE_URL="http://$BUCKET_NAME.s3-website-$REGION.amazonaws.com"

echo ""
echo "=========================================="
echo "🎉 DEPLOYMENT SUCCESSFUL!"
echo "=========================================="
echo ""
echo "🌐 Website URL:"
echo "   $WEBSITE_URL"
echo ""
echo "📊 AWS Console:"
echo "   https://s3.console.aws.amazon.com/s3/buckets/$BUCKET_NAME"
echo ""
echo "💰 Cost: FREE (AWS Free Tier)"
echo ""
echo "=========================================="
