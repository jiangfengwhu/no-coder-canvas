const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: '/home/jules/verification' }
  });
  const page = await context.newPage();

  try {
    await page.goto('http://127.0.0.1:5173/');
    await page.waitForLoadState('networkidle');

    // Select Pen tool and draw a line
    await page.getByLabel('画笔').click();
    await page.mouse.move(300, 300);
    await page.mouse.down();
    await page.mouse.move(600, 300, { steps: 10 });
    await page.mouse.up();

    // Select Stamp Brush and place a stamp
    await page.getByLabel('印章刷').click();
    await page.mouse.move(500, 500);
    await page.mouse.down();
    await page.mouse.move(550, 550);
    await page.mouse.up();

    // Wait for stroke/stamp to be rendered
    await page.waitForTimeout(500);

    // Select Laser tool and fire
    await page.getByLabel('激光').click();

    // Aim laser towards the line (drawn horizontally from 300,300 to 600,300)
    // Starting below it at 450, 500, dragging down to shoot up
    await page.mouse.move(450, 500);
    await page.mouse.down();
    await page.mouse.move(450, 600, { steps: 5 }); // aiming line upwards

    await page.waitForTimeout(100);
    // Shoot
    await page.mouse.up();

    // Capture screenshot right after shooting
    await page.waitForTimeout(100);
    await page.screenshot({ path: '/home/jules/verification/laser.png' });

  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    await context.close();
    await browser.close();
    console.log("Verification script finished");
  }
})();
