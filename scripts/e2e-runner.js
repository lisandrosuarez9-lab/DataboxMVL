// scripts/e2e-runner.js
// Playwright headless E2E test for Factora intake form
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const [,, PAGE_URL, OUT_HTML, LOG] = process.argv;
  if (!PAGE_URL) {
    console.error('Usage: node e2e-runner.js <PAGE_URL> [OUT_HTML] [LOG]');
    process.exit(1);
  }

  const outHtml = OUT_HTML || 'artifacts/headless-dom.html';
  const logFile = LOG || 'artifacts/headless-run.log';
  const logs = [];
  
  const log = (msg) => {
    console.log(msg);
    logs.push(`${new Date().toISOString()} ${msg}`);
  };

  let browser;
  try {
    log(`Starting E2E test for ${PAGE_URL}`);
    browser = await chromium.launch({ 
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true 
    });
    
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Playwright E2E Test'
    });
    
    const page = await context.newPage();
    
    // Enable HAR recording
    await context.tracing.start({ screenshots: true, snapshots: true });
    
    log('Navigating to page...');
    await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    log('Waiting for CTA button...');
    await page.waitForSelector('.cta, button.cta, [aria-haspopup="dialog"]', { timeout: 15000 });
    
    log('Clicking CTA button...');
    await page.click('.cta, button.cta, [aria-haspopup="dialog"]');
    
    log('Waiting for intake form...');
    await page.waitForSelector('#intake-form-dialog, form#intake-form, [role="dialog"]', { timeout: 15000 });
    
    // Helper function to fill fields if they exist
    const fillIfExists = async (selector, value) => {
      try {
        const element = await page.$(selector);
        if (element) {
          await page.fill(selector, value);
          log(`Filled: ${selector}`);
        }
      } catch(e) {
        log(`Skipped (not found): ${selector}`);
      }
    };
    
    log('Filling form fields...');
    // Try various common selectors
    await fillIfExists('input[aria-label="First name"]', 'Smoke');
    await fillIfExists('input[aria-label="Last name"]', 'Test');
    await fillIfExists('input[aria-label="Full Name"]', 'Smoke Test');
    await fillIfExists('input[name="full_name"]', 'Smoke Test');
    await fillIfExists('input[name="fullName"]', 'Smoke Test');
    
    await fillIfExists('input[aria-label="National ID"]', '000000000');
    await fillIfExists('input[name="national_id"]', '000000000');
    await fillIfExists('input[name="nationalId"]', '000000000');
    
    await fillIfExists('input[aria-label="Email"]', 'smoke@example.com');
    await fillIfExists('input[name="email"]', 'smoke@example.com');
    await fillIfExists('input[type="email"]', 'smoke@example.com');
    
    await fillIfExists('input[aria-label="Phone Number"]', '+1-000-000-0000');
    await fillIfExists('input[name="phone"]', '+1-000-000-0000');
    await fillIfExists('input[type="tel"]', '+1-000-000-0000');
    
    // Check consent checkbox if present
    try {
      const consent = await page.$('input[type="checkbox"][name="consent"]');
      if (consent && !(await consent.isChecked())) {
        await page.check('input[type="checkbox"][name="consent"]');
        log('Checked consent checkbox');
      }
    } catch(e) {}
    
    log('Submitting form...');
    // Try various submit button selectors
    try {
      await page.click('button[type="submit"]');
    } catch(e) {
      try {
        await page.click('button:has-text("Get My Score")');
      } catch(e2) {
        try {
          await page.click('button:has-text("Submit")');
        } catch(e3) {
          log('Warning: Could not find submit button, trying Enter key');
          await page.keyboard.press('Enter');
        }
      }
    }
    
    log('Waiting for ProfileCard to appear...');
    await page.waitForSelector('.profile-card, [data-testid="profile-card"], [class*="ProfileCard"]', { 
      timeout: 20000 
    });
    
    log('ProfileCard found! Capturing page content...');
    const content = await page.content();
    fs.writeFileSync(outHtml, content);
    log(`Saved DOM to ${outHtml}`);
    
    // Stop tracing
    await context.tracing.stop({ path: outHtml.replace('.html', '.zip') });
    
    await browser.close();
    
    // Write logs
    fs.writeFileSync(logFile, logs.join('\n'));
    
    log('E2E_OK - Test completed successfully');
    console.log('E2E_OK');
    
  } catch (err) {
    log(`E2E_ERROR: ${err.message}`);
    console.error('E2E_ERROR', String(err));
    
    // Try to save logs even on error
    try {
      fs.writeFileSync(logFile, logs.join('\n'));
    } catch(e) {}
    
    try {
      if (browser) await browser.close();
    } catch(e) {}
    
    process.exit(2);
  }
})();
