import puppeteer from "puppeteer";

const getStops = async () => {
  // Start a Puppeteer session with:
  // - a visible browser (`headless: false` - easier to debug because you'll see the browser in action)
  // - no default viewport (`defaultViewport: null` - website page will in full width and height)
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
  });

  // Open a new page
  const page = await browser.newPage();

  // On this new page:
  // - open the "http://quotes.toscrape.com/" website
  // - wait until the dom content is loaded (HTML is ready)
  await page.goto("https://myrapidbus.prasarana.com.my/kiosk", {
    waitUntil: "domcontentloaded",
  });

  await page.locator('.select2-selection__rendered').click();

  // 'input' is a CSS selector.
  await page.locator('.select2-search__field').fill('T589');
  await page.keyboard.press('Enter');

  await page.locator('.btn.btn-submit').click();

  await page.locator('.zone-1');

  const busStops = await page.locator('.zone-1').map(el => el.textContent.trim()).wait();

  console.log('Bus Stops:', busStops);

};

// Start the scraping
getStops();