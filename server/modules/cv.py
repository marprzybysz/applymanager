from __future__ import annotations

import io
from typing import Any

try:
    from pypdf import PdfReader
except Exception:  # pragma: no cover - handled at runtime if dependency is missing
    PdfReader = None  # type: ignore[assignment]


def _normalize_pdf_text(value: str | None) -> str:
    return " ".join((value or "").split())


def parse_pdf_document(content: bytes, *, max_chars: int = 20000) -> dict[str, Any]:
    if not content:
        raise ValueError("empty pdf payload")
    if PdfReader is None:
        raise RuntimeError("PDF parser dependency is missing (pypdf)")

    reader = PdfReader(io.BytesIO(content))
    pages_preview: list[dict[str, Any]] = []
    all_text_parts: list[str] = []

    for index, page in enumerate(reader.pages, start=1):
        page_text = _normalize_pdf_text(page.extract_text())
        if page_text:
            all_text_parts.append(page_text)
        pages_preview.append(
            {
                "page": index,
                "chars": len(page_text),
                "text": page_text[:2000],
            }
        )

    full_text = "\n".join(all_text_parts).strip()
    if max_chars > 0:
        full_text = full_text[:max_chars]

    return {
        "ok": True,
        "pageCount": len(reader.pages),
        "characters": len(full_text),
        "text": full_text,
        "pages": pages_preview,
    }
