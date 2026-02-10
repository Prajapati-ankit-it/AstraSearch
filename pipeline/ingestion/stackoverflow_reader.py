import csv
import html
import logging
import re
from pathlib import Path
from typing import Dict, Iterator, List

logger = logging.getLogger(__name__)

# Precompiled regex (performance)
_HTML_TAG_RE = re.compile(r'<[^>]+>')
_WHITESPACE_RE = re.compile(r'\s+')


class StackOverflowReader:
    """
    StackOverflow CSV ingestion adapter.

    Responsibility:
    - Read CSV
    - Normalize into SearchDocument
    - Enforce SearchDocument contract
    """

    SOURCE = "stackoverflow"

    def _clean_html(self, html_content: str) -> str:
        if not html_content:
            return ""

        text = html.unescape(html_content)
        text = _HTML_TAG_RE.sub(" ", text)
        text = _WHITESPACE_RE.sub(" ", text)
        return text.strip()

    def _validate_search_document(self, doc: Dict) -> None:
        if not doc.get("id"):
            raise ValueError("Missing id")

        if not doc.get("text"):
            raise ValueError("Missing text")

        metadata = doc.get("metadata")
        if not metadata or not metadata.get("source"):
            raise ValueError("Missing metadata.source")

        if "signals" not in doc:
            raise ValueError("Missing signals")

    def to_search_document(self, row: Dict[str, str]) -> Dict:
        try:
            doc_id = row["Id"]
            raw_text = row.get("Body", "")
            score = row.get("Score", "0")

            text = self._clean_html(raw_text)
            if not text:
                text = "empty content"

            search_doc = {
                "id": f"stackoverflow:{doc_id}",
                "text": text,
                "metadata": {
                    "source": self.SOURCE,
                },
                "signals": {
                    "popularity": int(score) if score.lstrip("-").isdigit() else 0
                }
            }

            self._validate_search_document(search_doc)
            return search_doc

        except Exception as e:
            raise ValueError(f"Invalid StackOverflow row: {e}")

    def read_documents(
        self,
        dataset_path: str,
        max_rows: int = 20000
    ) -> Iterator[Dict]:

        with open(dataset_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)

            for i, row in enumerate(reader):
                if i >= max_rows:
                    break

                try:
                    yield self.to_search_document(row)
                except ValueError as e:
                    logger.debug(f"Skipping row {i}: {e}")

    def save_documents(self, documents: List[Dict], output_path: str) -> None:
        import json

        Path(output_path).parent.mkdir(parents=True, exist_ok=True)

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(documents, f, ensure_ascii=False, indent=2)

        logger.info(f"Saved {len(documents)} documents to {output_path}")
