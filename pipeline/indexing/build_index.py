import json
import logging
import time
from pathlib import Path
from typing import List, Dict

from .inverted_index import InvertedIndex
from .index_writer import IndexWriter
from pipeline.processing.cleaner import TextCleaner
from pipeline.processing.normalizer import TextNormalizer
from pipeline.processing.tokenizer import Tokenizer

logger = logging.getLogger(__name__)


class IndexBuilder:
    """Build inverted index from processed documents."""
    
    def __init__(self, index_dir: str):
        self.index_dir = index_dir
        self.index = InvertedIndex()
        self.cleaner = TextCleaner()
        self.normalizer = TextNormalizer()
        self.tokenizer = Tokenizer(remove_stopwords=True)
        self.writer = IndexWriter(index_dir)
    
    def process_document(self, doc: Dict) -> List[str]:
        """Process a single document and return tokens."""
        # Clean the solution text
        cleaned_text = self.cleaner.clean(doc.get('solution', ''))
        
        # Normalize the text
        normalized_text = self.normalizer.normalize(cleaned_text)
        
        # Tokenize
        tokens = self.tokenizer.tokenize(normalized_text)
        
        return tokens
    
    def build_from_documents(self, documents_path: str) -> Dict:
        """Build inverted index from documents file."""
        start_time = time.time()
        
        try:
            # Load documents
            with open(documents_path, 'r', encoding='utf-8') as f:
                documents = json.load(f)
            
            logger.info(f"Loaded {len(documents)} documents for indexing")
            
            # Process each document and add to index
            for doc in documents:
                tokens = self.process_document(doc)
                self.index.add_document(doc['id'], tokens)
            
            # Get index data and stats
            index_data = self.index.save_to_dict()
            
            # Add timing information
            end_time = time.time()
            stats = index_data['stats']
            stats['indexing_time_seconds'] = end_time - start_time
            stats['processing_time_per_doc_ms'] = (end_time - start_time) * 1000 / len(documents)
            
            # Write to disk
            self.writer.write_index(index_data['index'], stats)
            
            logger.info(f"Index built successfully in {end_time - start_time:.2f} seconds")
            logger.info(f"Vocabulary size: {stats['vocabulary_size']}")
            logger.info(f"Total postings: {stats['total_postings']}")
            
            return stats
            
        except Exception as e:
            logger.error(f"Failed to build index: {e}")
            raise
