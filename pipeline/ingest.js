const fs = require("fs");
const path = require("path");

function ingestDocs() {
  const dir = path.join(__dirname, "../data/docs");
  return fs.readdirSync(dir).map(file => {
    return {
      id: file,
      text: fs.readFileSync(path.join(dir, file), "utf-8")
    };
  });
}

module.exports = ingestDocs;
