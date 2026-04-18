from __future__ import annotations

import io

from openpyxl import Workbook

from server.modules.offers import map_excel_row_to_offer, read_excel_rows_with_hyperlinks


def test_excel_import_does_not_return_formula_text() -> None:
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.title = "applications"
    worksheet.append(["Company", "Role"])
    worksheet["A2"] = "ACME"
    worksheet["B2"] = "=1+1"
    worksheet["B2"].hyperlink = "https://example.com/job"

    buf = io.BytesIO()
    workbook.save(buf)
    content = buf.getvalue()

    rows = read_excel_rows_with_hyperlinks(content)

    assert len(rows) == 1
    # For formula cells importer should not return raw '=...' expression.
    assert rows[0]["Role"] != "=1+1"
    assert rows[0]["__link__Role"] == "https://example.com/job"


def test_excel_import_uses_hyperlink_from_role_column_as_offer_url() -> None:
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.title = "applications"
    worksheet.append(["Firma", "Stanowisko", "Status", "Lokalizacja"])
    worksheet["A2"] = "ACME"
    worksheet["B2"] = "Python Developer"
    worksheet["B2"].hyperlink = "https://example.com/oferta/python-dev"
    worksheet["C2"] = "Wyslano"
    worksheet["D2"] = "Warszawa"

    buf = io.BytesIO()
    workbook.save(buf)
    content = buf.getvalue()

    rows = read_excel_rows_with_hyperlinks(content)
    mapped, issue = map_excel_row_to_offer(rows[0])

    assert issue is None
    assert mapped is not None
    assert mapped["role"] == "Python Developer"
    assert mapped["sourceUrl"] == "https://example.com/oferta/python-dev"


def test_excel_import_reads_separate_link_column_hyperlink() -> None:
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.title = "applications"
    worksheet.append(["Firma", "Stanowisko", "Status", "Lokalizacja", "Link"])
    worksheet["A2"] = "ACME"
    worksheet["B2"] = "Backend Developer"
    worksheet["C2"] = "Wyslano"
    worksheet["D2"] = "Warszawa"
    worksheet["E2"] = "Oferta"
    worksheet["E2"].hyperlink = "https://example.com/oferta/backend"

    buf = io.BytesIO()
    workbook.save(buf)
    content = buf.getvalue()

    rows = read_excel_rows_with_hyperlinks(content)
    mapped, issue = map_excel_row_to_offer(rows[0])

    assert issue is None
    assert mapped is not None
    assert mapped["role"] == "Backend Developer"
    assert mapped["sourceUrl"] == "https://example.com/oferta/backend"


def test_excel_import_reads_hyperlink_formula_from_role_cell() -> None:
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.title = "applications"
    worksheet.append(["Firma", "Stanowisko", "Status", "Lokalizacja"])
    worksheet["A2"] = "ACME"
    worksheet["B2"] = '=HYPERLINK("https://example.com/oferta/formula-role","Python Dev")'
    worksheet["C2"] = "Wyslano"
    worksheet["D2"] = "Warszawa"

    buf = io.BytesIO()
    workbook.save(buf)
    content = buf.getvalue()

    rows = read_excel_rows_with_hyperlinks(content)
    mapped, issue = map_excel_row_to_offer(rows[0])

    assert issue is None
    assert mapped is not None
    assert mapped["sourceUrl"] == "https://example.com/oferta/formula-role"
