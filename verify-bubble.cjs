const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ recordVideo: { dir: '/home/jules/verification' } });
  const page = await context.newPage();

  await page.goto('http://127.0.0.1:5173/');

  // Wait for the canvas and tools to load
  await page.waitForSelector('.canvas-controls');

  // Select the stamp brush tool
  await page.click('button[aria-label="印章刷"]');
  // Click on the canvas to place a stamp
  await page.mouse.move(500, 300);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(500);

  // Select the pen tool and draw a stroke
  await page.click('button[aria-label="画笔"]');
  await page.mouse.move(200, 200);
  await page.mouse.down();
  await page.mouse.move(800, 200);
  await page.mouse.up();
  await page.waitForTimeout(500);

  // Select the bubble tool
  await page.click('button[aria-label="吹泡泡"]');

  // Create a bubble near the stamp
  await page.mouse.move(500, 350);
  await page.mouse.down();
  await page.mouse.move(500, 450); // Grow bubble
  await page.waitForTimeout(1000);
  await page.mouse.up(); // Release bubble, it should float up and capture stamp

  await page.waitForTimeout(2000); // Wait for it to float up and hit stroke (pop)

  // Take a screenshot
  await page.screenshot({ path: '/home/jules/verification/bubble.png' });

  await context.close();
  await browser.close();
})();
