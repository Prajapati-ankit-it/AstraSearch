import json
import logging
from pathlib import Path
from typing import Dict

logger = logging.getLogger(__name__)


class IndexWriter:
    """Write inverted index to disk."""
    
    def __init__(self, index_dir: str):
        self.index_dir = Path(index_dir)
        self.index_dir.mkdir(parents=True, exist_ok=True)
    
    def write_index(self, index_data: Dict, stats: Dict) -> None:
        """Write inverted index and statistics to disk."""
        try:
            # Write inverted index
            index_path = self.index_dir / 'inverted_index.json'
            with open(index_path, 'w', encoding='utf-8') as f:
                json.dump(index_data, f, ensure_ascii=False, indent=2)
            
            logger.info(f"Written inverted index to {index_path}")
            
            # Write statistics
            stats_path = self.index_dir / 'stats.json'
            with open(stats_path, 'w', encoding='utf-8') as f:
                json.dump(stats, f, ensure_ascii=False, indent=2)
            
            logger.info(f"Written index statistics to {stats_path}")
            
        except Exception as e:
            logger.error(f"Failed to write index: {e}")
            raise
    
    def read_index(self) -> Dict:
        """Read inverted index from disk."""
        try:
            index_path = self.index_dir / 'inverted_index.json'
            with open(index_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to read index: {e}")
            raise
    
    def read_stats(self) -> Dict:
        """Read index statistics from disk."""
        try:
            stats_path = self.index_dir / 'stats.json'
            with open(stats_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to read stats: {e}")
            raise
