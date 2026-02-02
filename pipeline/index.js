const tokenize = require("./tokenize");

function buildIndex(docs) {
  const index = {};

  for (const doc of docs) {
    const tokens = tokenize(doc.text);

    for (const token of tokens) {
      if (!index[token]) index[token] = {};
      if (!index[token][doc.id]) index[token][doc.id] = 0;

      index[token][doc.id] += 1;
    }
  }

  return index;
}

module.exports = buildIndex;
