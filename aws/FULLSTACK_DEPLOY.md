# AWS Full-Stack Deployment Guide

This guide covers deploying the entire Subscription Revenue Simulator (frontend + backend) to AWS.

## Architecture

```
┌─────────────────┐      ┌──────────────────────┐      ┌─────────────────┐
│   CloudFront    │──────▶│   S3 Static Website  │      │   Users/Browser  │
│   (HTTPS CDN)   │      │   (Frontend)         │      │                 │
└─────────────────┘      └──────────────────────┘      └─────────────────┘
         │
         │ API Calls
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     Elastic Beanstalk (Backend)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │  Node.js    │  │   SQLite    │  │    Auth     │  │    API      │ │
│  │   Express   │  │   Database  │  │   (JWT)     │  │  Endpoints  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

## Prerequisites

1. **AWS Account**: Account ID 697697503244
2. **AWS CLI**: [Download here](https://aws.amazon.com/cli/)
3. **EB CLI**: Install with `pip install awsebcli`
4. **Configured AWS CLI**: Run `aws configure`

## Quick Deploy (5 Steps)

### Step 1: Configure AWS CLI

```powershell
aws configure
```

Enter:
- AWS Access Key ID
- AWS Secret Access Key
- Default region: `us-east-1`
- Output format: `json`

### Step 2: Install EB CLI

```powershell
pip install awsebcli
```

### Step 3: Run Full-Stack Deploy Script

```powershell
cd "c:\Users\shubh\CascadeProjects\subscription-revenue-simulator\aws"
.\deploy-fullstack.ps1
```

### Step 4: Configure Frontend API URL

After backend deployment, update the frontend to point to your API:

1. Open `index.html` or frontend config
2. Set API base URL to your Elastic Beanstalk URL
3. Redeploy frontend if needed

### Step 5: Access Your Application

- **Frontend**: http://subscription-revenue-simulator-697697503244.s3-website-us-east-1.amazonaws.com
- **Backend API**: http://subscription-simulator-env.us-east-1.elasticbeanstalk.com/api

---

## Manual Deployment

If the script doesn't work, deploy manually:

### Frontend (S3 + CloudFront)

#### 1. Create S3 Bucket
```powershell
aws s3api create-bucket `
    --bucket subscription-revenue-simulator-697697503244 `
    --region us-east-1
```

#### 2. Configure for Static Hosting
```powershell
aws s3api put-bucket-website `
    --bucket subscription-revenue-simulator-697697503244 `
    --website-configuration file://website-config.json
```

#### 3. Set Public Access
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

#### 4. Apply Bucket Policy
```powershell
aws s3api put-bucket-policy `
    --bucket subscription-revenue-simulator-697697503244 `
    --policy file://bucket-policy.json
```

#### 5. Upload Frontend Files
```powershell
cd "c:\Users\shubh\CascadeProjects\subscription-revenue-simulator"

aws s3 sync . s3://subscription-revenue-simulator-697697503244 `
    --delete `
    --exclude ".git/*" `
    --exclude ".windsurf/*" `
    --exclude "tests/*" `
    --exclude "node_modules/*" `
    --exclude "backend/*" `
    --exclude "aws/*" `
    --exclude "*.md" `
    --acl public-read
```

### Backend (Elastic Beanstalk)

#### 1. Navigate to Backend
```powershell
cd "c:\Users\shubh\CascadeProjects\subscription-revenue-simulator\backend"
```

#### 2. Initialize EB Application
```powershell
eb init subscription-simulator-api `
    --region us-east-1 `
    --platform "Node.js 18" `
    --profile default
```

#### 3. Create Environment & Deploy
```powershell
eb create subscription-simulator-env `
    --single `
    --instance-types t2.micro
```

#### 4. Set Environment Variables
```powershell
eb setenv NODE_ENV=production PORT=8080 JWT_SECRET=your-secret-key
```

#### 5. Deploy Updates
```powershell
eb deploy
```

---

## API Endpoints

Once deployed, your backend provides:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/auth/signup` | POST | User registration |
| `/api/auth/login` | POST | User login |
| `/api/auth/verify` | GET | Verify JWT token |
| `/api/metrics` | GET | Get metrics |
| `/api/metrics/calculate` | POST | Calculate projections |
| `/api/scenarios` | GET | List scenarios |
| `/api/scenarios` | POST | Create scenario |
| `/api/scenarios/:id` | GET | Get scenario |
| `/api/scenarios/:id` | PUT | Update scenario |
| `/api/scenarios/:id` | DELETE | Delete scenario |
| `/api/scenarios/compare` | POST | Compare scenarios |

---

## Cost Estimate

| Service | Instance/Storage | Monthly Cost |
|---------|-----------------|--------------|
| S3 | 0.1 MB storage | **~$0.01** |
| CloudFront | 10 GB transfer | **~$0.85** |
| Elastic Beanstalk | t2.micro (750 hrs free tier) | **~$0-8.50** |
| Data Transfer | Minimal | **~$0** |
| **Total** | | **~$1-10/month** |

**Note**: First year includes 750 hours/month of t2.micro free tier.

---

## Troubleshooting

### Backend Won't Start
- Check logs: `eb logs`
- Verify Node.js version: Should be 18.x
- Check environment variables: `eb printenv`

### Frontend Can't Connect to API
- Verify CORS is configured in backend
- Check API URL in frontend configuration
- Ensure both are in the same region

### Database Issues
- SQLite is file-based; data persists in EB environment
- For production, consider RDS (MySQL/PostgreSQL)

---

## Next Steps

### Add HTTPS
1. Use CloudFront for frontend (provides HTTPS)
2. Configure SSL certificate in Elastic Beanstalk
3. Update API calls to use HTTPS

### Add Custom Domain
1. Register domain in Route 53
2. Configure DNS to point to CloudFront
3. Request SSL certificate

### Production Database
- Replace SQLite with Amazon RDS
- Configure connection string
- Set up automated backups

---

## Useful Commands

```powershell
# Check S3 bucket
aws s3 ls s3://subscription-revenue-simulator-697697503244

# Update frontend
aws s3 sync . s3://subscription-revenue-simulator-697697503244 --delete

# Backend logs
cd backend
eb logs

# Restart backend
eb restart

# Delete everything (cleanup)
aws s3 rm s3://subscription-revenue-simulator-697697503244 --recursive
aws s3api delete-bucket --bucket subscription-revenue-simulator-697697503244
cd backend
eb delete
```

---

## Deployment Info

- **Account ID**: 697697503244
- **S3 Bucket**: subscription-revenue-simulator-697697503244
- **EB App**: subscription-simulator-api
- **EB Env**: subscription-simulator-env
- **Region**: us-east-1

**Ready to deploy? Run the PowerShell script!** 🚀
