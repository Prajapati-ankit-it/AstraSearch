import re
import logging
from typing import List, Optional

logger = logging.getLogger(__name__)

# Common English stopwords
STOPWORDS = {
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'were', 'will', 'with', 'i', 'you', 'your', 'we',
    'they', 'them', 'their', 'this', 'these', 'those', 'or', 'but',
    'not', 'no', 'can', 'could', 'should', 'would', 'have', 'had',
    'do', 'does', 'did', 'so', 'if', 'then', 'else', 'when', 'where',
    'why', 'how', 'what', 'which', 'who', 'whom', 'whose', 'my',
    'me', 'mine', 'our', 'us', 'ours', 'him', 'his', 'her', 'hers'
}


class Tokenizer:
    """Tokenize text and remove stopwords."""
    
    def __init__(self, remove_stopwords: bool = True):
        self.remove_stopwords = remove_stopwords
        self.stopwords = STOPWORDS if remove_stopwords else set()
        # Pattern to split on underscores and whitespace
        self.split_pattern = re.compile(r'[_\s]+')
    
    def tokenize(self, text: Optional[str]) -> List[str]:
        """Tokenize text into words and optionally remove stopwords."""
        if not text:
            return []
        
        try:
            # Split on underscores and whitespace
            tokens = self.split_pattern.split(text)
            
            # Filter out empty strings and stopwords
            if self.remove_stopwords:
                tokens = [token for token in tokens if token and token not in self.stopwords]
            else:
                tokens = [token for token in tokens if token]
            
            return tokens
            
        except Exception as e:
            logger.warning(f"Error tokenizing text: {e}")
            return []
    
    def tokenize_safe(self, text: Optional[str]) -> List[str]:
        """Safely tokenize text with additional error handling."""
        try:
            return self.tokenize(text)
        except Exception as e:
            logger.error(f"Critical error in tokenization: {e}")
            return []
