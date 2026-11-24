import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createApp } from '../server/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const CHROMIUM_CANDIDATES = [
  process.env.CHROMIUM_EXECUTABLE_PATH,
  'C:\\Users\\arvin\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe',
].filter(Boolean);

const ROUTES_TO_AUDIT = [
  '/',
  '/gta-6',
  '/gta-6/storage',
  '/gta-6/fixes',
  '/gta-6/settings',
  '/gta-6/money',
  '/gta-6/platinum',
  '/gta-6/radio',
  '/ea-fc-27',
  '/cod-warzone',
  '/roblox',
];

function resolveChromiumPath() {
  for (const candidate of CHROMIUM_CANDIDATES) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  const msPlaywrightDir = path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright');
  if (fs.existsSync(msPlaywrightDir)) {
    for (const entry of fs.readdirSync(msPlaywrightDir)) {
      if (entry.startsWith('chromium-')) {
        const exePath = path.join(msPlaywrightDir, entry, 'chrome-win64', 'chrome.exe');
        if (fs.existsSync(exePath)) return exePath;
      }
    }
  }
  throw new Error('Chromium executable not found. Set CHROMIUM_EXECUTABLE_PATH.');
}

async function attachDiagnostics(page) {
  const consoleErrors = [];
  const pageErrors = [];
  const badResponses = [];
  const failedRequests = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    pageErrors.push(err?.message || String(err));
  });
  page.on('response', (res) => {
    const status = res.status();
    if (status >= 400 && !res.url().includes('/favicon')) {
      badResponses.push(`${status} ${res.url()}`);
    }
  });
  page.on('requestfailed', (req) => {
    const errText = req.failure()?.errorText || 'failed';
    if (!errText.includes('ERR_ABORTED')) {
      failedRequests.push(`${errText} ${req.url()}`);
    }
  });

  return {
    consoleErrors,
    pageErrors,
    badResponses,
    failedRequests,
    reset() {
      consoleErrors.length = 0;
      pageErrors.length = 0;
      badResponses.length = 0;
      failedRequests.length = 0;
    },
    assertClean(label) {
      assert.deepEqual(pageErrors, [], `[${label}] Uncaught pageerror: ${pageErrors.join(' | ')}`);
      assert.deepEqual(consoleErrors, [], `[${label}] Console errors: ${consoleErrors.join(' | ')}`);
      assert.deepEqual(badResponses, [], `[${label}] HTTP >=400 responses: ${badResponses.join(' | ')}`);
      assert.deepEqual(failedRequests, [], `[${label}] Failed network requests: ${failedRequests.join(' | ')}`);
    },
  };
}

async function waitForReady(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
  });
  await page.waitForTimeout(180);
}

async function checkVisibleCalculatorAtScrollZero(page, routePath) {
  const metrics = await page.evaluate(() => {
    const scrollY = window.scrollY;
    const h1 = document.querySelector('h1');
    const h1Style = h1 ? getComputedStyle(h1) : null;
    const h1Rect = h1 ? h1.getBoundingClientRect() : null;

    const mainTarget =
      document.querySelector('.lh-shell') ||
      document.querySelector('.game-studio-grid') ||
      document.querySelector('.deck-stage-transition') ||
      document.querySelector('main');
    const mainStyle = mainTarget ? getComputedStyle(mainTarget) : null;
    const mainRect = mainTarget ? mainTarget.getBoundingClientRect() : null;

    const interactiveInputs = Array.from(
      document.querySelectorAll('main input, main select, main button')
    ).filter((el) => {
      const st = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return st.display !== 'none' && st.visibility !== 'hidden' && parseFloat(st.opacity) > 0 && r.width > 0 && r.height > 0;
    });

    const hiddenTransitionPanels = Array.from(
      document.querySelectorAll('.deck-stage-transition, .gs-studio-panel, .lh-shell, .lh-main-col, .lh-rail-col, .game-studio-grid')
    )
      .filter((el) => {
        const st = getComputedStyle(el);
        return st.display !== 'none' && parseFloat(st.opacity) < 0.99;
      })
      .map((el) => ({ cls: el.className, opacity: getComputedStyle(el).opacity }));

    return {
      scrollY,
      h1Text: h1?.textContent?.trim() || '',
      h1Opacity: h1Style?.opacity,
      h1Height: h1Rect?.height || 0,
      mainOpacity: mainStyle?.opacity,
      mainHeight: mainRect?.height || 0,
      interactiveCount: interactiveInputs.length,
      hiddenTransitionPanels,
    };
  });

  assert.equal(metrics.scrollY, 0, `[${routePath}] Expected window.scrollY === 0`);
  assert.ok(metrics.h1Text.length > 0 && metrics.h1Height > 0, `[${routePath}] Visible H1 missing on first paint`);
  assert.equal(metrics.h1Opacity, '1', `[${routePath}] H1 opacity must be 1 on first paint`);
  assert.equal(metrics.mainOpacity, '1', `[${routePath}] Main calculator opacity must be 1 on first paint`);
  assert.ok(metrics.mainHeight > 120, `[${routePath}] Main calculator height too small: ${metrics.mainHeight}`);
  assert.ok(metrics.interactiveCount >= 3, `[${routePath}] Expected interactive controls visible at scrollY=0`);
  assert.deepEqual(
    metrics.hiddenTransitionPanels,
    [],
    `[${routePath}] Found panels with opacity < 1 at scrollY=0: ${JSON.stringify(metrics.hiddenTransitionPanels)}`
  );
}

async function checkCommonDomInvariants(page, routePath, viewportName) {
  const expectedPath = routePath === '/gta-6' ? '/' : routePath;
  const result = await page.evaluate((expPath) => {
    const bodyText = document.body.textContent || '';
    const scrollWidth = document.documentElement.scrollWidth;
    const innerWidth = window.innerWidth;
    const title = document.title;
    const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '';
    const h1Count = document.querySelectorAll('h1').length;

    const visibleEmbedButtons = Array.from(document.querySelectorAll('button')).filter((btn) => {
      const txt = btn.textContent || '';
      if (!/\bEmbed\b/i.test(txt)) return false;
      const st = getComputedStyle(btn);
      const r = btn.getBoundingClientRect();
      return st.display !== 'none' && st.visibility !== 'hidden' && r.width > 0 && r.height > 0;
    });

    const flexExportButtons = Array.from(document.querySelectorAll('button')).filter((btn) =>
      /Export 9:16 Flex Card PNG/i.test(btn.textContent || '')
    );

    const footerLinks = Array.from(document.querySelectorAll('footer a'));
    const hubLinks = Array.from(document.querySelectorAll('.footer-hubs-nav a'));
    const footerText = document.querySelector('footer')?.textContent || '';

    const soundBtn = document.querySelector('.header-sound-btn');
    const soundPressed = soundBtn?.getAttribute('aria-pressed');

    const badDupes = ['OUT NOWOUT NOW', 'SyncSync', 'Keep Screen OnKeep On'].filter((p) =>
      bodyText.includes(p)
    );

    const isExpectedLeonida = expPath === '/' || expPath.startsWith('/gta-6/');
    const activeLeonidaTabs = Array.from(document.querySelectorAll('.lh-mode-tab.active'));

    return {
      title,
      canonical,
      h1Count,
      scrollWidth,
      innerWidth,
      badDupes,
      bodyText,
      visibleEmbedCount: visibleEmbedButtons.length,
      flexExportCount: flexExportButtons.length,
      footerLinkCount: footerLinks.length,
      hubLinkCount: hubLinks.length,
      footerText,
      soundPressed,
      isExpectedLeonida,
      activeLeonidaTabCount: activeLeonidaTabs.length,
      activeLeonidaTabTexts: activeLeonidaTabs.map((el) => el.textContent?.trim()),
      hasSeoDirectoryDrawer: Boolean(
        document.querySelector('.seo-directory-hub, .cross-game-directory-drawer')
      ),
      hasMiniConsoleFit: bodyText.includes('Mini Console Fit & SSD'),
    };
  }, expectedPath);

  assert.equal(result.h1Count, 1, `[${routePath} ${viewportName}] Expected exactly 1 H1, got ${result.h1Count}`);
  assert.equal(
    result.canonical,
    `https://playunpause.com${expectedPath}`,
    `[${routePath} ${viewportName}] Canonical mismatch: ${result.canonical}`
  );
  assert.ok(
    result.scrollWidth <= result.innerWidth + 1,
    `[${routePath} ${viewportName}] Horizontal overflow: scrollWidth=${result.scrollWidth} > innerWidth=${result.innerWidth}`
  );
  assert.deepEqual(
    result.badDupes,
    [],
    `[${routePath} ${viewportName}] Found duplicate DOM text pairs: ${result.badDupes.join(', ')}`
  );
  assert.ok(
    result.visibleEmbedCount <= 1,
    `[${routePath} ${viewportName}] Expected <= 1 visible Embed button, got ${result.visibleEmbedCount}`
  );
  assert.ok(
    result.flexExportCount <= 1,
    `[${routePath} ${viewportName}] Expected <= 1 Flex Card export button, got ${result.flexExportCount}`
  );
  assert.equal(
    result.hasSeoDirectoryDrawer,
    false,
    `[${routePath} ${viewportName}] Legacy seo-directory-hub drawer still present`
  );
  assert.equal(
    result.hubLinkCount,
    10,
    `[${routePath} ${viewportName}] Expected 10 footer game hub links, got ${result.hubLinkCount}`
  );
  assert.ok(
    result.footerLinkCount <= 25,
    `[${routePath} ${viewportName}] Footer link bloat (${result.footerLinkCount} links)`
  );
  assert.ok(
    result.footerText.includes('Terms & Disclosures'),
    `[${routePath} ${viewportName}] Footer missing Terms & Disclosures`
  );
  assert.ok(
    result.footerText.includes('Sponsor a Game Hub'),
    `[${routePath} ${viewportName}] Footer missing Sponsor a Game Hub`
  );
  assert.equal(
    result.soundPressed,
    'true',
    `[${routePath} ${viewportName}] Fresh load Sound OFF default failed (aria-pressed=${result.soundPressed})`
  );

  if (result.isExpectedLeonida) {
    assert.equal(
      result.activeLeonidaTabCount,
      1,
      `[${routePath} ${viewportName}] Expected exactly 1 active Leonida tab, got ${result.activeLeonidaTabCount} (${result.activeLeonidaTabTexts.join(', ')})`
    );
  }
  if (expectedPath === '/gta-6/storage') {
    assert.equal(
      result.hasMiniConsoleFit,
      false,
      `[${routePath} ${viewportName}] /gta-6/storage must hide Mini Console Fit & SSD`
    );
  }
  if (expectedPath === '/gta-6/platinum') {
    assert.equal(
      result.title,
      'GTA 6 100% Tracker (Missables & 15 Save Slots) | PlayUnpause',
      `[${routePath} ${viewportName}] Title mismatch on /gta-6/platinum`
    );
  }
}

async function checkMobileTouchAndTypography(page, routePath) {
  const mobileAudit = await page.evaluate(() => {
    const hiddenDesktopSelectors = ['.kbd-hint', '.embed-header-btn', '.nz-hud-pill', '.lh-search-kbd'];
    const leakedDesktopEls = [];
    for (const sel of hiddenDesktopSelectors) {
      for (const el of document.querySelectorAll(sel)) {
        const st = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        if (st.display !== 'none' && st.visibility !== 'hidden' && r.width > 0 && r.height > 0) {
          leakedDesktopEls.push(sel);
        }
      }
    }

    const smallInputs = [];
    for (const el of document.querySelectorAll('input, select, textarea')) {
      const st = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (st.display !== 'none' && st.visibility !== 'hidden' && r.width > 0 && r.height > 0) {
        const fontSize = parseFloat(st.fontSize);
        if (fontSize < 16) {
          smallInputs.push({ tag: el.tagName, id: el.id, className: el.className, fontSize });
        }
      }
    }

    const smallTouchTargets = [];
    for (const el of document.querySelectorAll('.calc-stepper-btn, .lh-couch-btn, .lh-shield-pill')) {
      const st = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (st.display !== 'none' && st.visibility !== 'hidden' && r.width > 0 && r.height > 0) {
        if (r.width < 43.5 || r.height < 43.5) {
          smallTouchTargets.push({ className: el.className, width: Math.round(r.width), height: Math.round(r.height) });
        }
      }
    }

    return { leakedDesktopEls, smallInputs, smallTouchTargets };
  });

  assert.deepEqual(
    mobileAudit.leakedDesktopEls,
    [],
    `[${routePath} mobile] Desktop-only elements still visible: ${mobileAudit.leakedDesktopEls.join(', ')}`
  );
  assert.deepEqual(
    mobileAudit.smallInputs,
    [],
    `[${routePath} mobile] Inputs/selects with font-size < 16px: ${JSON.stringify(mobileAudit.smallInputs)}`
  );
  assert.deepEqual(
    mobileAudit.smallTouchTargets,
    [],
    `[${routePath} mobile] Touch targets < 44x44px: ${JSON.stringify(mobileAudit.smallTouchTargets)}`
  );
}

async function verifyGlobalGameSwitcherOnRoute(page, routePath) {
  await page.evaluate(() => {
    if (document.activeElement && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });

  // 1. Ctrl+K opens Switch Game Calculator Suite, Escape closes it
  await page.keyboard.press('Control+k');
  const modalHeading = page.locator('[role="dialog"] h2:has-text("Switch Game Calculator Suite")');
  await modalHeading.waitFor({ state: 'visible', timeout: 3000 });
  await page.keyboard.press('Escape');
  await modalHeading.waitFor({ state: 'hidden', timeout: 3000 });

  // 2. Clicking header game switcher or sub-bar All 10 Games opens modal, backdrop closes it
  const trigger = page
    .locator('button:has-text("All 10 Games"), header button[aria-haspopup="dialog"], header .header-game-switcher')
    .first();
  assert.ok((await trigger.count()) > 0, `[${routePath}] Missing game switcher button`);
  await trigger.click();
  await modalHeading.waitFor({ state: 'visible', timeout: 3000 });
  await page.mouse.click(8, 8);
  await modalHeading.waitFor({ state: 'hidden', timeout: 3000 });
}

async function verifySubbarSingleRow(page, routePath, widthLabel) {
  const subbarCheck = await page.evaluate(() => {
    const subbar = document.querySelector('.game-studio-subbar');
    if (!subbar) return { present: false };
    const subRect = subbar.getBoundingClientRect();
    const allBtn = Array.from(subbar.querySelectorAll('button')).find((b) =>
      /All 10 Games/i.test(b.textContent || '')
    );
    const firstLeft = subbar.querySelector('.game-studio-subbar-left a, .game-studio-subbar-left button');
    if (!allBtn || !firstLeft) return { present: true, missingParts: true };
    const allRect = allBtn.getBoundingClientRect();
    const leftRect = firstLeft.getBoundingClientRect();
    const rowDelta = Math.abs(
      allRect.top + allRect.height / 2 - (leftRect.top + leftRect.height / 2)
    );
    return {
      present: true,
      subHeight: Math.round(subRect.height),
      rowDelta: Math.round(rowDelta),
    };
  });

  if (subbarCheck.present) {
    assert.ok(!subbarCheck.missingParts, `[${routePath} ${widthLabel}] Sub-bar missing expected controls`);
    assert.ok(
      subbarCheck.rowDelta <= 16 && subbarCheck.subHeight <= 68,
      `[${routePath} ${widthLabel}] All 10 Games wrapped onto a second row: height=${subbarCheck.subHeight}, rowDelta=${subbarCheck.rowDelta}`
    );
  }
}

async function verifyInteractiveFlowsDesktop(page, baseUrl) {
  // "/" (Leonida hub): search shortcut, placeholder, alignment, chapter pill switching, Save Guard + #s= reload, Spoiler Shield, Keep Screen On, Flex PNG, SSD matching
  await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
  await waitForReady(page);

  const searchInput = page.locator('input.lh-search-input[aria-label="Global instant Leonida search"]');
  assert.equal(await searchInput.count(), 1, 'Expected Leonida search input on /');
  assert.equal(
    await searchInput.getAttribute('placeholder'),
    'Search fixes, cheats, radio...',
    'Search placeholder mismatch on /'
  );

  // Focus blur -> "/" focuses .lh-search-input
  await page.evaluate(() => document.activeElement?.blur?.());
  await page.keyboard.press('/');
  assert.equal(
    await page.evaluate(() => Boolean(document.activeElement?.classList?.contains('lh-search-input'))),
    true,
    'Pressing / outside inputs must focus .lh-search-input'
  );

  // Typing "/" inside #lh-hours-per-day must NOT jump focus to .lh-search-input; Ctrl+K MUST open switcher
  const hoursInput = page.locator('#lh-hours-per-day');
  assert.equal(await hoursInput.count(), 1, 'Expected #lh-hours-per-day input on /');
  await hoursInput.focus();
  await page.keyboard.press('/');
  assert.equal(
    await page.evaluate(() => document.activeElement?.id),
    'lh-hours-per-day',
    'Pressing / inside #lh-hours-per-day must keep focus on #lh-hours-per-day'
  );
  await page.keyboard.press('Control+k');
  const modalHeading = page.locator('[role="dialog"] h2:has-text("Switch Game Calculator Suite")');
  await modalHeading.waitFor({ state: 'visible', timeout: 3000 });
  await page.keyboard.press('Escape');
  await modalHeading.waitFor({ state: 'hidden', timeout: 3000 });

  // WAiNK Base Vehicles stepper alignment & increment
  const wainkCheck = await page.evaluate(() => {
    const row = Array.from(document.querySelectorAll('.lh-tracker-row-top')).find((el) =>
      /WAiNK Base Vehicles/i.test(el.textContent || '')
    );
    if (!row) return null;
    const labelCol = row.querySelector('.lh-tracker-label-col');
    const controls = row.querySelector('.lh-tracker-controls');
    if (!labelCol || !controls) return null;
    const lr = labelCol.getBoundingClientRect();
    const cr = controls.getBoundingClientRect();
    return {
      verticalDiff: Math.abs(lr.top + lr.height / 2 - (cr.top + cr.height / 2)),
      rightSide: cr.left >= lr.right - 4,
      beforeText: labelCol.textContent?.trim() || '',
    };
  });
  assert.ok(wainkCheck, 'WAiNK Base Vehicles row missing on /');
  assert.ok(
    wainkCheck.verticalDiff <= 18 && wainkCheck.rightSide,
    `WAiNK row alignment broken: ${JSON.stringify(wainkCheck)}`
  );
  const wainkPlusOne = page.locator('button[aria-label="Increase WAiNK Base Vehicles by 1"]');
  assert.equal(await wainkPlusOne.count(), 1, 'Expected +1 stepper button for WAiNK Base Vehicles');
  await wainkPlusOne.click();
  const wainkAfterText = await page.evaluate(() => {
    const row = Array.from(document.querySelectorAll('.lh-tracker-row-top')).find((el) =>
      /WAiNK Base Vehicles/i.test(el.textContent || '')
    );
    return row?.querySelector('.lh-tracker-label-col')?.textContent?.trim() || '';
  });
  assert.notEqual(wainkAfterText, wainkCheck.beforeText, 'WAiNK count did not update after +1 click');

  // Spoiler Shield ("CH 3") + Keep Screen On
  const ch3Pill = page.locator('.lh-shield-group .lh-shield-pill:has-text("CH 3")');
  assert.equal(await ch3Pill.count(), 1, 'Expected CH 3 Spoiler Shield pill');
  await ch3Pill.click();
  assert.equal(await ch3Pill.getAttribute('aria-pressed'), 'true', 'CH 3 pill must become active');

  const keepOnBtn = page.locator('button.lh-hud-btn:has-text("Keep Screen On")');
  assert.equal(await keepOnBtn.count(), 1, 'Expected Keep Screen On button');
  await keepOnBtn.click();

  // 15-Slot Save Guard: open Slot #2, toggle Status to SAVED, save, then test #s= URL persistence across reload
  const initialSavedCount = await page.locator('.lh-save-slot-btn.saved').count();
  const slotTwoBtn = page.locator('.lh-save-slot-btn').nth(1);
  assert.equal(await slotTwoBtn.count(), 1, 'Expected slot #2 in 15-Slot Save Guard');
  await slotTwoBtn.click();
  await page.locator('#lh-slot-modal-title').waitFor({ state: 'visible', timeout: 3000 });
  const statusToggleBtn = page.locator('[role="dialog"] button:has-text("Status:")');
  const statusText = (await statusToggleBtn.textContent()) || '';
  if (!statusText.includes('Status: SAVED')) {
    await statusToggleBtn.click();
  }
  await page.locator('[role="dialog"] button[type="submit"]:has-text("Save Slot")').click();
  await page.locator('#lh-slot-modal-title').waitFor({ state: 'hidden', timeout: 3000 });
  const newSavedCount = await page.locator('.lh-save-slot-btn.saved').count();
  assert.ok(
    newSavedCount > initialSavedCount,
    `Expected saved slot count to increase (${initialSavedCount} -> ${newSavedCount})`
  );

  // Share button updates #s= hash and survives full reload with CH 3 + saved slot preserved
  const shareBtn = page.locator('button.lh-hud-btn:has-text("Share")');
  assert.equal(await shareBtn.count(), 1, 'Expected Share HUD button');
  await shareBtn.click();
  await page.waitForTimeout(150);
  const currentHash = await page.evaluate(() => window.location.hash);
  assert.ok(currentHash.startsWith('#s='), `Expected #s= share hash after clicking Share, got "${currentHash}"`);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForReady(page);
  assert.ok(
    (await page.evaluate(() => window.location.hash)).startsWith('#s='),
    '#s= hash must persist after reload'
  );
  assert.equal(
    await page.locator('.lh-shield-group .lh-shield-pill:has-text("CH 3")').getAttribute('aria-pressed'),
    'true',
    'CH 3 Spoiler Shield state must restore from #s=/reload'
  );
  assert.equal(
    await page.locator('.lh-save-slot-btn.saved').count(),
    newSavedCount,
    'Saved slot count must persist across #s=/reload'
  );

  // Export 9:16 Flex Card PNG (downloads canvas blob with zero console/page errors)
  const exportBtn = page.locator('button:has-text("Export 9:16 Flex Card PNG")');
  assert.equal(await exportBtn.count(), 1, 'Expected exactly 1 Export 9:16 Flex Card PNG button on /');
  await exportBtn.click();
  await page.waitForTimeout(250);

  // Console-matched SSD cards on "/" Mini Console Fit & SSD rail
  const railPs5Btn = page.locator('aside.lh-sticky-rail button:has-text("PS5 Slim")');
  const railSeriesXBtn = page.locator('aside.lh-sticky-rail button:has-text("Series X")');
  assert.equal(await railPs5Btn.count(), 1, 'Expected PS5 Slim pill in rail');
  assert.equal(await railSeriesXBtn.count(), 1, 'Expected Series X pill in rail');

  await railPs5Btn.click();
  await page.waitForTimeout(120);
  const ps5RailText = (await page.locator('aside.lh-sticky-rail').textContent()) || '';
  const ps5RailHref = (await page.locator('aside.lh-sticky-rail a.lh-amazon-link').getAttribute('href')) || '';
  assert.ok(ps5RailText.includes('WD_BLACK SN850P 1TB NVMe SSD for PS5'), 'Missing PS5 SN850P title in rail');
  assert.ok(
    ps5RailHref.includes('B0C47ZX1WB') && ps5RailHref.includes('tag=playunpause-20'),
    `Invalid PS5 Amazon affiliate href in rail: ${ps5RailHref}`
  );

  await railSeriesXBtn.click();
  await page.waitForTimeout(120);
  const xboxRailText = (await page.locator('aside.lh-sticky-rail').textContent()) || '';
  const xboxRailHref = (await page.locator('aside.lh-sticky-rail a.lh-amazon-link').getAttribute('href')) || '';
  assert.ok(xboxRailText.includes('WD_BLACK C50 1TB Expansion Card for Xbox'), 'Missing Xbox C50 title in rail');
  assert.ok(
    xboxRailHref.includes('B0C44XVWCH') && xboxRailHref.includes('tag=playunpause-20'),
    `Invalid Xbox Amazon affiliate href in rail: ${xboxRailHref}`
  );

  // /gta-6/storage: Xbox Series S (512GB -> 213.6 GB = 4h 45m ETA @ 100 Mbps), Xbox shortage C50 link, no Mini Console Fit, single active tab on MONEY switch
  await page.goto(`${baseUrl}/gta-6/storage`, { waitUntil: 'domcontentloaded' });
  await waitForReady(page);
  const xboxSeriesS512Tile = page.locator('button.lh-console-tile:has-text("Xbox Series S"):has-text("364 GB")');
  assert.equal(await xboxSeriesS512Tile.count(), 1, 'Expected Xbox Series S (364 GB) tile on /gta-6/storage');
  await xboxSeriesS512Tile.click();
  await page.waitForTimeout(120);

  const storageText = await page.evaluate(() => document.body.textContent || '');
  assert.ok(storageText.includes('4h 45m'), 'Expected 4h 45m ETA on /gta-6/storage for Xbox Series S @ 100 Mbps');
  assert.equal(storageText.includes('5h 17m'), false, 'Found stale 5h 17m ETA on /gta-6/storage');
  assert.equal(storageText.includes('Mini Console Fit & SSD'), false, '/gta-6/storage must hide Mini Console Fit & SSD');

  const storageXboxLink = page.locator('main a.lh-amazon-link').first();
  assert.equal(await storageXboxLink.count(), 1, 'Expected Xbox shortage C50 link on /gta-6/storage for Xbox Series S');
  const storageXboxLinkText = (await storageXboxLink.textContent()) || '';
  const storageXboxHref = (await storageXboxLink.getAttribute('href')) || '';
  assert.ok(
    storageXboxLinkText.includes('WD_BLACK C50 1TB Expansion Card for Xbox'),
    `Expected WD_BLACK C50 copy on /gta-6/storage, got "${storageXboxLinkText}"`
  );
  assert.ok(
    storageXboxHref.includes('tag=playunpause-20'),
    `Missing tag=playunpause-20 on /gta-6/storage Xbox link: ${storageXboxHref}`
  );

  // Switch to MONEY tab via UI tab bar -> strictly 1 active tab, zero focus outline leak on previous tab
  const moneyTab = page.locator('.lh-tabs-bar button[role="tab"]:has-text("MONEY")');
  assert.equal(await moneyTab.count(), 1, 'Expected MONEY tab button in .lh-tabs-bar');
  await moneyTab.click();
  await page.waitForTimeout(180);
  const activeCount = await page.locator('.lh-mode-tab.active').count();
  assert.equal(activeCount, 1, `Expected 1 active Leonida tab after navigating to MONEY, got ${activeCount}`);
  const focusLeakedOnInactiveTab = await page.evaluate(() => {
    const el = document.activeElement;
    return Boolean(el && el.classList?.contains('lh-mode-tab') && !el.classList.contains('active'));
  });
  assert.equal(focusLeakedOnInactiveTab, false, 'Stale focus outline remained on an inactive tab after switching');

  // /ea-fc-27: negative tax delta "-10,750" must never wrap its minus sign
  await page.goto(`${baseUrl}/ea-fc-27`, { waitUntil: 'domcontentloaded' });
  await waitForReady(page);
  const fcNoWrap = await page.evaluate(() => {
    const candidates = Array.from(
      document.querySelectorAll('.gs-hero-big, .gs-verdict-chip, .mg-stat-mini strong, .gs-mc-y-labels span')
    );
    return candidates
      .filter((el) => /[-−]\d[\d,]*/.test(el.textContent || '') && getComputedStyle(el).display !== 'none')
      .map((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0 && r.height > 0);
        const topBands = new Set(rects.map((r) => Math.round(r.top / 6)));
        return {
          text: el.textContent?.trim(),
          bandCount: topBands.size,
          whiteSpace: getComputedStyle(el).whiteSpace,
        };
      });
  });
  assert.ok(fcNoWrap.length > 0, 'Expected at least one negative EA FC 27 figure (e.g., -10,750) to verify nowrap');
  for (const item of fcNoWrap) {
    assert.equal(
      item.bandCount,
      1,
      `/ea-fc-27 figure wrapped across multiple lines: ${JSON.stringify(item)}`
    );
  }
}

async function run() {
  const executablePath = resolveChromiumPath();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'unpause-pw-'));
  const dbPath = path.join(tmpDir, 'pw-qa.sqlite');
  const { app, db } = createApp({ dbPath });
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  const summaryRows = [];

  try {
    // Direct HTTP 301 check for /gta-6 and /gta-6/
    for (const redirRoute of ['/gta-6', '/gta-6/']) {
      const resp = await fetch(`${baseUrl}${redirRoute}`, { redirect: 'manual' });
      assert.equal(resp.status, 301, `Expected 301 for ${redirRoute}, got ${resp.status}`);
      const loc = resp.headers.get('location') || '';
      assert.equal(new URL(loc, baseUrl).pathname, '/', `Expected ${redirRoute} to redirect to /, got ${loc}`);
    }

    // Desktop pass (1440x900 + 1280x800 subbar spot check)
    const desktopCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const desktopPage = await desktopCtx.newPage();
    const dDiag = await attachDiagnostics(desktopPage);

    // Mobile pass (390x844)
    const mobileCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const mobilePage = await mobileCtx.newPage();
    const mDiag = await attachDiagnostics(mobilePage);

    for (const routePath of ROUTES_TO_AUDIT) {
      // Desktop audit
      dDiag.reset();
      await desktopPage.goto(`${baseUrl}${routePath}`, { waitUntil: 'domcontentloaded' });
      await waitForReady(desktopPage);
      await checkVisibleCalculatorAtScrollZero(desktopPage, routePath);
      await checkCommonDomInvariants(desktopPage, routePath, 'desktop-1440');
      await verifySubbarSingleRow(desktopPage, routePath, 'desktop-1440');
      await verifyGlobalGameSwitcherOnRoute(desktopPage, routePath);
      dDiag.assertClean(`${routePath} desktop-1440`);

      // Mobile audit (fresh context storage per first pass? clear storage only on /)
      mDiag.reset();
      await mobilePage.goto(`${baseUrl}${routePath}`, { waitUntil: 'domcontentloaded' });
      await waitForReady(mobilePage);
      await checkVisibleCalculatorAtScrollZero(mobilePage, routePath);
      await checkCommonDomInvariants(mobilePage, routePath, 'mobile-390');
      await checkMobileTouchAndTypography(mobilePage, routePath);
      mDiag.assertClean(`${routePath} mobile-390`);

      summaryRows.push({
        route: routePath,
        desktop1440: 'PASS',
        mobile390: 'PASS',
        notes: routePath === '/gta-6' ? '301 -> / + UI checks OK' : 'Opacity 1, Switcher/Ctrl+K, Layout & A11y OK',
      });
    }

    // Subbar non-wrap spot-check at 1280x800
    await desktopPage.setViewportSize({ width: 1280, height: 800 });
    for (const subRoute of ['/', '/gta-6/storage', '/ea-fc-27', '/cod-warzone', '/roblox']) {
      dDiag.reset();
      await desktopPage.goto(`${baseUrl}${subRoute}`, { waitUntil: 'domcontentloaded' });
      await waitForReady(desktopPage);
      await verifySubbarSingleRow(desktopPage, subRoute, 'desktop-1280');
      dDiag.assertClean(`${subRoute} desktop-1280`);
    }

    // Deep interactive feature flows on Desktop 1440x900
    await desktopPage.setViewportSize({ width: 1440, height: 900 });
    dDiag.reset();
    await verifyInteractiveFlowsDesktop(desktopPage, baseUrl);
    dDiag.assertClean('desktop interactive flows');

    await desktopCtx.close();
    await mobileCtx.close();

    console.log('\n| Route | Desktop (1440x900) | Mobile (390x844) | Notes |');
    console.log('| --- | --- | --- | --- |');
    for (const row of summaryRows) {
      console.log(`| \`${row.route}\` | ${row.desktop1440} | ${row.mobile390} | ${row.notes} |`);
    }
    console.log('\n[playwright_qa] ALL 11 ROUTES + 1280px SUBBAR + INTERACTIVE FLOWS PASSED CLEANLY (EXIT 0)');
  } finally {
    await browser.close();
    server.close();
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

run().catch((err) => {
  console.error('[playwright_qa] FAILED:', err);
  process.exit(1);
});
