const { test, expect } = require('@playwright/test');

test('Trace CloudFront API error in detail', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Capture all console logs
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push({type: msg.type(), text: msg.text()});
  });
  
  // Capture all network responses
  const responses = [];
  page.on('response', resp => {
    if (resp.url().includes('/api/')) {
      responses.push({
        url: resp.url(),
        status: resp.status(),
        statusText: resp.statusText()
      });
    }
  });
  
  // Capture request failures
  const failures = [];
  page.on('requestfailed', req => {
    failures.push({
      url: req.url(),
      error: req.failure()?.errorText
    });
  });
  
  await page.goto('https://d1yk15uyigizpb.cloudfront.net/login.html');
  await page.fill('#loginEmail', 'dhaval@gmail.com');
  await page.fill('#loginPassword', 'password123');
  await page.click('#loginForm button[type="submit"]');
  
  await page.waitForTimeout(5000);
  
  console.log('\n=== CONSOLE LOGS ===');
  consoleLogs.forEach(l => console.log(`[${l.type}] ${l.text.substring(0, 200)}`));
  
  console.log('\n=== API RESPONSES ===');
  responses.forEach(r => console.log(`${r.status} ${r.statusText} ${r.url}`));
  
  console.log('\n=== REQUEST FAILURES ===');
  failures.forEach(f => console.log(`${f.error} - ${f.url}`));
  
  // Take screenshot
  await page.screenshot({ path: 'cf-error-detail.png', fullPage: true });
  
  await context.close();
});
