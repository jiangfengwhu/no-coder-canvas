const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('http://127.0.0.1:5173/');

  // Wait for the UI to load
  await page.waitForSelector('button[aria-label="星际保卫战"]', { timeout: 10000 });

  // Click the shooter tool button
  await page.click('button[aria-label="星际保卫战"]');

  // Wait a bit
  await page.waitForTimeout(1000);

  // Simulate pointer down and move in the canvas
  await page.mouse.down();
  await page.mouse.move(300, 300);

  // Wait a bit to let the ship shoot some lasers and enemies to spawn potentially
  await page.waitForTimeout(2000);

  const verificationDir = path.join(require('os').homedir(), 'verification');
  if (!fs.existsSync(verificationDir)){
      fs.mkdirSync(verificationDir);
  }

  const screenshotPath = path.join(verificationDir, 'space_shooter.png');
  await page.screenshot({ path: screenshotPath });
  console.log(`Screenshot saved to ${screenshotPath}`);

  await browser.close();
})();
