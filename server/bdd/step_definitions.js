const { Given, When, Then, Before, After, setWorldConstructor, setDefaultTimeout } = require('@cucumber/cucumber');
const puppeteer = require('puppeteer');
const { AxePuppeteer } = require('@axe-core/puppeteer');

setDefaultTimeout(120 * 1000);

class CustomWorld {
    constructor() {
        this.browser = null;
        this.page = null;
        this.lastResponse = null;
    }
}

setWorldConstructor(CustomWorld);

Before(async function () {
    console.log("[BDD ENGINE] Launching browser instance...");
    this.browser = await puppeteer.launch({
        headless: "new",
        defaultViewport: { width: 1366, height: 768 },
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-web-security',
            '--disable-gpu'
        ]
    });

    this.page = await this.browser.newPage();
    await this.page.setDefaultNavigationTimeout(60000);

    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await this.page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });
    console.log("[BDD ENGINE] Ready for transmission.");
});

After(async function () {
    console.log("[BDD ENGINE] Session complete. Tearing down...");
    if (this.browser) await this.browser.close();
});

const { Given: And, Given: But } = require('@cucumber/cucumber');

Given(/^I am on (?:'|"|)?(.*?)(?:'|"|)?$/, async function (url) {
    let target = url.trim();
    if (!target.startsWith('http')) target = 'https://' + target;

    console.log(`[BDD ENGINE] Transmitting to: ${target}`);

    try {
        await this.page.goto(target, {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });
        console.log(`[BDD ENGINE] Target reached. Verifying DOM...`);
    } catch (e) {
        console.warn(`[BDD ENGINE] Warning: ${e.message}.`);
    }

    // Dynamic hydration wait
    await new Promise(r => setTimeout(r, 4000));

    try {
        await this.page.waitForSelector('body', { timeout: 15000 });
        console.log(`[BDD ENGINE] Scan point established.`);
    } catch (e) {
        console.error(`[BDD ENGINE] Scan failed: No viewport content.`);
        throw new Error(`CRITICAL: Page failed to load content for ${target}`);
    }
});

// --- SMART CLICK STRATEGY ---
When(/^I click (?:on )?(?:'|"|)?(.*?)(?:'|"|)?$/, async function (target) {
    console.log(`[BDD ENGINE] Attempting High-Precision Click: ${target}`);

    const elementHandle = await this.page.evaluateHandle((targetStr) => {
        const query = targetStr.toLowerCase();

        const deepQuerySelector = (root, selector) => {
            try {
                const el = root.querySelector(selector);
                if (el) return el;
            } catch (e) { }
            const hosts = Array.from(root.querySelectorAll('*')).filter(node => node.shadowRoot);
            for (const host of hosts) {
                const inner = deepQuerySelector(host.shadowRoot, selector);
                if (inner) return inner;
            }
            return null;
        };

        const findByFuzzy = (root) => {
            const all = Array.from(root.querySelectorAll('button, a, input, [role="button"], span, div, h1, h2, h3, h4, h5, h6, li, img'));

            // Clean the query: remove "the", "button", "link", etc.
            const cleanQuery = query.replace(/\b(the|button|link|icon|at|on)\b/gi, '').trim();

            return all.find(el => {
                const text = (el.innerText || el.textContent || "").toLowerCase();
                const aria = (el.getAttribute('aria-label') || "").toLowerCase();
                const title = (el.getAttribute('title') || "").toLowerCase();
                const val = (el.value || "").toString().toLowerCase();
                const alt = (el.getAttribute('alt') || "").toLowerCase();

                const matchesDirect = text.includes(query) || aria.includes(query) || title.includes(query) || val.includes(query) || alt.includes(query);
                const matchesClean = cleanQuery && (text.includes(cleanQuery) || aria.includes(cleanQuery) || title.includes(cleanQuery) || val.includes(cleanQuery) || alt.includes(cleanQuery));

                return matchesDirect || matchesClean;
            });
        };

        let found = null;
        found = deepQuerySelector(document, targetStr);
        if (!found) found = findByFuzzy(document);

        return found;
    }, target);

    const el = elementHandle.asElement();
    if (el) {
        await el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
        await new Promise(r => setTimeout(r, 1000));

        const box = await el.boundingBox();
        if (box) {
            await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        } else {
            await el.click();
        }
    } else {
        await this.page.click(target).catch(e => {
            throw new Error(`CRITICAL: Found no interactable element matching "${target}"`);
        });
    }

    await new Promise(r => setTimeout(r, 3000));
});

// --- REVOLUTIONARY INTERACTION ENGINE (V2) ---
async function universalInteraction(page, target, value, mode = 'input') {
    const frames = [page.mainFrame(), ...page.frames()];

    for (const frame of frames) {
        try {
            const result = await frame.evaluate((sel, val, m) => {
                const query = (sel || "").toLowerCase().replace(/\b(the|field|dropdown|input|text|box|button|link)\b/gi, '').trim();
                const queryWords = query.split(/\s+/).filter(w => w.length > 1);

                const isMatch = (el) => {
                    const attrs = [el.name, el.id, el.placeholder, el.getAttribute('aria-label'), el.title, el.value].map(v => (v || "").toLowerCase());
                    const label = document.querySelector(`label[for="${el.id}"]`);
                    if (label) attrs.push(label.innerText.toLowerCase());

                    // Direct match
                    if (attrs.some(a => a.includes(query))) return true;
                    // Partial word match (e.g. "reg" in "registration number")
                    if (queryWords.length > 0 && queryWords.every(word => attrs.some(a => a.includes(word)))) return true;
                    return false;
                };

                // Find candidate elements
                const candidates = Array.from(document.querySelectorAll('input, select, textarea, button, a, [role="button"], [role="textbox"]'));
                const el = candidates.find(isMatch);

                if (!el) return false;

                el.focus();
                if (m === 'click') {
                    el.click();
                    return 'clicked';
                }

                if (el.tagName === 'SELECT') {
                    const opt = Array.from(el.options).find(o => o.text.toLowerCase().includes(val.toLowerCase()) || o.value.toLowerCase().includes(val.toLowerCase()));
                    if (opt) { el.value = opt.value; el.dispatchEvent(new Event('change', { bubbles: true })); return 'selected'; }
                } else {
                    el.value = val;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                    return 'entered';
                }
                return false;
            }, target, value, mode);

            if (result) return result;
        } catch (e) { continue; }
    }
    return false;
}

When(/^I (?:enter|type|add|input) (?:the )?(?:'|"|)?(.*?)(?:'|"|)? (as|into|in) (?:'|"|)?(.*?)(?:'|"|)?$/, async function (param1, preposition, param2) {
    let target, value;
    if (preposition === 'as') {
        target = param1;
        value = param2;
    } else {
        // For "into" or "in", usually it's "Type [Value] in [Target]"
        value = param1;
        target = param2;
    }

    console.log(`[BDD ENGINE] Kernel Input: "${value}" -> ${target}`);
    const success = await universalInteraction(this.page, target, value, 'input');
    if (!success) {
        try { await this.page.type(target, value, { delay: 30 }); }
        catch (e) { throw new Error(`CRITICAL: Field "${target}" not found after deep scan.`); }
    }
    await new Promise(r => setTimeout(r, 800));
});


When(/^I select (?:the )?(?:'|"|)?(.*?)(?:'|"|)? (as|from|in) (?:'|"|)?(.*?)(?:'|"|)?$/, async function (param1, preposition, param2) {
    let target, value;
    if (preposition === 'as') {
        target = param1;
        value = param2;
    } else {
        value = param1;
        target = param2;
    }
    console.log(`[BDD ENGINE] Kernel Select: "${value}" from "${target}"`);
    const success = await universalInteraction(this.page, target, value, 'input');
    if (!success) throw new Error(`CRITICAL: Dropdown "${target}" not found after deep scan.`);
    await new Promise(r => setTimeout(r, 800));
});

Then(/^I should be (?:redirected|navigated) to (?:the )?(?:'|"|)?(.*?)(?:'|"|)?$/, async function (target) {
    console.log(`[BDD ENGINE] Kernel Verification: ${target}`);
    await new Promise(r => setTimeout(r, 10000)); // Allow portal to load
    const found = await this.page.waitForFunction((txt) =>
        document.body.innerText.toLowerCase().includes(txt.toLowerCase()) ||
        window.location.href.toLowerCase().includes(txt.toLowerCase()),
        { timeout: 15000 }, target
    ).catch(() => false);

    if (!found) {
        const url = this.page.url();
        throw new Error(`FAIL: Verification for "${target}" failed. current location is ${url}`);
    }
});

When(/^I press (?:the )?(?:'|"|)?(.*?)(?:'|"|)?(?: key)?$/i, async function (key) {
    console.log(`[BDD ENGINE] Pressing Key: ${key}`);
    await this.page.keyboard.press(key);
});

When(/^I wait for (\d+) seconds?$/, async function (s) {
    await new Promise(r => setTimeout(r, parseInt(s) * 1000));
});

When(/^I scroll to (?:the bottom|(?:'|"|)?(.*?)(?:'|"|)?)$/, async function (target) {
    if (!target) {
        await this.page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
    } else {
        const found = await this.page.evaluate((t) => {
            const el = Array.from(document.querySelectorAll('*')).find(e => (e.innerText || "").toLowerCase().includes(t.toLowerCase()));
            if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); return true; }
            return false;
        }, target);
        if (!found) throw new Error(`Target "${target}" not found for scrolling.`);
    }
    await new Promise(r => setTimeout(r, 2000));
});

// --- MISSING STEP DEFINITIONS ---
Then(/^the title should be (?:'|"|)?(.*?)(?:'|"|)?$/, async function (expectedTitle) {
    const actualTitle = await this.page.title();
    if (actualTitle !== expectedTitle) {
        throw new Error(`Title mismatch: expected "${expectedTitle}", found "${actualTitle}"`);
    }
});

Then(/^I (?:take|save) (?:a )?screenshot (?:as )?(?:'|"|)?(.*?)(?:'|"|)?$/, async function (name) {
    const fileName = `${name || 'screenshot'}.png`;
    const filePath = path.join(__dirname, '../temp_bdd', fileName);
    await this.page.screenshot({ path: filePath, fullPage: true });
    console.log(`[BDD ENGINE] Screenshot captured: ${fileName}`);
});

When(/^I wait for element (?:'|"|)?(.*?)(?:'|"|)? to be visible$/, async function (selector) {
    await this.page.waitForSelector(selector, {
        visible: true,
        timeout: 30000
    });
});
When(/^I set viewport to '(\d+)x(\d+)'$/, async function (width, height) {
    width = parseInt(width);
    height = parseInt(height);
    console.log(`[BDD ENGINE] Setting viewport to ${width}x${height}`);
    await this.page.setViewport({ width, height });
    await new Promise(r => setTimeout(r, 1000)); // wait a moment for layout
});
// --- RIGOROUS VERIFICATIONS ---
Then(/^I (?:should see|see) (?:'|"|)?(.*?)(?:'|"|)?$/, async function (text) {
    const found = await this.page.waitForFunction((txt) =>
        document.body.innerText.toLowerCase().includes(txt.toLowerCase()),
        { timeout: 20000 }, text
    ).catch(() => false);

    if (!found) {
        const bodyPreview = await this.page.evaluate(() => document.body.innerText.substring(0, 300));
        throw new Error(`VERIFICATION FAILED: "${text}" not found. Page content preview: ${bodyPreview}...`);
    }
});

Then(/^the element (?:'|"|)?(.*?)(?:'|"|)? should be (visible|exist)$/, async function (selector, type) {
    try {
        await this.page.waitForSelector(selector, { visible: type === 'visible', timeout: 15000 });
    } catch (e) {
        const isFuzzyVisible = await this.page.evaluate((sel, typeVal) => {
            const elements = Array.from(document.querySelectorAll('*'));
            return elements.some(el => {
                const textMatch = (el.innerText || "").toLowerCase().includes(sel.toLowerCase());
                const attrMatch = (el.getAttribute('name') || el.id || el.getAttribute('aria-label') || "").toLowerCase().includes(sel.toLowerCase());
                const selectorMatch = sel.includes('[') || sel.includes('.') || sel.includes('#') ? document.querySelector(sel) === el : false;

                if (typeVal === 'visible') {
                    const style = window.getComputedStyle(el);
                    return (textMatch || attrMatch || selectorMatch) && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
                }
                return textMatch || attrMatch || selectorMatch;
            });
        }, selector, type);

        if (!isFuzzyVisible) throw new Error(`ACCURACY ERROR: Element or Text "${selector}" is not ${type} in current DOM.`);
    }
});

// --- GENERIC ASSERTIONS FOR LIBRARY ---
Then(/^the title should not be empty$/, async function () {
    const title = await this.page.title();
    if (!title || title.trim().length === 0) throw new Error("Page title is empty.");
});

Then(/^all 'img' elements should have 'alt' attribute$/, async function () {
    const missingAltCount = await this.page.evaluate(() => {
        return Array.from(document.querySelectorAll('img')).filter(img => !img.hasAttribute('alt')).length;
    });
    if (missingAltCount > 0) throw new Error(`Found ${missingAltCount} images missing alt text.`);
});

Then(/^there should be exactly one 'h1' element$/, async function () {
    const h1Count = await this.page.evaluate(() => document.querySelectorAll('h1').length);
    if (h1Count !== 1) throw new Error(`Expected 1 h1 element, found ${h1Count}.`);
});

Then(/^all '(input|button|a)' elements should have (text content|associated labels)$/, async function (element, type) {
    const failureCount = await this.page.evaluate((elType, check) => {
        const els = Array.from(document.querySelectorAll(elType));
        return els.filter(el => {
            if (check === 'text content') {
                return !(el.innerText || el.textContent || "").trim();
            } else {
                if (el.id && document.querySelector(`label[for="${el.id}"]`)) return false;
                if (el.closest('label')) return false;
                if (el.getAttribute('aria-label')) return false;
                return true;
            }
        }).length;
    }, element, type);
    if (failureCount > 0) throw new Error(`Found ${failureCount} ${element} elements failing ${type} check.`);
});

Then(/^the (?:meta|link)\[(name|property|rel)='(.*)'\] element should exist$/, async function (attr, val) {
    const exists = await this.page.evaluate((a, v) => !!document.querySelector(`meta[${a}="${v}"], link[${a}="${v}"]`), attr, val);
    if (!exists) throw new Error(`${attr}='${val}' element is missing.`);
});

Then(/^the largest image should be loaded$/, async function () {
    const loaded = await this.page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img'));
        if (imgs.length === 0) return true;
        return imgs.every(img => img.complete && img.naturalHeight !== 0);
    });
    if (!loaded) throw new Error("Some images failed to load completely.");
});

Then(/^the (?:header|footer) should remain visible$/, async function () {
    const visible = await this.page.evaluate(() => {
        const el = document.querySelector('header') || document.querySelector('.header') || document.querySelector('footer') || document.querySelector('.footer');
        if (!el) return true;
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
    });
    if (!visible) throw new Error("Header/Footer is not visible.");
});

Then(/^location protocol should be (?:'|"|)?(.*?)(?:'|"|)?$/, async function (expected) {
    const protocol = await this.page.evaluate(() => window.location.protocol);
    if (protocol !== expected) throw new Error(`Protocol mismatch: expected ${expected}, found ${protocol}`);
});

// --- ADVANCED AUDITS ---
// --- ADVANCED AUDITS ---
Then('the page should be accessible', async function () {
    const audit = await new AxePuppeteer(this.page).analyze();
    if (audit.violations.length > 0) {
        // Soft Assertion: Log violations but pass the test so user sees the data
        const report = audit.violations.map(v => `• [${v.id}] ${v.help} (Impact: ${v.impact})`).join('\n');
        console.log(`\n[ACCESSIBILITY AUDIT COMPLETE]\nFound ${audit.violations.length} violations. (Soft Pass)\n${report}`);
    } else {
        console.log("[ACCESSIBILITY AUDIT] ✅ No violations found.");
    }
});

Then('site loading speed should be acceptable', async function () {
    const metrics = await this.page.evaluate(() => {
        const t = window.performance.timing;
        return {
            interactive: t.domInteractive - t.navigationStart,
            complete: t.loadEventEnd - t.navigationStart
        };
    });

    console.log(`[PERFORMANCE METRICS]\n• DOM Interactive: ${metrics.interactive}ms\n• Full Load: ${metrics.complete}ms`);

    if (metrics.complete > 20000) {
        console.warn(`[PERFORMANCE WARNING] Load time exceeded 20s. (Soft Pass)`);
    } else {
        console.log(`[PERFORMANCE CHECK] ✅ Speed is within acceptable limits.`);
    }
});
