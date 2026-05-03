from __future__ import annotations


class AppError(Exception):
    code: str = "APP_ERROR"
    status: int = 500

    def __init__(self, message: str, extra: dict | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.extra: dict = extra or {}


class ValidationError(AppError):
    code = "VALIDATION_ERROR"
    status = 400


class NotFoundError(AppError):
    code = "NOT_FOUND"
    status = 404


class RateLimitError(AppError):
    code = "RATE_LIMIT"
    status = 429


class ScraperError(AppError):
    code = "SCRAPER_ERROR"
    status = 422


class DBError(AppError):
    code = "DB_ERROR"
    status = 503
