import json
import logging
import time
from pathlib import Path
from typing import List, Dict

from .inverted_index import InvertedIndex
from pipeline.processing.cleaner import TextCleaner
from pipeline.processing.normalizer import TextNormalizer
from pipeline.processing.tokenizer import Tokenizer

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
        """Process a single SearchDocument and return tokens."""
        # Extract text content from SearchDocument contract
        text_content = doc.get('text', '')
        
        # Clean text content
        cleaned_text = self.cleaner.clean(text_content)
        
        # Normalize text
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
            
            # Validate corpus statistics before proceeding
            if self.index.avg_doc_length <= 0:
                raise RuntimeError(f"CRITICAL: avg_doc_length={self.index.avg_doc_length} <= 0 - pipeline bug detected")
            
            # Get final statistics
            corpus_stats = self.index.get_corpus_stats()
            vocabulary = self.index.get_vocabulary()
            
            end_time = time.time()
            indexing_time = end_time - start_time
            
            # Mandatory debug log for BM25 validation
            logger.info(
                f"BM25 STATS | docs={self.index.total_documents}, "
                f"avg_len={self.index.avg_doc_length:.2f}, "
                f"total_tokens={sum(self.index.document_lengths.values())}"
            )
            
            logger.info(f"Index built successfully in {indexing_time:.2f} seconds")
            logger.info(f"Vocabulary size: {len(vocabulary)}")
            logger.info(f"Average document length: {corpus_stats['avg_doc_length']:.2f}")
            
            return {
                'indexing_time_seconds': indexing_time,
                'total_documents': corpus_stats['total_documents'],
                'vocabulary_size': len(vocabulary),
                'avg_doc_length': corpus_stats['avg_doc_length'],
                'total_postings': sum(len(stats['postings']) for stats in self.index.save_to_dict()['index'].values()),
                'normalization_version': 'v1_ascii_nfkc'  # Track normalization version
            }
            
        except Exception as e:
            logger.error(f"Failed to build index: {e}")
            raise