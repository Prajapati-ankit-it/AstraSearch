import logging
import sys
import time
from pathlib import Path

# Add pipeline to path for imports
sys.path.append(str(Path(__file__).parent))

from pipeline.ingestion.stackoverflow_reader import StackOverflowReader
from pipeline.indexing.build_index import IndexBuilder


def setup_logging():
    """Setup logging configuration."""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )


def main():
    """Run the complete indexing pipeline."""
    setup_logging()
    logger = logging.getLogger(__name__)
    
    # Define paths
    base_dir = Path(__file__).parent.parent
    config_path = base_dir / 'configs' / 'ingestion.yaml'
    dataset_path = base_dir / 'data' / 'raw' / 'dataset.txt'
    documents_path = base_dir / 'data' / 'processed' / 'documents.json'
    index_dir = base_dir / 'index'
    
    logger.info("Starting indexing pipeline...")
    pipeline_start = time.time()
    
    try:
        # Step 1: Extract documents
        logger.info("Step 1: Extracting documents from dataset...")
        reader = StackOverflowReader(str(config_path))
        
        documents = list(reader.read_documents(str(dataset_path), max_rows=20000))
        logger.info(f"Extracted {len(documents)} documents")
        
        # Save processed documents
        reader.save_documents(documents, str(documents_path))
        
        # Step 2: Build index
        logger.info("Step 2: Building inverted index...")
        index_builder = IndexBuilder(str(index_dir))
        stats = index_builder.build_from_documents(str(documents_path))
        
        # Pipeline completion
        pipeline_end = time.time()
        total_time = pipeline_end - pipeline_start
        
        # Print final statistics
        logger.info("=" * 50)
        logger.info("PIPELINE COMPLETION SUMMARY")
        logger.info("=" * 50)
        logger.info(f"Total pipeline time: {total_time:.2f} seconds")
        logger.info(f"Documents processed: {stats['documents_indexed']}")
        logger.info(f"Vocabulary size: {stats['vocabulary_size']}")
        logger.info(f"Total postings: {stats['total_postings']}")
        logger.info(f"Indexing time: {stats['indexing_time_seconds']:.2f} seconds")
        logger.info(f"Average processing per document: {stats['processing_time_per_doc_ms']:.2f} ms")
        logger.info(f"Documents saved to: {documents_path}")
        logger.info(f"Index saved to: {index_dir}")
        logger.info("=" * 50)
        
    except Exception as e:
        logger.error(f"Pipeline failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
