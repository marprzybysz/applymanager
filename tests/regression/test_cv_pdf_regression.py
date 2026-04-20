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
        self.pages = [_FakePage("  Jan   Kowalski  "), _FakePage("Python  FastAPI")]


def test_parse_pdf_document_collects_pages(monkeypatch) -> None:
    monkeypatch.setattr(cv_module, "PdfReader", _FakeReader)

    result = cv_module.parse_pdf_document(b"%PDF-fake%")

    assert result["ok"] is True
    assert result["pageCount"] == 2
    assert result["characters"] > 0
    assert "Jan Kowalski" in result["text"]
    assert result["pages"][0]["chars"] > 0


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
