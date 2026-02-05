import csv
import html
import logging
import yaml
from pathlib import Path
from typing import Dict, List, Optional, Iterator

logger = logging.getLogger(__name__)


class StackOverflowReader:
    def __init__(self, config_path: str):
        """Initialize reader with configuration."""
        self.config = self._load_config(config_path)
        self.field_mapping = self.config['fields']
        
    def _load_config(self, config_path: str) -> Dict:
        """Load configuration from YAML file."""
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                return yaml.safe_load(f)
        except Exception as e:
            logger.error(f"Failed to load config from {config_path}: {e}")
            raise
    
    def _clean_html(self, html_content: str) -> str:
        """Clean HTML content and decode entities."""
        if not html_content:
            return ""
        
        # Decode HTML entities
        content = html.unescape(html_content)
        
        # Remove HTML tags (simple approach)
        import re
        content = re.sub(r'<[^>]+>', ' ', content)
        
        # Remove extra whitespace
        content = re.sub(r'\s+', ' ', content).strip()
        
        return content
    
    def _extract_fields(self, row: Dict[str, str]) -> Optional[Dict]:
        """Extract and map fields from CSV row."""
        try:
            return {
                'answer_id': row[self.field_mapping['doc_id']],
                'question_id': row[self.field_mapping['parent_id']],
                'score': int(row[self.field_mapping['score']]),
                'solution': self._clean_html(row[self.field_mapping['content']])
            }
        except (KeyError, ValueError, TypeError) as e:
            logger.warning(f"Failed to extract fields from row: {e}")
            return None
    
    def read_documents(self, dataset_path: str, max_rows: int = 20000) -> Iterator[Dict]:
        """Stream documents from CSV dataset."""
        try:
            with open(dataset_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                
                for i, row in enumerate(reader):
                    if i >= max_rows:
                        break
                    
                    doc = self._extract_fields(row)
                    if doc:
                        doc['id'] = i  # Sequential internal ID
                        yield doc
                        
        except Exception as e:
            logger.error(f"Failed to read dataset {dataset_path}: {e}")
            raise
    
    def save_documents(self, documents: List[Dict], output_path: str):
        """Save processed documents to JSON file."""
        import json
        
        try:
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(documents, f, ensure_ascii=False, indent=2)
                
            logger.info(f"Saved {len(documents)} documents to {output_path}")
            
        except Exception as e:
            logger.error(f"Failed to save documents to {output_path}: {e}")
            raise
