"""
FlexiTaka Backend FastAPI Application Factory.
Authoritative API service for Web, Mobile App, and Admin Panel.
Domain: https://flexitaka.online/api/v1
"""

import time
import uuid
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from bson import ObjectId
from fastapi import FastAPI, Request, status
from fastapi.encoders import ENCODERS_BY_TYPE
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Teach FastAPI to serialize MongoDB ObjectIds automatically
ENCODERS_BY_TYPE[ObjectId] = str
from app.api.v1.router import api_v1_router
from app.core.config import settings
from app.core.exceptions import FlexiTakaException
from app.core.logging import logger
from app.db.indexes import ensure_indexes
from app.db.mongodb import close_mongo_connection, connect_to_mongo, get_database
from app.db.redis import close_redis_connection, connect_to_redis


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("Initializing FlexiTaka Backend API...")
    await connect_to_mongo()
    await connect_to_redis()
    db = get_database()
    await ensure_indexes(db)
    logger.info("FlexiTaka Backend API startup complete. Ready for traffic.")
    yield
    logger.info("Shutting down FlexiTaka Backend API...")
    await close_redis_connection()
    await close_mongo_connection()
    logger.info("Shutdown complete.")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="FlexiTaka Authoritative Backend & REST API",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/api/v1/openapi.json",
    lifespan=lifespan
)

# CORS Configuration - strictly allow customer website and approved origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "Idempotency-Key"]
)


# Request Tracing Middleware
@app.middleware("http")
async def request_tracing_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    request.state.request_id = request_id

    start_time = time.time()
    try:
        response = await call_next(request)
        latency_ms = round((time.time() - start_time) * 1000, 2)
        response.headers["X-Request-ID"] = request_id
        return response
    except Exception as exc:
        latency_ms = round((time.time() - start_time) * 1000, 2)
        logger.error(
            "Unhandled exception on %s %s: %s",
            request.method, request.url.path, exc,
            extra={"request_id": request_id, "latency_ms": latency_ms},
            exc_info=True
        )
        raise exc


# Custom Exception Handlers
@app.exception_handler(FlexiTakaException)
async def flexitaka_exception_handler(request: Request, exc: FlexiTakaException):
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details
            },
            "request_id": request_id
        },
        headers={"X-Request-ID": request_id}
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    errors = []
    for err in exc.errors():
        loc = ".".join(str(x) for x in err.get("loc", []))
        errors.append({"field": loc, "message": err.get("msg")})

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid request payload",
                "details": errors
            },
            "request_id": request_id
        },
        headers={"X-Request-ID": request_id}
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    logger.error("Unhandled internal server error: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred. Please contact support."
            },
            "request_id": request_id
        },
        headers={"X-Request-ID": request_id}
    )


# Health & Metadata Endpoints
@app.get("/health", tags=["Health"])
@app.get("/api/v1/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "api_base": settings.PUBLIC_API_BASE_URL,
        "customer_website": settings.CUSTOMER_WEBSITE_URL
    }


@app.get("/", tags=["Root"])
async def root():
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "api_docs": "/docs",
        "api_prefix": settings.API_V1_PREFIX,
        "notice": "This is the backend API infrastructure (https://flexitaka.online). For the public customer website, visit https://flexitaka.com"
    }


# Mount API v1 router
app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)
