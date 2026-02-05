import logging
from typing import Dict, Set, List
from collections import defaultdict

logger = logging.getLogger(__name__)


class InvertedIndex:
    """Inverted index implementation for efficient text search."""
    
    def __init__(self):
        self.index: Dict[str, Set[int]] = defaultdict(set)
        self.doc_count = 0
    
    def add_document(self, doc_id: int, tokens: List[str]):
        """Add document tokens to the inverted index."""
        for token in tokens:
            if token:  # Skip empty tokens
                self.index[token].add(doc_id)
        
        self.doc_count += 1
    
    def add_documents_batch(self, docs_tokens: List[tuple]):
        """Add multiple documents efficiently."""
        for doc_id, tokens in docs_tokens:
            self.add_document(doc_id, tokens)
    
    def get_postings(self, token: str) -> List[int]:
        """Get sorted list of document IDs for a token."""
        if token in self.index:
            return sorted(list(self.index[token]))
        return []
    
    def get_vocabulary(self) -> List[str]:
        """Get all unique tokens in the index."""
        return sorted(list(self.index.keys()))
    
    def get_stats(self) -> Dict:
        """Get index statistics."""
        return {
            'documents_indexed': self.doc_count,
            'vocabulary_size': len(self.index),
            'total_postings': sum(len(postings) for postings in self.index.values())
        }
    
    def save_to_dict(self) -> Dict:
        """Convert index to dictionary for JSON serialization."""
        return {
            'index': {token: sorted(list(postings)) for token, postings in self.index.items()},
            'stats': self.get_stats()
        }
    
    def load_from_dict(self, data: Dict):
        """Load index from dictionary."""
        self.index = defaultdict(set)
        for token, postings in data.get('index', {}).items():
            self.index[token] = set(postings)
        
        stats = data.get('stats', {})
        self.doc_count = stats.get('documents_indexed', 0)
