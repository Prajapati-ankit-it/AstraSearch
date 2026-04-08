# AstraSearch - StackOverflow Search Engine

Search engine for StackOverflow answers using BM25 and structural ranking.

## Problem

Keyword search does not rank results well because it ignores:

* term importance
* title vs body difference
* phrase match and proximity

## Solution

Two-stage system:

* Python pipeline builds an inverted index
* Node.js service handles queries and ranking

## System Design

**Architecture**

* Offline indexing (Python)
* Online query serving (Node.js)

**Components**

* Index builder: parses data, tokenizes, builds postings
* Search service: query processing, retrieval, ranking
* Inverted index: term → document list with frequencies
* Evaluation: precision, recall, NDCG

**Data Flow**

1. Read CSV → clean HTML
2. Normalize + tokenize
3. Build inverted index
4. Query → tokenize → retrieve candidates → BM25 → ranking → top-K

**Design Choices**

* Split indexing and serving → better performance isolation
* JSON index → easy debugging, higher memory cost
* Modular ranking → easy to add/remove signals
* Soft filtering → reduces work but may drop some results

**Tradeoffs**

* Faster development vs memory efficiency (JSON)
* Lower latency vs lower recall (filtering)
* Simple design vs no real-time updates

## Performance

* Tested up to ~300K documents
* Query latency:

  * cache hit: <1 ms
  * cache miss: 10–50 ms
* Main cost: candidate retrieval from posting lists
* Memory grows linearly with data size

## Tech Stack

* Python (indexing)
* Node.js + Fastify (API)
* TypeScript
* JSON index

## Features

* BM25 scoring
* Field-aware ranking (title, body)
* Phrase and proximity signals
* Query intent handling
* Evaluation tools

## How to Run

```bash
pip install -r requirements.txt
cd services/search-service && npm install

python pipeline/run_pipeline.py
cd services/search-service && npm run dev

curl "http://localhost:3000/search?q=javascript%20promise&limit=10"
```

## Limitations

* Full index in memory (not efficient at large scale)
* No incremental updates
* No query operators (AND/OR)
* No distributed support

---
