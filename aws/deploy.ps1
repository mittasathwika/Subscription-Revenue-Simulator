# AWS Full-Stack Deployment Script for Windows PowerShell
# Account ID: 697697503244
# Using AWS Free Tier

$ErrorActionPreference = "Stop"

# Configuration
$BUCKET_NAME = "subscription-revenue-simulator-697697503244"
$REGION = "us-east-1"
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$PROJECT_DIR = Split-Path -Parent $SCRIPT_DIR
$APP_NAME = "subscription-simulator-api"
$ENV_NAME = "subscription-simulator-env"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "AWS Full-Stack Deployment Script" -ForegroundColor Cyan
Write-Host "Account: 697697503244" -ForegroundColor Cyan
Write-Host "Bucket: $BUCKET_NAME" -ForegroundColor Cyan
Write-Host "Region: $REGION" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Check if AWS CLI is installed
try {
    $awsVersion = aws --version 2>&1
    Write-Host "✅ AWS CLI found: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ AWS CLI not found. Please install AWS CLI first." -ForegroundColor Red
    Write-Host "Download: https://aws.amazon.com/cli/" -ForegroundColor Yellow
    exit 1
}

# Check if user is logged in
Write-Host "`n🔍 Checking AWS credentials..." -ForegroundColor Yellow
try {
    $account = aws sts get-caller-identity --query Account --output text 2>&1
    Write-Host "✅ Logged in as Account: $account" -ForegroundColor Green
} catch {
    Write-Host "❌ Not logged in to AWS. Please run: aws configure" -ForegroundColor Red
    exit 1
}

# Create S3 Bucket if it doesn't exist
Write-Host "`n🪣 Creating S3 bucket (if not exists)..." -ForegroundColor Yellow
try {
    aws s3api head-bucket --bucket $BUCKET_NAME 2>&1 | Out-Null
    Write-Host "✅ Bucket already exists" -ForegroundColor Green
} catch {
    aws s3api create-bucket --bucket $BUCKET_NAME --region $REGION | Out-Null
    Write-Host "✅ Bucket created" -ForegroundColor Green
}

# Configure bucket for static website hosting
Write-Host "`n🌐 Configuring static website hosting..." -ForegroundColor Yellow
$websiteConfig = @{
    IndexDocument = @{Suffix = "index.html"}
    ErrorDocument = @{Key = "index.html"}
} | ConvertTo-Json -Depth 3

$websiteConfig | Set-Content -Path "$env:TEMP\website-config.json"
aws s3api put-bucket-website --bucket $BUCKET_NAME --website-configuration file://"$env:TEMP\website-config.json" | Out-Null
Write-Host "✅ Static website hosting enabled" -ForegroundColor Green

# Remove public access block
Write-Host "`n🔓 Configuring public access..." -ForegroundColor Yellow
$publicAccessConfig = @{
    BlockPublicAcls = $false
    IgnorePublicAcls = $false
    BlockPublicPolicy = $false
    RestrictPublicBuckets = $false
} | ConvertTo-Json -Depth 3

$publicAccessConfig | Set-Content -Path "$env:TEMP\public-access-config.json"
aws s3api put-public-access-block --bucket $BUCKET_NAME --public-access-block-configuration file://"$env:TEMP\public-access-config.json" | Out-Null
Write-Host "✅ Public access configured" -ForegroundColor Green

# Apply bucket policy
Write-Host "`n📋 Applying bucket policy..." -ForegroundColor Yellow
$policyPath = Join-Path $SCRIPT_DIR "bucket-policy.json"
aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy file://"$policyPath" | Out-Null
Write-Host "✅ Bucket policy applied" -ForegroundColor Green

# Upload files
Write-Host "`n📤 Uploading project files..." -ForegroundColor Yellow
Set-Location $PROJECT_DIR

# Sync files to S3 (exclude backend - it will be deployed separately)
aws s3 sync . "s3://$BUCKET_NAME" `
    --delete `
    --exclude ".git/*" `
    --exclude ".windsurf/*" `
    --exclude "tests/*" `
    --exclude "node_modules/*" `
    --exclude "backend/*" `
    --exclude "aws/*" `
    --exclude "*.md" `
    --acl public-read

Write-Host "✅ Frontend deployed to S3" -ForegroundColor Green

# Deploy Backend to Elastic Beanstalk
Write-Host "`n🚀 Deploying Backend to Elastic Beanstalk..." -ForegroundColor Yellow

# Check if EB CLI is installed
try {
    $ebVersion = eb --version 2>&1
    Write-Host "✅ EB CLI found" -ForegroundColor Green
} catch {
    Write-Host "⚠️ EB CLI not found. Installing..." -ForegroundColor Yellow
    Write-Host "Run: pip install awsebcli" -ForegroundColor Cyan
    Write-Host "Skipping backend deployment for now." -ForegroundColor Yellow
    $skipBackend = $true
}

if (-not $skipBackend) {
    Set-Location "$PROJECT_DIR\backend"
    
    # Initialize EB if not already done
    if (-not (Test-Path ".elasticbeanstalk")) {
        Write-Host "`n🆕 Initializing Elastic Beanstalk application..." -ForegroundColor Yellow
        eb init $APP_NAME --region $REGION --platform "Node.js 18" --profile default
    }
    
    # Create environment if it doesn't exist
    $envList = eb list 2>&1
    if ($envList -notmatch $ENV_NAME) {
        Write-Host "`n🆕 Creating Elastic Beanstalk environment..." -ForegroundColor Yellow
        eb create $ENV_NAME --single --instance-types t2.micro
    } else {
        Write-Host "`n📤 Deploying to existing environment..." -ForegroundColor Yellow
        eb deploy $ENV_NAME
    }
    
    Write-Host "✅ Backend deployed to Elastic Beanstalk" -ForegroundColor Green
}

Set-Location $PROJECT_DIR

# Get website URL
$WEBSITE_URL = "http://$BUCKET_NAME.s3-website-$REGION.amazonaws.com"

Write-Host "`n==========================================" -ForegroundColor Green
Write-Host "🎉 FULL-STACK DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Frontend URL:" -ForegroundColor Cyan
Write-Host "   $WEBSITE_URL" -ForegroundColor White
Write-Host ""
Write-Host "� Backend API:" -ForegroundColor Cyan
Write-Host "   http://$ENV_NAME.$REGION.elasticbeanstalk.com/api" -ForegroundColor White
Write-Host ""
Write-Host "�📊 AWS Console:" -ForegroundColor Cyan
Write-Host "   S3: https://s3.console.aws.amazon.com/s3/buckets/$BUCKET_NAME" -ForegroundColor White
Write-Host "   EB: https://$REGION.console.aws.amazon.com/elasticbeanstalk" -ForegroundColor White
Write-Host ""
Write-Host "💰 Cost: ~$5-10/month (t2.micro + S3)" -ForegroundColor Green
Write-Host ""
Write-Host "==========================================" -ForegroundColor Green

# Open browser (optional)
$openBrowser = Read-Host "`nOpen website in browser? (y/n)"
if ($openBrowser -eq 'y') {
    Start-Process $WEBSITE_URL
}
