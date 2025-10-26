#!/usr/bin/env node
// Usage:
//   node getBusStops.js T580
//   node getBusStops.js 673        // internal id from the dropdown <option value="673">T580</option>

import fetch from "node-fetch";
import vm from "node:vm";

const BASE = "https://myrapidbus.prasarana.com.my";

async function fetchText(url) {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function extractBstpArray(html) {
  // Grab the JS array literal assigned to var bstp = [...]
  const m = html.match(/var\s+bstp\s*=\s*(\[[\s\S]*?\]);/);
  if (!m) return null;
  const arrLiteral = m[1];
  // Safely evaluate the array literal (it uses single quotes, so JSON.parse won't work).
  const sandbox = {};
  const stops = vm.runInNewContext(arrLiteral, sandbox);
  if (!Array.isArray(stops)) return null;
  // Normalize fields
  return stops.map(s => ({
    id: String(s.stop_id ?? ""),
    name: String(s.stop_name ?? ""),
    lat: Number(s.lat),
    lng: Number(s.lng),
    dr: String(s.dr ?? ""),
    zone: String(s.zone ?? "")
  }));
}

function findRouteIdFromDropdown(html, routeCode) {
  // The dropdown is <select id="route"><option value="673">T580</option>...</select>
  // Match an <option> whose text equals the code (exact match)
  // 1) Find the whole select block to narrow search
  const sel = html.match(/<select[^>]*id=["']route["'][\s\S]*?<\/select>/i);
  const block = sel ? sel[0] : html;
  // 2) Find <option value="id">TEXT</option>
  const re = new RegExp(
    String.raw`<option\s+value=["'](\d+)["'][^>]*>\s*${routeCode}\s*<\/option>`,
    "i"
  );
  const m = block.match(re);
  return m ? m[1] : null;
}

async function getStops(routeArg) {
  // If numeric, treat as internal route id; else resolve id from route code
  let routeId = /^\d+$/.test(routeArg) ? routeArg : null;

  if (!routeId) {
    const kioskHTML = await fetchText(`${BASE}/kiosk`);
    routeId = findRouteIdFromDropdown(kioskHTML, routeArg);
    if (!routeId) {
      throw new Error(`Could not find route id for code "${routeArg}" in the dropdown.`);
    }
  }

  // Load the route-specific page (server injects bstp there)
  const routeHTML = await fetchText(`${BASE}/kiosk?bus=&route=${routeId}`);
  const stops = extractBstpArray(routeHTML);
  if (!stops) {
    // Some pages may not show bstp (e.g., truly empty or special routes)
    return [];
  }
  return stops;
}

// CLI
const arg = process.argv[2];
if (!arg) {
  console.error("Usage: node getBusStops.js <ROUTE_CODE or ROUTE_ID>\n  e.g. node getBusStops.js T580  or  node getBusStops.js 673");
  process.exit(1);
}

getStops(arg)
  .then(stops => {
    console.log(stops);
  })
  .catch(err => {
    console.error("Error:", err.message);
    process.exit(2);
  });
