import os
import fitz # PyMuPDF
import hashlib
import uuid
import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict

logger = logging.getLogger(__name__)

@dataclass
class ExtractedNode:
    node_id: str
    doc_id: str
    doc_type: str # specification, design, test_report
    section_path: str
    page: int
    bbox: List[float] # [x0, y0, x1, y1]
    content_type: str # text, table, figure
    raw_text: str
    ocr_confidence: float = 1.0

def compute_file_sha256(filepath: str) -> str:
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()

def extract_pdf_nodes(pdf_path: str, doc_id: str, doc_type: str) -> List[ExtractedNode]:
    """
    Parses a PDF into structured ExtractedNode objects.
    Extracts text blocks with coordinates, page numbers, and structural headings.
    Falls back to OCR if page has no native text.
    """
    nodes: List[ExtractedNode] = []
    
    if not os.path.exists(pdf_path):
        logger.error(f"File not found: {pdf_path}")
        return nodes
        
    try:
        doc = fitz.open(pdf_path)
    except Exception as e:
        logger.error(f"PyMuPDF failed to open {pdf_path}: {e}")
        return nodes
        
    for page_idx, page in enumerate(doc, start=1):
        blocks = page.get_text("blocks")
        page_has_text = False
        current_section = f"Page_{page_idx}"
        
        for b in blocks:
            # block format: (x0, y0, x1, y1, "text", block_no, block_type)
            if len(b) >= 7 and b[6] == 0: # 0 is text block
                text = b[4].strip()
                if not text:
                    continue
                page_has_text = True
                
                # Detect section headings (e.g. "1. Scope", "2. Requirements")
                lines = text.split("\n")
                first_line = lines[0].strip()
                if len(lines) > 0 and (first_line.startswith(("1.", "2.", "3.", "4.", "5.", "Section", "Chapter")) or first_line.isupper() and len(first_line) < 40):
                    current_section = first_line
                    
                node = ExtractedNode(
                    node_id=str(uuid.uuid4()),
                    doc_id=doc_id,
                    doc_type=doc_type,
                    section_path=current_section,
                    page=page_idx,
                    bbox=[round(b[0], 2), round(b[1], 2), round(b[2], 2), round(b[3], 2)],
                    content_type="text",
                    raw_text=text,
                    ocr_confidence=1.0
                )
                nodes.append(node)
                
        # If no text blocks on page, attempt OCR with pytesseract if available
        if not page_has_text:
            try:
                import pytesseract
                from PIL import Image
                import io
                
                pix = page.get_pixmap(dpi=150)
                img = Image.open(io.BytesIO(pix.tobytes("png")))
                ocr_text = pytesseract.image_to_string(img).strip()
                
                if ocr_text:
                    nodes.append(ExtractedNode(
                        node_id=str(uuid.uuid4()),
                        doc_id=doc_id,
                        doc_type=doc_type,
                        section_path=f"Page_{page_idx}_OCR",
                        page=page_idx,
                        bbox=[0.0, 0.0, float(page.rect.width), float(page.rect.height)],
                        content_type="text",
                        raw_text=ocr_text,
                        ocr_confidence=0.85
                    ))
            except Exception as ocr_err:
                logger.warning(f"OCR fallback unavailable or failed on page {page_idx}: {ocr_err}")
                
    doc.close()
    return nodes

