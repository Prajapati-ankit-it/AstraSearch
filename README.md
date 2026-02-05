# AstraSearch - Problem-Solution Search Engine

A scalable indexing system for searching StackOverflow answers using Python.

## Project Structure

```
search-engine/
│
├── configs/
│
├── data/
│
├── index/
│
├── pipeline/                ← Python offline jobs
│
├── services/                ← online services
│   │
│   └── search-service/      ← Node service
│
├── crawler/
│
├── docker/
│
├── requirements.txt
└── README.md

```

## Features

- **Configuration-driven schema mapping** via YAML
- **Streaming CSV processing** for memory efficiency
- **Modular text processing pipeline** (cleaning → normalization → tokenization)
- **Scalable inverted index** supporting millions of documents
- **Production-style error handling** and logging
- **Incremental indexing** support for future scaling

## Quick Start

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the indexing pipeline:
```bash
python pipeline/run_pipeline.py
```

3. Check the output:
   - Processed documents: `data/processed/documents.json`
   - Search index: `index/inverted_index.json`
   - Statistics: `index/stats.json`

## Pipeline Stages

1. **Document Extraction**: Reads CSV data, maps fields via config, cleans HTML
2. **Text Processing**: Normalizes, tokenizes, and removes stopwords
3. **Index Building**: Creates inverted index with efficient posting lists
4. **Persistence**: Saves index and statistics to disk

## Configuration

Edit `configs/ingestion.yaml` to modify field mappings:

```yaml
dataset: stackoverflow_answers

fields:
  doc_id: Id
  parent_id: ParentId
  score: Score
  content: Body
```

## Performance

- Processes 20K documents in ~10 seconds
- Memory-efficient streaming design
- Scales to 1M+ documents without redesign
- Configurable batch processing for larger datasets
