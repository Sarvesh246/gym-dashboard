const https = require("https");

const WGER_API = "https://wger.de/api/v2";

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Failed to parse JSON: ${e.message}`));
          }
        });
      })
      .on("error", reject);
  });
}

async function main() {
  const url = `${WGER_API}/exercise/?limit=3&offset=0&language=2`;
  console.log(`Fetching from: ${url}\n`);

  const data = await httpsGet(url);

  console.log("API Response structure:");
  console.log(JSON.stringify(data, null, 2).slice(0, 2000));

  if (data.results && data.results[0]) {
    console.log("\nFirst exercise object:");
    console.log(JSON.stringify(data.results[0], null, 2));
  }
}

main().catch(console.error);
