const { test, expect } = require('@playwright/test');

test.describe('CloudFront API Proxy Verification', () => {
  
  test('CloudFront - Test /api proxy with cache disabled', async ({ browser }) => {
    // Create context with cache disabled
    const context = await browser.newContext({
      bypassCSP: true,
      extraHTTPHeaders: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    const page = await context.newPage();
    
    console.log('\n=== CLOUDFRONT API PROXY TEST ===');
    
    // Intercept all requests
    const requests = [];
    page.on('request', req => {
      if (req.url().includes('/api/')) {
        requests.push({
          url: req.url(),
          method: req.method(),
          headers: req.headers()
        });
      }
    });
    
    // Navigate with cache bust
    await page.goto('https://d1yk15uyigizpb.cloudfront.net/login.html?_=' + Date.now());
    console.log('1. Page loaded');
    
    // Check what API URL the deployed code uses
    const apiUrl = await page.evaluate(() => {
      if (typeof simulator !== 'undefined') return simulator.apiBaseUrl;
      return 'simulator not found';
    });
    console.log('2. Code apiBaseUrl:', apiUrl);
    
    // Try login
    await page.fill('#loginEmail', 'dhaval@gmail.com');
    await page.fill('#loginPassword', 'password123');
    await page.click('#loginForm button[type="submit"]');
    await page.waitForTimeout(5000);
    
    console.log('3. API requests captured:');
    requests.forEach((r, i) => {
      console.log(`   ${i+1}. ${r.method} ${r.url}`);
    });
    
    // Check if requests went to CloudFront /api or direct to EB
    const cloudfrontRequests = requests.filter(r => r.url.includes('cloudfront.net/api'));
    const ebRequests = requests.filter(r => r.url.includes('elasticbeanstalk.com'));
    
    console.log('4. Via CloudFront /api:', cloudfrontRequests.length);
    console.log('5. Direct to EB:', ebRequests.length);
    
    if (cloudfrontRequests.length > 0) {
      console.log('✅ SUCCESS: API requests routed through CloudFront!');
    } else if (ebRequests.length > 0) {
      console.log('❌ FAIL: API still going directly to EB (mixed content blocked)');
    }
    
    await page.screenshot({ path: 'cf-api-test.png', fullPage: true });
    await context.close();
  });

  test('S3 - Verify relative API URL works', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('\n=== S3 RELATIVE URL TEST ===');
    
    await page.goto('http://subscription-revenue-simulator-697697503244.s3-website-us-east-1.amazonaws.com/login.html');
    
    const apiUrl = await page.evaluate(() => {
      if (typeof simulator !== 'undefined') return simulator.apiBaseUrl;
      return 'not found';
    });
    console.log('1. S3 apiBaseUrl:', apiUrl);
    
    // Try login
    await page.fill('#loginEmail', 'dhaval@gmail.com');
    await page.fill('#loginPassword', 'password123');
    await page.click('#loginForm button[type="submit"]');
    await page.waitForTimeout(3000);
    
    const storage = await page.evaluate(() => ({
      token: localStorage.getItem('authToken'),
      user: localStorage.getItem('currentUser')
    }));
    console.log('2. localStorage:', JSON.stringify(storage));
    
    if (storage.token) {
      console.log('✅ S3 LOGIN SUCCESS!');
    } else {
      console.log('❌ S3 LOGIN FAILED - likely 401 (wrong credentials)');
    }
    
    await context.close();
  });
});
