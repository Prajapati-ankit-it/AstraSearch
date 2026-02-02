const { spawnSync } = require("child_process");
const ingestDocs = require("./pipeline/ingest");
const buildIndex = require("./pipeline/index");

const query = process.argv.slice(2);
if (query.length === 0) {
  console.log("Usage: node search.js <query>");
  process.exit(1);
}

const docs = ingestDocs();
const index = buildIndex(docs);

const result = spawnSync(
  "python",
  ["ranking/score.py", ...query],
  { input: JSON.stringify(index), encoding: "utf-8" }
);

console.log(result.stdout);
