import json
import logging
from pathlib import Path
from typing import Dict

from .inverted_index import InvertedIndex

logger = logging.getLogger(__name__)


class IndexWriter:
    """Responsible only for persisting index artifacts."""
    
    def __init__(self, index_dir: str):
        self.index_dir = Path(index_dir)
    
    def write_index(self, index: InvertedIndex) -> None:
        """Write inverted index to disk."""
        index_path = self.index_dir / 'inverted_index.json'
        
        try:
            with open(index_path, 'w', encoding='utf-8') as f:
                json.dump(index.index, f, ensure_ascii=False, indent=2)
            
            logger.info(f"Written inverted index to {index_path}")
            
        except Exception as e:
            logger.error(f"Failed to write index: {e}")
            raise
    
    def write_stats(self, index: InvertedIndex) -> None:
        """Write corpus statistics to disk."""
        stats_path = self.index_dir / 'stats.json'
        
        try:
            # Validate finalization before writing
            if index.avg_doc_length <= 0:
                raise RuntimeError(f"Index must be finalized before writing stats (avg_doc_length={index.avg_doc_length})")
            
            # Get stats directly from index - no construction or defaults
            stats = index.get_corpus_stats()
            
            # Required logging before writing
            logger.info(
                f"WRITING FINAL STATS | docs={index.total_documents}, "
                f"avg_len={index.avg_doc_length:.2f}, "
                f"tokens={sum(index.document_lengths.values())}"
            )
            
            with open(stats_path, 'w', encoding='utf-8') as f:
                json.dump(stats, f, ensure_ascii=False, indent=2)
            
            logger.info(f"Written index statistics to {stats_path}")
            
        except Exception as e:
            logger.error(f"Failed to write stats: {e}")
            raise
    
    def write_all(self, index: InvertedIndex) -> None:
        """Write both index and statistics to disk."""
        logger.info("Persisting index artifacts...")
        
        # Write index first
        self.write_index(index)
        
        # Write stats with validation
        self.write_stats(index)
        
        logger.info("Index artifacts written successfully")