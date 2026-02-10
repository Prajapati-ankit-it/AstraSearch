import logging
import sys
import time
from pathlib import Path

# Add pipeline to path for imports - insert at position 0 to avoid shadowing
sys.path.insert(0, str(Path(__file__).parent))

from pipeline.ingestion.stackoverflow_reader import StackOverflowReader
from pipeline.indexing.build_index import IndexBuilder
from pipeline.indexing.index_writer import IndexWriter

logger = logging.getLogger(__name__)


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
    
    logger.info("Starting indexing pipeline...")
    pipeline_start = time.time()
    
    try:
        # Define paths
        base_dir = Path(__file__).parent.parent
        config_path = base_dir / 'configs' / 'ingestion.yaml'
        dataset_path = base_dir / 'data' / 'raw' / 'dataset.csv'
        documents_path = base_dir / 'data' / 'processed' / 'documents.json'
        index_dir = base_dir / 'index'
        
        # Step 1: Extract documents from dataset
        logger.info("Step 1: Extracting documents from dataset...")
        reader = StackOverflowReader()
        
        documents = list(reader.read_documents(str(dataset_path), max_rows=20000))
        logger.info(f"Extracted {len(documents)} documents")
        
        # Save processed documents
        reader.save_documents(documents, str(documents_path))
        
        # Step 2: Build inverted index (finalize happens internally)
        logger.info("Step 2: Building inverted index...")
        index_builder = IndexBuilder(str(index_dir))
        
        # Build index - this calls finalize() internally
        index_builder.build_from_documents(str(documents_path))
        
        # Step 3: Write index + stats using the index object only
        logger.info("Step 3: Writing index and statistics...")
        index_writer = IndexWriter(str(index_dir))
        
        # Single source of truth: InvertedIndex instance
        index_writer.write_all(index_builder.index)
        
        # Pipeline completion summary using index as source of truth
        pipeline_end = time.time()
        total_time = pipeline_end - pipeline_start
        
        logger.info("=" * 50)
        logger.info("PIPELINE COMPLETION SUMMARY")
        logger.info("=" * 50)
        logger.info(f"Total pipeline time: {total_time:.2f} seconds")
        logger.info(f"Documents processed: {index_builder.index.total_documents}")
        logger.info(f"Average document length: {index_builder.index.avg_doc_length:.2f}")
        logger.info(f"Vocabulary size: {len(index_builder.index.get_vocabulary())}")
        logger.info(f"Index saved to: {index_dir}")
        logger.info("=" * 50)
        
    except Exception as e:
        logger.error(f"Pipeline failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()