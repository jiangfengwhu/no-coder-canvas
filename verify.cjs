const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:3000');

  // Wait for the app to load (wait for the button to appear)
  await page.waitForSelector('button[aria-label="万花筒"]');

  // Click the Kaleidoscope button
  await page.click('button[aria-label="万花筒"]');

  // Wait a bit
  await page.waitForTimeout(500);

  const canvas = await page.$('.canvas-surface');
  if (canvas) {
    const box = await canvas.boundingBox();
    if (box) {
      // Draw a line
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();

      // Move in a curve
      await page.mouse.move(box.x + box.width / 2 + 50, box.y + box.height / 2 - 50, { steps: 10 });
      await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2 - 20, { steps: 10 });
      await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2 + 40, { steps: 10 });

      // Before up, take screenshot of the real-time preview
      await page.screenshot({ path: '/home/jules/verification/kaleidoscope_preview.png' });

      await page.mouse.up();

      // Wait for strokes to commit
      await page.waitForTimeout(500);

      // Draw another smaller shape
      await page.mouse.move(box.x + box.width / 2 - 150, box.y + box.height / 2 - 150);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 - 100, box.y + box.height / 2 - 100, { steps: 10 });
      await page.mouse.up();

      await page.waitForTimeout(500);

      // Take a final screenshot
      await page.screenshot({ path: '/home/jules/verification/kaleidoscope_final.png' });
    }
  }

  await browser.close();
})();
