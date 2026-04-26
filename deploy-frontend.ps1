# Deploy frontend to S3 and invalidate CloudFront
$bucket = "subscription-revenue-simulator-697697503244"
$distId = "E19FET7E83JGC"

Write-Host "=== Deploying Frontend to S3 ===" -ForegroundColor Green

# Sync files to S3 (exclude backend and git)
aws s3 sync . s3://$bucket/ `
    --exclude "backend/*" `
    --exclude ".git/*" `
    --exclude "node_modules/*" `
    --exclude "tests/*" `
    --exclude "deploy-frontend.ps1" `
    --delete

Write-Host "`n=== Invalidating CloudFront Cache ===" -ForegroundColor Green
aws cloudfront create-invalidation --distribution-id $distId --paths "/*"

Write-Host "`n✅ Deploy Complete!" -ForegroundColor Green
Write-Host "S3: http://$bucket.s3-website-us-east-1.amazonaws.com"
Write-Host "CloudFront: https://d1yk15uyigizpb.cloudfront.net"
