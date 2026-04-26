const { test, expect } = require('@playwright/test');

test.describe('CloudFront vs S3 Login Diagnostic', () => {
  
  test('S3 Website - Login trace', async ({ page }) => {
    console.log('\n=== S3 WEBSITE LOGIN TRACE ===');
    
    await page.goto('http://subscription-revenue-simulator-697697503244.s3-website-us-east-1.amazonaws.com/login.html');
    console.log('1. URL:', page.url());
    
    await page.screenshot({ path: 's3-login.png', fullPage: true });
    
    const emailVisible = await page.locator('#loginEmail').isVisible().catch(() => false);
    console.log('2. Email input visible:', emailVisible);
    
    if (emailVisible) {
      await page.fill('#loginEmail', 'dhaval@gmail.com');
      await page.fill('#loginPassword', 'password123');
      await page.click('#loginForm button[type="submit"]');
      await page.waitForTimeout(3000);
      
      console.log('3. After submit URL:', page.url());
      console.log('4. localStorage:', await page.evaluate(() => ({
        token: localStorage.getItem('authToken'),
        user: localStorage.getItem('currentUser')
      })));
    }
  });

  test('CloudFront - Login trace', async ({ page }) => {
    console.log('\n=== CLOUDFRONT LOGIN TRACE ===');
    
    await page.goto('https://d1yk15uyigizpb.cloudfront.net/login.html');
    console.log('1. URL:', page.url());
    console.log('2. Title:', await page.title());
    
    await page.screenshot({ path: 'cf-login.png', fullPage: true });
    
    const emailVisible = await page.locator('#loginEmail').isVisible().catch(() => false);
    console.log('3. Email input visible:', emailVisible);
    
    if (emailVisible) {
      await page.fill('#loginEmail', 'dhaval@gmail.com');
      await page.fill('#loginPassword', 'password123');
      
      const requests = [];
      page.on('request', r => requests.push({url: r.url(), method: r.method()}));
      page.on('requestfailed', r => requests.push({url: r.url(), failed: true}));
      
      await page.click('#loginForm button[type="submit"]');
      await page.waitForTimeout(3000);
      
      console.log('4. After submit URL:', page.url());
      console.log('5. API requests:', requests.filter(r => r.url.includes('api')));
      console.log('6. localStorage:', await page.evaluate(() => ({
        token: localStorage.getItem('authToken'),
        user: localStorage.getItem('currentUser')
      })));
    } else {
      console.log('7. Page content snippet:', (await page.content()).substring(0, 500));
    }
  });

  test('CORS Check - Both URLs', async ({ page }) => {
    console.log('\n=== CORS TRACE ===');
    
    for (const baseUrl of [
      'http://subscription-revenue-simulator-697697503244.s3-website-us-east-1.amazonaws.com',
      'https://d1yk15uyigizpb.cloudfront.net'
    ]) {
      await page.goto(`${baseUrl}/login.html`);
      
      const btn = await page.locator('#loginForm button').first();
      if (await btn.isVisible().catch(() => false)) {
        await page.fill('#loginEmail', 'test@test.com');
        await page.fill('#loginPassword', 'test123');
        
        const response = await page.evaluate(async () => {
          try {
            const res = await fetch('http://subscription-simulator-api-env.eba-bwarrbi6.us-east-1.elasticbeanstalk.com/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({email:'test@test.com', password:'test123'})
            });
            return {status: res.status, ok: res.ok, url: res.url};
          } catch(e) {
            return {error: e.message};
          }
        });
        
        console.log(`\n${baseUrl}:`);
        console.log('  CORS fetch result:', response);
      }
    }
  });
});
