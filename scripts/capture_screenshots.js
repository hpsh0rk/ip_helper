
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

async function capture() {
  const outDir = path.join(process.cwd(), "docs", "images");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2
  });

  const page = await context.newPage();
  console.log("Navigating to http://localhost:3000...");
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  // 1. Capture Story Studio & Storyboard Canvas
  console.log("Capturing Story Studio...");
  await page.screenshot({ path: path.join(outDir, "02_story_studio_storyboard.png"), fullPage: false });

  // 2. Switch to IP Character Manager
  console.log("Capturing IP Character Manager...");
  const charNavBtn = await page.$("button:has-text(\"IP 角色管理\")");
  if (charNavBtn) {
    await charNavBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, "01_character_manager.png"), fullPage: false });
  }

  // 3. Open IP Bible Modal
  console.log("Capturing IP Bible Modal...");
  const bibleBtn = await page.$("button:has-text(\"IP 设定圣经\")");
  if (bibleBtn) {
    await bibleBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(outDir, "05_ip_bible_modal.png"), fullPage: false });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  }

  // 4. Open Skills Hub Modal
  console.log("Capturing Skills Hub Modal...");
  const skillsBtn = await page.$("button:has-text(\"专家技能库\")");
  if (skillsBtn) {
    await skillsBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(outDir, "04_skills_hub_modal.png"), fullPage: false });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  }

  // 5. Switch back to Studio and expand Prompt Debug Drawer
  console.log("Capturing Prompt Debug Drawer & Diagnostics...");
  const studioNavBtn = await page.$("button:has-text(\"故事分镜工坊\")");
  if (studioNavBtn) {
    await studioNavBtn.click();
    await page.waitForTimeout(800);
    const debugToggleBtn = await page.$("button:has-text(\"Prompt 调试\")");
    if (debugToggleBtn) {
      await debugToggleBtn.click();
      await page.waitForTimeout(800);
    }
    await page.screenshot({ path: path.join(outDir, "03_prompt_debug_diagnostics.png"), fullPage: false });
  }

  await browser.close();
  console.log("All screenshots captured successfully in docs/images/!");
}

capture().catch(err => {
  console.error("Failed to capture screenshots:", err);
  process.exit(1);
});
