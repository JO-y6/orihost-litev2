const https = require("https");

const url = process.env.ORIHOST_URL || "https://orihost.xyz/";

console.log("🚀 Orihost Keeper (Lite) started...");
console.log("Target URL:", url);

function ping() {
  https
    .get(url, (res) => {
      console.log(
        new Date().toISOString(),
        `✅ Pinged ${url} | Status: ${res.statusCode}`
      );
      res.resume();
    })
    .on("error", (err) => {
      console.error("❌ Error:", err.message);
    });
}

// Run first ping immediately
ping();

// Repeat every 3 minutes
setInterval(ping, 3 * 60 * 1000);
