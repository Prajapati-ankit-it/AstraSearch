import json
import logging
import time
from pathlib import Path
from typing import List, Dict

from .inverted_index import InvertedIndex
from ..processing.cleaner import TextCleaner
from ..processing.normalizer import TextNormalizer
from ..processing.tokenizer import Tokenizer

logger = logging.getLogger(__name__)


class IndexBuilder:
    """Build BM25-ready inverted index from processed documents."""
    
    def __init__(self, index_dir: str):
        self.index_dir = Path(index_dir)
        self.index = InvertedIndex()
        self.cleaner = TextCleaner()
        self.normalizer = TextNormalizer()
        self.tokenizer = Tokenizer(remove_stopwords=True)
    
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
            
            # Finalize index to compute corpus statistics
            self.index.finalize()
            
            # Get final statistics
            corpus_stats = self.index.get_corpus_stats()
            vocabulary = self.index.get_vocabulary()
            
            end_time = time.time()
            indexing_time = end_time - start_time
            
            logger.info(f"Index built successfully in {indexing_time:.2f} seconds")
            logger.info(f"Vocabulary size: {len(vocabulary)}")
            logger.info(f"Average document length: {corpus_stats['avg_doc_length']:.2f}")
            
            return {
                'indexing_time_seconds': indexing_time,
                'total_documents': corpus_stats['total_documents'],
                'vocabulary_size': len(vocabulary),
                'avg_doc_length': corpus_stats['avg_doc_length'],
                'total_postings': sum(len(stats['postings']) for stats in self.index.save_to_dict()['index'].values())
            }
            
        except Exception as e:
            logger.error(f"Failed to build index: {e}")
            raise