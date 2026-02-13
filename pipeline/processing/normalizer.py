import re
import logging
import unicodedata
from typing import Optional

logger = logging.getLogger(__name__)

"""
Normalization Standard (v1):
- NFKC Unicode normalization
- Lowercase
- Keep only: a-z, 0-9, whitespace
- Collapse whitespace

IMPORTANT:
Query layer must mirror this logic exactly.
"""

class TextNormalizer:
    """Normalize text by Unicode normalization, lowercasing, removing punctuation, and cleaning whitespace."""
    
    def __init__(self):
        # Pattern to match punctuation (keep only a-z, 0-9, and whitespace)
        # Explicit ASCII-safe normalization to match Node.js behavior
        self.punctuation_pattern = re.compile(r'[^a-z0-9\s]')
        self.whitespace_pattern = re.compile(r'\s+')
    
    def normalize(self, text: Optional[str]) -> str:
        """Normalize text by Unicode normalization, lowercasing, removing punctuation, and cleaning whitespace."""
        if not text:
            return ""
        
        try:
            # Unicode normalization (NFKC) - makes indexing canonical
            normalized = unicodedata.normalize("NFKC", text)
            
            # Convert to lowercase
            normalized = normalized.lower()
            
            # Remove punctuation (explicit ASCII-safe rule)
            normalized = self.punctuation_pattern.sub(' ', normalized)
            
            # Normalize whitespace
            normalized = self.whitespace_pattern.sub(' ', normalized).strip()
            
            return normalized
            
        except Exception as e:
            logger.warning(f"Error normalizing text: {e}")
            return text if text else ""
