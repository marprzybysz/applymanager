from __future__ import annotations

import io
import re
from typing import Any

try:
    from pypdf import PdfReader
except Exception:  # pragma: no cover - handled at runtime if dependency is missing
    PdfReader = None  # type: ignore[assignment]


def _normalize_pdf_text(value: str | None) -> str:
    lines = [" ".join(line.split()) for line in (value or "").splitlines()]
    return "\n".join(line for line in lines if line)


def _compact_spaced_letters(value: str) -> str:
    compact = value
    # Turn patterns like "m a i l" or "7 2 5 2 2 5" into "mail"/"725225".
    spaced_token = r"[A-Za-z0-9ĄĆĘŁŃÓŚŹŻąćęłńóśźż]"
    pattern = rf"(?:{spaced_token}\s+){{2,}}{spaced_token}"

    def repl(match: re.Match[str]) -> str:
        return re.sub(r"\s+", "", match.group(0))

    compact = re.sub(pattern, repl, compact)
    compact = re.sub(r"[ \t]+", " ", compact)
    return compact.strip()


def _extract_urls_from_pdf_page(page: Any) -> list[str]:
    urls: list[str] = []
    try:
        annotations = page.get("/Annots")
    except Exception:
        annotations = None
    if not annotations:
        return urls

    for annotation in annotations:
        try:
            obj = annotation.get_object()
            action = obj.get("/A")
            if not action:
                continue
            uri = action.get("/URI")
            if isinstance(uri, str) and uri.startswith(("http://", "https://")):
                urls.append(uri.strip())
        except Exception:
            continue
    return urls


def _extract_name_from_title(title: str | None) -> str | None:
    if not title:
        return None
    normalized = " ".join(title.split())
    matched = re.search(r"([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+(?:\s+[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+){1,2})", normalized)
    if not matched:
        return None
    return matched.group(1)


CV_SECTION_ALIASES: dict[str, tuple[str, ...]] = {
    "summary": (
        "podsumowanie",
        "o mnie",
        "about me",
        "profil",
    ),
    "experience": (
        "doświadczenie",
        "doswiadczenie",
        "experience",
        "employment history",
    ),
    "education": (
        "edukacja",
        "education",
        "wykształcenie",
        "wyksztalcenie",
    ),
    "skills": (
        "umiejętności",
        "umiejetnosci",
        "skills",
        "tech stack",
        "technologie",
    ),
    "languages": (
        "języki",
        "jezyki",
        "languages",
    ),
    "projects": (
        "projekty",
        "projects",
    ),
}


def _extract_first_match(text: str, pattern: str, *, flags: int = 0) -> str | None:
    matched = re.search(pattern, text, flags)
    if not matched:
        return None
    return " ".join(matched.group(1).split()).strip() or None


def _extract_section_blocks(text: str) -> dict[str, str]:
    lines = [line.strip() for line in text.splitlines()]
    lines = [line for line in lines if line]
    if not lines:
        return {}

    normalized_to_key: dict[str, str] = {}
    for key, aliases in CV_SECTION_ALIASES.items():
        for alias in aliases:
            normalized_to_key[alias.lower()] = key

    section_starts: list[tuple[int, str]] = []
    for index, line in enumerate(lines):
        normalized = line.lower().rstrip(":")
        if normalized in normalized_to_key:
            section_starts.append((index, normalized_to_key[normalized]))

    sections: dict[str, str] = {}
    for idx, (line_index, section_key) in enumerate(section_starts):
        next_start = section_starts[idx + 1][0] if idx + 1 < len(section_starts) else len(lines)
        section_text = " ".join(lines[line_index + 1 : next_start]).strip()
        if section_text and section_key not in sections:
            sections[section_key] = section_text
    return sections


def _extract_skills(text: str, sections: dict[str, str]) -> list[str]:
    candidate = sections.get("skills") or ""
    chunks = re.split(r"[,\n;/|]+", candidate)
    skills: list[str] = []
    seen: set[str] = set()
    for chunk in chunks:
        value = " ".join(chunk.split()).strip(" -•\t")
        if len(value) < 2 or len(value) > 48:
            continue
        lowered = value.lower()
        if lowered in seen:
            continue
        seen.add(lowered)
        skills.append(value)
        if len(skills) >= 30:
            break
    if skills:
        return skills

    known_skills = [
        "python",
        "fastapi",
        "javascript",
        "typescript",
        "react",
        "sql",
        "postgresql",
        "excel",
        "docker",
        "git",
        "erp",
        "power bi",
        "powerbi",
    ]
    compact_lower = _compact_spaced_letters(text).lower()
    for keyword in known_skills:
        if keyword in compact_lower:
            normalized = "Power BI" if keyword in ("power bi", "powerbi") else keyword.upper() if keyword == "sql" else keyword.title()
            if normalized.lower() not in seen:
                seen.add(normalized.lower())
                skills.append(normalized)
    return skills


def _extract_cv_profile(text: str, *, metadata_title: str | None = None, urls: list[str] | None = None) -> dict[str, Any]:
    normalized_text = text.strip()
    compact_text = _compact_spaced_letters(normalized_text)
    squashed_text = re.sub(r"\s+", "", normalized_text)
    sections = _extract_section_blocks(normalized_text)
    urls = urls or []

    email = _extract_first_match(
        squashed_text,
        r"([A-Za-z][A-Za-z0-9._%+-]*@[A-Za-z0-9.-]+\.(?:com|pl|org|net|io|eu|edu))(?=[^A-Za-z]|[A-Z]|$)",
    )
    phone = _extract_first_match(
        compact_text,
        r"((?:\+?\d{1,3}[ -]?)?(?:\d[ -]?){8,14}\d)",
        flags=re.IGNORECASE,
    )
    linkedin = next((url for url in urls if "linkedin.com/" in url.lower()), None) or _extract_first_match(
        compact_text,
        r"(https?://(?:www\.)?linkedin\.com/[^\s)]+)",
        flags=re.IGNORECASE,
    )
    github = next((url for url in urls if "github.com/" in url.lower()), None) or _extract_first_match(
        compact_text,
        r"(https?://(?:www\.)?github\.com/[^\s)]+)",
        flags=re.IGNORECASE,
    )
    portfolio = next((url for url in urls if "linkedin.com/" not in url.lower() and "github.com/" not in url.lower()), None)
    if not portfolio:
        portfolio = _extract_first_match(
            compact_text,
            r"(https?://[^\s)]+)",
            flags=re.IGNORECASE,
        )

    first_line = next((line.strip() for line in normalized_text.splitlines() if line.strip()), "")
    name = None
    if first_line and len(first_line.split()) in (2, 3):
        looks_like_name = all(part[:1].isalpha() and part[:1].upper() == part[:1] for part in first_line.split())
        if looks_like_name:
            name = first_line
    if not name:
        name = _extract_name_from_title(metadata_title)

    summary = sections.get("summary")
    if not summary:
        summary = _extract_first_match(
            normalized_text,
            r"(?:podsumowanie|o mnie|about me|profil)\s*:?(.{40,500})",
            flags=re.IGNORECASE | re.DOTALL,
        )

    profile = {
        "name": name,
        "email": email,
        "phone": phone,
        "linkedin": linkedin,
        "github": github,
        "portfolio": portfolio,
        "summary": summary,
        "experience": sections.get("experience"),
        "education": sections.get("education"),
        "languages": sections.get("languages"),
        "projects": sections.get("projects"),
        "skills": _extract_skills(compact_text, sections),
    }

    non_empty_fields = sum(1 for value in profile.values() if value not in (None, "", []))
    profile["confidence"] = round(min(1.0, non_empty_fields / 10), 2)
    return profile


def parse_pdf_document(content: bytes, *, max_chars: int = 20000) -> dict[str, Any]:
    if not content:
        raise ValueError("empty pdf payload")
    if PdfReader is None:
        raise RuntimeError("PDF parser dependency is missing (pypdf)")

    reader = PdfReader(io.BytesIO(content))
    pages_preview: list[dict[str, Any]] = []
    all_text_parts: list[str] = []
    all_urls: list[str] = []

    for index, page in enumerate(reader.pages, start=1):
        page_text = _normalize_pdf_text(page.extract_text())
        if page_text:
            all_text_parts.append(page_text)
        all_urls.extend(_extract_urls_from_pdf_page(page))
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
    metadata = getattr(reader, "metadata", None)
    metadata_title = getattr(metadata, "title", None) if metadata is not None else None

    return {
        "ok": True,
        "pageCount": len(reader.pages),
        "characters": len(full_text),
        "text": full_text,
        "pages": pages_preview,
        "profile": _extract_cv_profile(full_text, metadata_title=metadata_title, urls=all_urls),
        "links": sorted(set(all_urls)),
    }
