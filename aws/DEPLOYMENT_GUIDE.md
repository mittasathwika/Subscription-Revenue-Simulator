# AWS S3 Deployment Guide

## Prerequisites

Before deploying, ensure you have:

1. **AWS Account**: Account ID 697697503244 (confirmed)
2. **AWS CLI installed**: [Download here](https://aws.amazon.com/cli/)
3. **AWS CLI configured**: Run `aws configure` with your credentials

## Quick Deploy (3 Steps)

### Step 1: Configure AWS CLI

Open PowerShell and run:
```powershell
aws configure
```

Enter your:
- AWS Access Key ID
- AWS Secret Access Key
- Default region: `us-east-1`
- Output format: `json`

**Don't have access keys?** Create them in AWS Console:
1. Go to https://console.aws.amazon.com/iam/
2. Users → your user → Security credentials
3. Create access key

### Step 2: Run Deploy Script

In PowerShell, navigate to the project folder and run:

```powershell
cd "c:\Users\shubh\CascadeProjects\subscription-revenue-simulator\aws"
.\deploy.ps1
```

### Step 3: Access Your Website

After deployment, you'll see:
```
🌐 Website URL:
   http://subscription-revenue-simulator-697697503244.s3-website-us-east-1.amazonaws.com
```

Open this URL in your browser!

---

## Manual Deployment (Alternative)

If the script doesn't work, follow these manual steps:

### 1. Create S3 Bucket

```powershell
aws s3api create-bucket `
    --bucket subscription-revenue-simulator-697697503244 `
    --region us-east-1
```

### 2. Enable Static Website Hosting

```powershell
aws s3api put-bucket-website `
    --bucket subscription-revenue-simulator-697697503244 `
    --website-configuration file://website-config.json
```

Create `website-config.json`:
```json
{
    "IndexDocument": {"Suffix": "index.html"},
    "ErrorDocument": {"Key": "index.html"}
}
```

### 3. Configure Public Access

```powershell
aws s3api put-public-access-block `
    --bucket subscription-revenue-simulator-697697503244 `
    --public-access-block-configuration '{
        "BlockPublicAcls": false,
        "IgnorePublicAcls": false,
        "BlockPublicPolicy": false,
        "RestrictPublicBuckets": false
    }'
```

### 4. Apply Bucket Policy

```powershell
aws s3api put-bucket-policy `
    --bucket subscription-revenue-simulator-697697503244 `
    --policy file://bucket-policy.json
```

### 5. Upload Files

```powershell
cd "c:\Users\shubh\CascadeProjects\subscription-revenue-simulator"

aws s3 sync . s3://subscription-revenue-simulator-697697503244 `
    --delete `
    --exclude ".git/*" `
    --exclude ".windsurf/*" `
    --exclude "tests/*" `
    --exclude "node_modules/*" `
    --exclude "aws/*" `
    --exclude "*.md" `
    --acl public-read
```

### 6. Get Website URL

```powershell
Write-Host "http://subscription-revenue-simulator-697697503244.s3-website-us-east-1.amazonaws.com"
```

---

## AWS Console Deployment (GUI Method)

### Step 1: Create Bucket

1. Go to https://s3.console.aws.amazon.com/s3/home
2. Click "Create bucket"
3. Bucket name: `subscription-revenue-simulator-697697503244`
4. Region: US East (N. Virginia) us-east-1
5. **Uncheck** "Block all public access"
6. Check acknowledgment
7. Click "Create bucket"

### Step 2: Enable Static Website Hosting

1. Click on your bucket
2. Go to "Properties" tab
3. Scroll to "Static website hosting"
4. Click "Edit" → Enable
5. Index document: `index.html`
6. Error document: `index.html`
7. Save

### Step 3: Set Permissions

1. Go to "Permissions" tab
2. "Bucket Policy" → Edit
3. Paste the policy from `aws/bucket-policy.json`
4. Save

### Step 4: Upload Files

1. Go to "Objects" tab
2. Click "Upload"
3. Add files:
   - `index.html`
   - `styles.css`
   - `script.js`
4. Click "Upload"

### Step 5: Access Website

1. Go to "Properties" tab
2. Scroll to "Static website hosting"
3. Copy the "Bucket website endpoint" URL
4. Open in browser!

---

## Cost Estimate (Free Tier)

| Service | Free Tier Limit | Your Usage | Cost |
|---------|----------------|------------|------|
| S3 Storage | 5 GB | ~0.1 MB | **$0** |
| S3 Requests | 20,000 GET/month | Minimal | **$0** |
| Data Transfer | 100 GB out | Minimal | **$0** |
| **Total** | | | **FREE** |

---

## Troubleshooting

### "Access Denied" Error
- Check bucket policy is applied
- Verify public access is enabled
- Ensure ACL is set to public-read

### "NoSuchBucket" Error
- Bucket name must be globally unique
- Wait 1-2 minutes after creation

### AWS CLI Not Found
- Install from: https://aws.amazon.com/cli/
- Restart PowerShell after installation

### Website Not Loading
- Check index.html exists in bucket root
- Verify static website hosting is enabled
- Test with `http://` not `https://`

---

## Useful Commands

```powershell
# Check deployment status
aws s3 ls s3://subscription-revenue-simulator-697697503244

# Update files
aws s3 sync . s3://subscription-revenue-simulator-697697503244 --delete

# Delete bucket (cleanup)
aws s3 rm s3://subscription-revenue-simulator-697697503244 --recursive
aws s3api delete-bucket --bucket subscription-revenue-simulator-697697503244
```

---

## Next Steps (Optional)

### Add Custom Domain
1. Register domain in Route 53
2. Create CloudFront distribution
3. Configure SSL certificate

### Add CloudFront CDN
- Better global performance
- HTTPS support
- Caching

### Enable HTTPS
- Use CloudFront
- Or use AWS Amplify (easier)

---

## Your Deployment Info

- **Account ID**: 697697503244
- **Bucket Name**: subscription-revenue-simulator-697697503244
- **Region**: us-east-1
- **Expected URL**: http://subscription-revenue-simulator-697697503244.s3-website-us-east-1.amazonaws.com

**Ready to deploy? Run the PowerShell script and you'll be live in under 2 minutes!** 🚀
