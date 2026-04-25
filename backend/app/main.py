"""
Hub Operacional Backend
Aplicacao FastAPI minima para o nucleo DTIC + SIS.
"""

from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.database import close_all_db_connections
from app.core.rate_limit import setup_rate_limiting
from app.routers import db_read, domain_auth, domain_formcreator, events, health, lookups, ticket_workflow


logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=" * 60)
    logger.info("Hub Operacional Backend iniciando...")
    logger.info("DTIC URL: %s", settings.dtic_glpi_url)
    logger.info("SIS  URL: %s", settings.sis_glpi_url)
    logger.info("=" * 60)
    yield
    logger.info("Encerrando pools SQLAlchemy...")
    await close_all_db_connections()
    logger.info("Hub Operacional Backend finalizado.")


app = FastAPI(
    title="Hub Operacional Backend",
    description="Nucleo minimo do hub operacional para DTIC e SIS.",
    version="0.1.0",
    lifespan=lifespan,
)

setup_rate_limiting(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(domain_auth.router)
app.include_router(lookups.router)
app.include_router(domain_formcreator.router)
app.include_router(db_read.router)
app.include_router(ticket_workflow.router)
app.include_router(events.router)


@app.get("/", tags=["Root"])
async def root():
    return {
        "name": "Hub Operacional Backend",
        "version": "0.1.0",
        "health": "/health",
        "contexts": ["dtic", "sis"],
        "routes": {
            "auth": "/api/v1/{context}/auth",
            "lookups": "/api/v1/{context}/lookups/{type}",
            "formcreator": "/api/v1/{context}/domain/formcreator",
            "stats": "/api/v1/{context}/db/stats",
            "tickets": "/api/v1/{context}/db/tickets",
            "ticket_detail": "/api/v1/{context}/tickets/{ticket_id}/detail",
        },
    }
