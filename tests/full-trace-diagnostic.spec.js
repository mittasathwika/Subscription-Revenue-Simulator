const { test, expect } = require('@playwright/test');

test.describe('Meta-Cognitive Analysis: Login & Data Visibility', () => {

  test('TRACE 1: S3 - Verify deployed code and login flow', async ({ page }) => {
    console.log('\n========== S3 TRACE ==========');
    
    await page.goto('http://subscription-revenue-simulator-697697503244.s3-website-us-east-1.amazonaws.com/login.html');
    
    // Check what API URL the deployed code uses
    const apiUrl = await page.evaluate(() => {
      if (typeof simulator !== 'undefined') return simulator.apiBaseUrl;
      return 'simulator not found';
    });
    console.log('1. Deployed API URL:', apiUrl);
    
    // Check if blur effect exists in showAuthModal
    const hasBlurCode = await page.evaluate(() => {
      const script = document.querySelector('script[src*="phase2-script"]');
      if (!script) {
        // Check inline
        const scripts = Array.from(document.querySelectorAll('script'));
        const src = scripts.map(s => s.textContent).join('\n');
        return src.includes('style.filter') || src.includes('blur(5px)');
      }
      return 'external script - cannot check inline';
    });
    console.log('2. Blur effect in code:', hasBlurCode);
    
    // Attempt login with trace
    await page.fill('#loginEmail', 'dhaval@gmail.com');
    await page.fill('#loginPassword', 'password123');
    
    const responsePromise = page.waitForResponse(resp => 
      resp.url().includes('api/auth/login'), { timeout: 10000 }
    ).catch(() => null);
    
    await page.click('#loginForm button[type="submit"]');
    const response = await responsePromise;
    
    if (response) {
      console.log('3. Response status:', response.status());
      const body = await response.text().catch(() => 'no body');
      console.log('4. Response body:', body.substring(0, 200));
    } else {
      console.log('3. No response captured - request may have failed');
    }
    
    // Check localStorage after attempt
    const storage = await page.evaluate(() => ({
      authToken: localStorage.getItem('authToken'),
      currentUser: localStorage.getItem('currentUser')
    }));
    console.log('5. localStorage after login:', JSON.stringify(storage));
    
    await page.screenshot({ path: 'trace-s3-login.png', fullPage: true });
  });

  test('TRACE 2: CloudFront - HTTPS mixed content analysis', async ({ page }) => {
    console.log('\n========== CLOUDFRONT TRACE ==========');
    
    await page.goto('https://d1yk15uyigizpb.cloudfront.net/login.html');
    
    // Check console for mixed content errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    
    // Check page security info
    const protocol = await page.evaluate(() => location.protocol);
    console.log('1. Page protocol:', protocol);
    
    // Check what API URL deployed code uses
    const apiUrl = await page.evaluate(() => {
      if (typeof simulator !== 'undefined') return simulator.apiBaseUrl;
      return 'simulator not found';
    });
    console.log('2. Deployed API URL:', apiUrl);
    
    // Check if API URL is HTTP (causes mixed content)
    if (apiUrl && apiUrl.includes('http://')) {
      console.log('3. ❌ MIXED CONTENT ISSUE: API URL uses HTTP on HTTPS page');
    } else if (apiUrl === '/api') {
      console.log('3. ✅ RELATIVE URL: Will use same protocol as page');
    }
    
    // Attempt login
    const btn = await page.locator('#loginForm button[type="submit"]').first();
    if (await btn.isVisible().catch(() => false)) {
      await page.fill('#loginEmail', 'dhaval@gmail.com');
      await page.fill('#loginPassword', 'password123');
      await btn.click();
      await page.waitForTimeout(3000);
    }
    
    console.log('4. Console errors:', consoleErrors.slice(0, 5));
    console.log('5. Current URL:', page.url());
    
    await page.screenshot({ path: 'trace-cf-login.png', fullPage: true });
  });

  test('TRACE 3: Dashboard visibility before login', async ({ page }) => {
    console.log('\n========== DASHBOARD VISIBILITY TRACE ==========');
    
    // Test S3
    await page.goto('http://subscription-revenue-simulator-697697503244.s3-website-us-east-1.amazonaws.com/');
    
    const s3ModalVisible = await page.locator('#authModal').isVisible().catch(() => false);
    const s3MainContent = await page.locator('.main-content');
    const s3Blur = s3MainContent ? await s3MainContent.evaluate(el => el.style.filter) : 'not found';
    const s3Opacity = s3MainContent ? await s3MainContent.evaluate(el => window.getComputedStyle(el).opacity) : 'not found';
    
    console.log('\nS3 Dashboard:');
    console.log('  - Auth modal visible:', s3ModalVisible);
    console.log('  - Main content filter:', s3Blur || '(none)');
    console.log('  - Main content opacity:', s3Opacity);
    console.log('  - ISSUE:', !s3Blur && s3ModalVisible ? '❌ Data visible behind modal!' : '✅ Data obscured');
    
    await page.screenshot({ path: 'trace-s3-dashboard.png', fullPage: true });
    
    // Test CloudFront
    await page.goto('https://d1yk15uyigizpb.cloudfront.net/');
    
    const cfModalVisible = await page.locator('#authModal').isVisible().catch(() => false);
    const cfMainContent = await page.locator('.main-content');
    const cfBlur = cfMainContent ? await cfMainContent.evaluate(el => el.style.filter) : 'not found';
    
    console.log('\nCloudFront Dashboard:');
    console.log('  - Auth modal visible:', cfModalVisible);
    console.log('  - Main content filter:', cfBlur || '(none)');
    console.log('  - ISSUE:', !cfBlur && cfModalVisible ? '❌ Data visible behind modal!' : '✅ Data obscured');
    
    await page.screenshot({ path: 'trace-cf-dashboard.png', fullPage: true });
  });

  test('TRACE 4: Root cause - fetch the deployed JS source', async ({ request }) => {
    console.log('\n========== SOURCE CODE TRACE ==========');
    
    // Fetch the deployed phase2-script.js
    const s3Response = await request.get('http://subscription-revenue-simulator-697697503244.s3-website-us-east-1.amazonaws.com/phase2-script.js');
    const s3Code = await s3Response.text();
    
    console.log('\nS3 Deployed Code:');
    console.log('  - Contains "localhost:3001":', s3Code.includes('localhost:3001'));
    console.log('  - Contains "/api":', s3Code.includes("' /api'") || s3Code.includes('"/api"'));
    console.log('  - Contains "blur(5px)":', s3Code.includes('blur(5px)'));
    console.log('  - Contains "pointerEvents":', s3Code.includes('pointerEvents'));
    
    // Check API URL pattern
    const apiUrlMatch = s3Code.match(/apiBaseUrl\s*=\s*['"]([^'"]+)['"]/);
    console.log('  - Actual API URL:', apiUrlMatch ? apiUrlMatch[1] : 'not found');
    
    const cfResponse = await request.get('https://d1yk15uyigizpb.cloudfront.net/phase2-script.js');
    const cfCode = await cfResponse.text();
    
    console.log('\nCloudFront Deployed Code:');
    console.log('  - Contains "localhost:3001":', cfCode.includes('localhost:3001'));
    console.log('  - Contains "/api":', cfCode.includes("' /api'") || cfCode.includes('"/api"'));
    console.log('  - Contains "blur(5px)":', cfCode.includes('blur(5px)'));
    
    const cfApiUrlMatch = cfCode.match(/apiBaseUrl\s*=\s*['"]([^'"]+)['"]/);
    console.log('  - Actual API URL:', cfUrlMatch ? cfApiUrlMatch[1] : 'not found');
  });
});
