import logging
from typing import Dict, Set
from collections import defaultdict

logger = logging.getLogger(__name__)


class InvertedIndex:
    """BM25-ready inverted index with TF and DF tracking."""
    
    def __init__(self):
        # Main index: term -> {df, postings}
        self.index: Dict[str, Dict] = {}
        
        # Document frequency tracking
        self.document_frequencies: Dict[str, int] = defaultdict(int)
        
        # Document length tracking
        self.document_lengths: Dict[int, int] = {}
        
        # Corpus statistics
        self.total_documents = 0
        self.avg_doc_length = 0.0
        
        # Track processed documents to avoid duplicates
        self.processed_docs: Set[int] = set()
    
    def add_document(self, doc_id: int, tokens: list[str]) -> None:
        """Add a document to the inverted index with TF calculation."""
        if doc_id in self.processed_docs:
            logger.warning(f"Document {doc_id} already processed, skipping")
            return
        
        # Track document length
        self.document_lengths[doc_id] = len(tokens)
        
        # Count term frequencies for this document
        term_counts = defaultdict(int)
        for token in tokens:
            term_counts[token] += 1
        
        # Update main index with TF and postings
        for token, tf in term_counts.items():
            if token not in self.index:
                self.index[token] = {
                    'df': 0,
                    'postings': {}
                }
            
            # Add posting with term frequency
            self.index[token]['postings'][doc_id] = tf
            self.index[token]['df'] += 1
        
        # Mark document as processed
        self.processed_docs.add(doc_id)
        self.total_documents += 1
        
        logger.debug(f"Added document {doc_id} with {len(tokens)} tokens")
    
    def finalize(self) -> None:
        """Compute final corpus statistics."""
        if self.total_documents == 0:
            logger.warning("No documents processed")
            return
        
        # Calculate average document length
        total_length = sum(self.document_lengths.values())
        self.avg_doc_length = total_length / self.total_documents
        
        logger.info(f"Finalized index: {self.total_documents} docs, avg length: {self.avg_doc_length:.2f}")
    
    def get_term_stats(self, term: str) -> Dict:
        """Get term statistics for BM25 calculation."""
        if term not in self.index:
            return {'df': 0, 'postings': {}}
        
        return self.index[term]
    
    def get_document_length(self, doc_id: int) -> int:
        """Get document length for BM25 calculation."""
        return self.document_lengths.get(doc_id, 0)
    
    def get_corpus_stats(self) -> Dict:
        """Get corpus statistics for BM25 calculation."""
        return {
            'total_documents': self.total_documents,
            'avg_doc_length': self.avg_doc_length,
            'document_lengths': self.document_lengths
        }
    
    def get_vocabulary(self) -> list[str]:
        """Get all unique terms in the index."""
        return list(self.index.keys())
    
    def save_to_dict(self) -> Dict:
        """Convert index to dictionary for JSON serialization."""
        return {
            'index': self.index,
            'stats': self.get_corpus_stats()
        }