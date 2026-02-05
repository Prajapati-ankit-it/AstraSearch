import html
import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class TextCleaner:
    """Clean HTML content and prepare for processing."""
    
    def __init__(self):
        self.script_pattern = re.compile(r'<script[^>]*>.*?</script>', re.IGNORECASE | re.DOTALL)
        self.style_pattern = re.compile(r'<style[^>]*>.*?</style>', re.IGNORECASE | re.DOTALL)
        self.html_tag_pattern = re.compile(r'<[^>]+>')
        self.whitespace_pattern = re.compile(r'\s+')
    
    def clean(self, text: Optional[str]) -> str:
        """Clean HTML content by removing tags, scripts, styles, and normalizing whitespace."""
        if not text:
            return ""
        
        try:
            # Decode HTML entities
            cleaned = html.unescape(text)
            
            # Remove script and style tags with their content
            cleaned = self.script_pattern.sub(' ', cleaned)
            cleaned = self.style_pattern.sub(' ', cleaned)
            
            # Remove remaining HTML tags
            cleaned = self.html_tag_pattern.sub(' ', cleaned)
            
            # Normalize whitespace
            cleaned = self.whitespace_pattern.sub(' ', cleaned).strip()
            
            return cleaned
            
        except Exception as e:
            logger.warning(f"Error cleaning text: {e}")
            return text if text else ""
