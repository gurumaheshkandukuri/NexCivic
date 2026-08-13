import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\GURU MAHESH\\.gemini\\antigravity\\brain\\a9d379e4-47a6-47c0-a201-d51b58a34789';
const BASE_URL = 'http://localhost:3000';

const VIEWPORTS = [
  { width: 360, height: 740, label: '360px' },
  { width: 390, height: 844, label: '390px' },
  { width: 412, height: 915, label: '412px' },
  { width: 768, height: 1024, label: '768px' },
  { width: 1024, height: 768, label: '1024px' },
  { width: 1440, height: 900, label: '1440px' }
];

async function runQA() {
  console.log('🚀 Starting NexCivic Mobile-First PWA QA & Visual Verification...');
  
  const browser = await chromium.launch({ headless: true });
  const overflowResults = [];

  for (const vp of VIEWPORTS) {
    console.log(`\n📱 Auditing Viewport: ${vp.label} (${vp.width}x${vp.height})`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2
    });
    const page = await context.newPage();

    // 1. Landing Page
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    
    // Overflow check
    const landingOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    overflowResults.push({ page: 'Landing Page', viewport: vp.label, overflow: landingOverflow });
    
    // Screenshot
    const landingPath = path.join(ARTIFACT_DIR, `qa_landing_${vp.label}.png`);
    await page.screenshot({ path: landingPath, fullPage: false });

    // Mobile Navigation & Drawer Audit (<1024px)
    if (vp.width < 1024) {
      const menuBtn = page.locator('button[aria-label="Toggle menu"]');
      if (await menuBtn.isVisible()) {
        const closedPath = path.join(ARTIFACT_DIR, `qa_drawer_closed_${vp.label}.png`);
        await page.screenshot({ path: closedPath });
        
        await menuBtn.click();
        await page.waitForTimeout(500);
        
        const openPath = path.join(ARTIFACT_DIR, `qa_drawer_open_${vp.label}.png`);
        await page.screenshot({ path: openPath });
        
        // Close drawer
        await menuBtn.click();
        await page.waitForTimeout(300);
      }
    }

    // 2. Interactive Map Page
    const mapBtn = page.locator('button:has-text("Interactive Map")').first();
    if (await mapBtn.isVisible()) {
      await mapBtn.click();
      await page.waitForTimeout(1200);
      
      const mapOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      overflowResults.push({ page: 'Interactive Map', viewport: vp.label, overflow: mapOverflow });
      
      const mapPath = path.join(ARTIFACT_DIR, `qa_map_${vp.label}.png`);
      await page.screenshot({ path: mapPath });
    }

    // 3. Telangana Hub Page
    const tsBtn = page.locator('button:has-text("Telangana Hub")').first();
    if (await tsBtn.isVisible()) {
      await tsBtn.click();
      await page.waitForTimeout(1000);
      
      const tsOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      overflowResults.push({ page: 'Telangana Hub', viewport: vp.label, overflow: tsOverflow });
      
      const tsPath = path.join(ARTIFACT_DIR, `qa_telangana_${vp.label}.png`);
      await page.screenshot({ path: tsPath });
    }

    // 4. Auth / Login Page
    const authBtn = page.locator('button:has-text("Get Started"), button:has-text("Sign In / Get Started")').first();
    if (await authBtn.isVisible()) {
      await authBtn.click();
      await page.waitForTimeout(800);
      
      const authOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      overflowResults.push({ page: 'Login/Auth', viewport: vp.label, overflow: authOverflow });
      
      const authPath = path.join(ARTIFACT_DIR, `qa_auth_${vp.label}.png`);
      await page.screenshot({ path: authPath });
    }

    await context.close();
  }

  // Table Stacking Visual Verification Captures
  console.log('\n📊 Capturing Table Stacking Comparison...');
  
  // Mobile Card View (390px)
  const mobContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobPage = await mobContext.newPage();
  await mobPage.goto(BASE_URL);
  await mobPage.waitForTimeout(1000);
  
  const mobTablePath = path.join(ARTIFACT_DIR, 'qa_table_mobile_cards_390px.png');
  await mobPage.screenshot({ path: mobTablePath });
  await mobContext.close();

  // Desktop Table View (1440px)
  const deskContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const deskPage = await deskContext.newPage();
  await deskPage.goto(BASE_URL);
  await deskPage.waitForTimeout(1000);
  
  const deskTablePath = path.join(ARTIFACT_DIR, 'qa_table_desktop_1440px.png');
  await deskPage.screenshot({ path: deskTablePath });
  await deskContext.close();

  await browser.close();

  console.log('\n✅ Horizontal Overflow Audit Results:');
  console.table(overflowResults);

  fs.writeFileSync(
    path.join(ARTIFACT_DIR, 'qa_overflow_results.json'),
    JSON.stringify(overflowResults, null, 2)
  );

  console.log('✨ All Screenshots & QA Metrics Successfully Generated!');
}

runQA().catch(err => {
  console.error('❌ QA Script Error:', err);
  process.exit(1);
});
