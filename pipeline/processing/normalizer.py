import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class TextNormalizer:
    """Normalize text by lowercasing, removing punctuation, and cleaning whitespace."""
    
    def __init__(self):
        # Pattern to match punctuation (keep alphanumeric and spaces)
        self.punctuation_pattern = re.compile(r'[^\w\s]')
        self.whitespace_pattern = re.compile(r'\s+')
    
    def normalize(self, text: Optional[str]) -> str:
        """Normalize text by lowercasing, removing punctuation, and cleaning whitespace."""
        if not text:
            return ""
        
        try:
            # Convert to lowercase
            normalized = text.lower()
            
            # Remove punctuation
            normalized = self.punctuation_pattern.sub(' ', normalized)
            
            # Normalize whitespace
            normalized = self.whitespace_pattern.sub(' ', normalized).strip()
            
            return normalized
            
        except Exception as e:
            logger.warning(f"Error normalizing text: {e}")
            return text if text else ""
