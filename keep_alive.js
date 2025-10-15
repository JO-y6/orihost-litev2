// keep_alive.js (improved: 24/7, 60s interval, jitter, cookie, retries, logging)
const https = require("https");
const http = require("http");

const urlString = process.env.ORIHOST_URL || "https://orihost.com/";
const cookie = process.env.ORIHOST_COOKIE || ""; // optional, use when login required
const BASE_INTERVAL_MS = Number(process.env.INTERVAL_MS) || 60 * 1000; // default 60s
const JITTER_MS = Number(process.env.JITTER_MS) || 10000; // up to ±10s jitter
const REQUEST_TIMEOUT = 15 * 1000; // 15s timeout
const MAX_RETRIES = 2;

let successCount = 0;
let failCount = 0;
let consecutiveFails = 0;

function randJitter() {
  return Math.floor(Math.random() * (JITTER_MS * 2 + 1)) - JITTER_MS;
}

function doRequest(retriesLeft = MAX_RETRIES) {
  const start = Date.now();
  const useHttps = urlString.startsWith("https://");
  const lib = useHttps ? https : http;
  const options = {
    method: "GET",
    timeout: REQUEST_TIMEOUT,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      Connection: "keep-alive",
      Cookie: cookie
    },
  };

  const req = lib.get(urlString, options, (res) => {
    const ms = Date.now() - start;
    const status = res.statusCode || 0;
    console.log(new Date().toISOString(), `→ Status: ${status}  (${ms}ms)`);

    if (status >= 200 && status < 400) {
      successCount++;
      consecutiveFails = 0;
      console.log(new Date().toISOString(), `✅ Pinged ${urlString} | Status: ${status} | successes=${successCount}`);
    } else {
      failCount++;
      consecutiveFails++;
      console.warn(new Date().toISOString(), `⚠️ Non-OK status: ${status} | fails=${failCount}`);
    }
    res.resume();
  });

  req.on("timeout", () => {
    req.destroy(new Error("Request timeout"));
  });

  req.on("error", (err) => {
    failCount++;
    consecutiveFails++;
    console.error(new Date().toISOString(), `❌ Request error: ${err.message} (${err.code || ''}) | retriesLeft=${retriesLeft}`);
    if (retriesLeft > 0) {
      // small retry after short delay
      setTimeout(() => doRequest(retriesLeft - 1), 5000);
    }
  });

  req.end();
}

function scheduleNext() {
  const jitter = randJitter();
  const next = Math.max(1000, BASE_INTERVAL_MS + jitter); // at least 1s
  setTimeout(() => {
    doRequest();
    // Backoff if many consecutive fails
    if (consecutiveFails >= 6) {
      console.warn(new Date().toISOString(), "⚠️ Many consecutive failures, backing off 5m");
      setTimeout(scheduleNext, 5 * 60 * 1000);
    } else {
      scheduleNext();
    }
  }, next);
}

// start
console.log("🚀 Orihost Keeper (improved) started...");
console.log("Target URL:", urlString);
console.log("Interval (base ms):", BASE_INTERVAL_MS, "Jitter(ms):", JITTER_MS);
doRequest();
scheduleNext();