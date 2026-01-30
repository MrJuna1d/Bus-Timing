import axios from 'axios';
import * as cheerio from 'cheerio';

const headers = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate",
  "Connection": "keep-alive",
  "Referer": "https://myrapidbus.prasarana.com.my/kiosk",
  "Sec-Ch-Ua": '";Not A Brand";v="99", "Chromium";v="94"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
  "Sec-Fetch-Site": "same-origin",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-User": "?1",
  "Sec-Fetch-Dest": "document",
  "Upgrade-Insecure-Requests": "1"
};

// Cookies from browser session
const cookies = {
  "myrapidbus_ci_session": "v7b7l1aauriu8lauc13m2jd0siv6lagn",
  "incap_ses_1675_3166704": "HgzqWFI+1Hj2235R4cs+F7cQe2kAAAAAglOPkpKrsBj0jJX3Gg6kmQ==",
  "nlbi_3166704": "frmUPMA60iVdGuOROA/UZAAAAADwUQW4Wu2crRo/chkpIE4t",
  "visid_incap_3166704": "crnuEIxLT5Oxo0LRmQavHAP+emkAAAAAQ0IPAAAAAACAFA3CAcq7kKx34TMJ5mUAk9SAknJKlz4p"
};

function getCookieString() {
  return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
}

// Scrape a single route by ID
async function scrapeSingleRoute(routeId) {
  try {
    console.log(`Scraping route: ${routeId}\n`);
    
    const routeUrl = `https://myrapidbus.prasarana.com.my/kiosk?route=${routeId}&bus=`;
    const response = await axios.get(routeUrl, { 
      headers: {
        ...headers,
        "Cookie": getCookieString()
      }
    });
    const $ = cheerio.load(response.data);

    // Get all scripts and find the one with bus stop data
    const scripts = $('script');
    let targetScript = null;
    
    scripts.each((i, script) => {
      const content = $(script).html();
      if (content && content.includes('var bstp =')) {
        targetScript = content;
        return false; // break
      }
    });

    if (!targetScript) {
      console.error('✗ Could not find script with bus stop data');
      console.log('\n⚠ The site requires valid session cookies to bypass bot protection.');
      console.log('To get cookies:');
      console.log('1. Open https://myrapidbus.prasarana.com.my/kiosk in your browser');
      console.log('2. Open DevTools (F12) > Application > Cookies');
      console.log('3. Copy ci_session, ARRAffinity, ARRAffinitySameSite values');
      console.log('4. Update the cookies object in this file\n');
      return null;
    }

    // Extract callName: var no_route = ... ? 'CALLNAME' : ...
    const callNameMatch = targetScript.match(/var\s+no_route.*?\?\s*'([^']+)'\s*:/);
    const callName = callNameMatch ? callNameMatch[1] : null;

    // Extract stops: var bstp = [...];
    const stopsMatch = targetScript.match(/var\s+bstp\s*=\s*(\[[\s\S]*?\]);/);
    
    if (!stopsMatch) {
      console.error('✗ Could not extract bus stops from script');
      return null;
    }

    const stops = JSON.parse(stopsMatch[1]);

    const result = {
      routeId,
      callName,
      stops // Return full stop objects with lat, lng, street_name, dr, zone
    };

    console.log('✓ Scraping complete!\n');
    console.log('Route ID:', routeId);
    console.log('Call Name:', callName);
    console.log('Stops:');
    console.dir(stops, { depth: null });
    
    return result;

  } catch (error) {
    console.error(`✗ Error scraping route ${routeId}:`, error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
    }
    return null;
  }
}

// Run with route 673
scrapeSingleRoute('1029');

export { scrapeSingleRoute };