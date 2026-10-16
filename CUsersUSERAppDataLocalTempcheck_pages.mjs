import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

const errors = [];
const warnings = [];

page.on('console', msg => {
  if (msg.type() === 'error') errors.push(`[HOME] ${msg.text()}`);
  if (msg.type() === 'warning') warnings.push(`[HOME] ${msg.text()}`);
});
page.on('pageerror', err => errors.push(`[HOME CRASH] ${err.message}`));

// 1. Home page
console.log('=== HOME PAGE ===');
await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(3000);
console.log('Errors:', errors.length ? errors.join('\n') : 'none');
console.log('Warnings:', warnings.length ? warnings.slice(0,3).join('\n') : 'none');

// 2. Collection page
const collErrors = [];
const collPage = await context.newPage();
collPage.on('console', msg => { if (msg.type() === 'error') collErrors.push(msg.text()); });
collPage.on('pageerror', err => collErrors.push(`[CRASH] ${err.message}`));
console.log('\n=== COLLECTION PAGE ===');
await collPage.goto('http://localhost:3000/collections/all', { waitUntil: 'networkidle', timeout: 30000 });
await collPage.waitForTimeout(3000);
console.log('Errors:', collErrors.length ? collErrors.join('\n') : 'none');
const collTitle = await collPage.title();
console.log('Page title:', collTitle);

// 3. PDP - grab first product handle from collection
const pdpErrors = [];
const pdpPage = await context.newPage();
pdpPage.on('console', msg => { if (msg.type() === 'error') pdpErrors.push(msg.text()); });
pdpPage.on('pageerror', err => pdpErrors.push(`[CRASH] ${err.message}`));
// Try to get a product handle from collection page
const productLinks = await collPage.$$eval('a[href^="/products/"]', links => links.slice(0,1).map(l => l.href));
const pdpUrl = productLinks[0] || 'http://localhost:3000/products/test';
console.log('\n=== PDP PAGE ===');
console.log('Navigating to:', pdpUrl);
await pdpPage.goto(pdpUrl, { waitUntil: 'networkidle', timeout: 30000 });
await pdpPage.waitForTimeout(4000);
console.log('Errors:', pdpErrors.length ? pdpErrors.join('\n') : 'none');
const pdpTitle = await pdpPage.title();
console.log('Page title:', pdpTitle);
const pdpContent = await pdpPage.$('main');
console.log('Has main content:', !!pdpContent);
// Check for specific PDP elements
const hasAddToCart = await pdpPage.$('button[class*="add-to"]') || await pdpPage.$('button:has-text("Add to")') || await pdpPage.$('button:has-text("SOLD OUT")');
console.log('Has cart button:', !!hasAddToCart);

await browser.close();
