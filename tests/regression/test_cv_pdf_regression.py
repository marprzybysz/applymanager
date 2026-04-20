from __future__ import annotations

from io import BytesIO

from fastapi import FastAPI
from fastapi.testclient import TestClient

from server.modules import cv as cv_module
from server.web import routes as web_routes


class _FakePage:
    def __init__(self, text: str) -> None:
        self._text = text

    def extract_text(self) -> str:
        return self._text


class _FakeReader:
    def __init__(self, stream: BytesIO) -> None:
        assert stream.read() == b"%PDF-fake%"
        self.pages = [
            _FakePage(
                "\n".join(
                    [
                        "Jan Kowalski",
                        "jan.kowalski@example.com",
                        "+48 600 700 800",
                        "https://www.linkedin.com/in/jan-kowalski",
                        "Umiejetnosci",
                        "Python, FastAPI, PostgreSQL",
                    ]
                )
            ),
            _FakePage("Doswiadczenie\nBackend Developer 2022-2026"),
        ]


def test_parse_pdf_document_collects_pages(monkeypatch) -> None:
    monkeypatch.setattr(cv_module, "PdfReader", _FakeReader)

    result = cv_module.parse_pdf_document(b"%PDF-fake%")

    assert result["ok"] is True
    assert result["pageCount"] == 2
    assert result["characters"] > 0
    assert "Jan Kowalski" in result["text"]
    assert result["pages"][0]["chars"] > 0
    assert result["profile"]["email"] == "jan.kowalski@example.com"
    assert result["profile"]["phone"] == "+48 600 700 800"
    assert "Python" in result["profile"]["skills"]
    assert result["profile"]["confidence"] > 0


def test_cv_parse_pdf_endpoint_validates_extension() -> None:
    app = FastAPI()
    app.include_router(web_routes.router)
    client = TestClient(app)

    response = client.post(
        "/api/cv/parse-pdf",
        files={"file": ("cv.txt", b"not-a-pdf", "text/plain")},
    )

    assert response.status_code == 400
    body = response.json()
    assert body["ok"] is False
    assert "only .pdf files are supported" in body["error"]


def test_extract_cv_profile_with_sections() -> None:
    text = "\n".join(
        [
            "Anna Nowak",
            "anna.nowak@example.com",
            "Portfolio: https://example.com",
            "Podsumowanie",
            "Programistka backendu z 5 latami doswiadczenia.",
            "Doswiadczenie",
            "Senior Python Developer",
            "Edukacja",
            "Politechnika Lodzka",
            "Umiejetnosci",
            "Python, FastAPI, Docker",
        ]
    )

    profile = cv_module._extract_cv_profile(text)

    assert profile["name"] == "Anna Nowak"
    assert profile["email"] == "anna.nowak@example.com"
    assert profile["portfolio"] == "https://example.com"
    assert profile["summary"] == "Programistka backendu z 5 latami doswiadczenia."
    assert profile["education"] == "Politechnika Lodzka"
    assert "FastAPI" in profile["skills"]


def test_extract_cv_profile_handles_spaced_letters_and_title() -> None:
    spaced_text = "a l e x . u s e r @ g m a i l . c o m\n6 0 0 7 0 0 8 0 0"
    profile = cv_module._extract_cv_profile(spaced_text, metadata_title="Alex User CV")

    assert profile["name"] == "Alex User"
    assert profile["email"] == "alex.user@gmail.com"
    assert profile["phone"] == "600700800"
