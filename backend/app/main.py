import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware

from app.api import assistant, auth, expenses, summary
from app.config import get_settings
from app.errors import AppError
from app.logging_config import configure_logging
from app.rate_limit import limiter

logger = logging.getLogger(__name__)


class CatchAllMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except Exception:
            logger.exception("Unhandled error on %s %s", request.method, request.url.path)
            return JSONResponse(
                status_code=500,
                content={"detail": {"code": "internal_error", "message": "Something went wrong."}},
            )


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings.log_level)

    if settings.jwt_secret.get_secret_value().startswith("change-me"):
        logger.warning("JWT_SECRET is the placeholder value. Set a real secret before deploying.")

    app = FastAPI(title="Smart Expense Assistant", version="1.0.0")
    app.state.limiter = limiter

    # Added before CORS so it sits inside it: unexpected errors then still get CORS headers,
    # and the browser shows our message instead of a misleading "network error".
    app.add_middleware(CatchAllMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(AppError)
    async def handle_app_error(request: Request, exc: AppError) -> JSONResponse:
        if exc.status_code >= 500:
            logger.error(
                "%s %s -> %s %s", request.method, request.url.path, exc.status_code, exc.code
            )
        return JSONResponse(
            status_code=exc.status_code, content={"detail": exc.to_detail()}, headers=exc.headers
        )

    @app.exception_handler(RateLimitExceeded)
    async def handle_rate_limit(request: Request, exc: RateLimitExceeded) -> JSONResponse:
        return JSONResponse(
            status_code=429,
            content={
                "detail": {
                    "code": "rate_limited",
                    "message": "You're going a bit fast. Please wait a moment and try again.",
                }
            },
        )

    for module in (auth, expenses, summary, assistant):
        app.include_router(module.router)

    @app.get("/health", tags=["meta"])
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
