"""
GLPI Universal Backend — FastAPI Application
Ponto de entrada principal.
"""


import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.session_manager import session_manager
from app.core.rate_limit import setup_rate_limiting
from app.core.database import close_all_db_connections
from app.services.charger_settings_store import initialize_local_state
from app.routers import (
    health, items, search,
    domain_auth, domain_formcreator,
    lookups, events,
    db_read, orchestrator, chargers,
    knowledge, admin, ticket_workflow, analytics, inventory
)
from app.core.database import local_engine
# Logging
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup e shutdown do app."""
    logger.info("=" * 60)
    logger.info("GLPI Universal Backend v0.2.0 iniciando...")
    logger.info("DTIC URL: %s", settings.dtic_glpi_url)
    logger.info("SIS  URL: %s", settings.sis_glpi_url)
    
    logger.info("Inicializando estado local SQLite em %s", settings.local_state_db_path)
    await initialize_local_state(local_engine)
    logger.info("Prewarm de caches admin (DTIC/SIS) iniciado...")
    try:
        await admin.prewarm_admin_runtime_caches(["dtic", "sis"])
    except Exception as prewarm_error:
        logger.warning("Prewarm de caches admin falhou: %s", prewarm_error)
    logger.info("=" * 60)
    yield
    # Shutdown: encerrar sessões
    logger.info("Encerrando sessões GLPI...")
    await session_manager.close_all()
    logger.info("Encerrando Conexões e Pools SQLAlchemy...")
    await close_all_db_connections()
    logger.info("GLPI Universal Backend finalizado.")


app = FastAPI(
    title="GLPI Universal Backend",
    description=(
        "Gateway/Middleware universal e agnóstico para GLPI. "
        "Suporta multi-instância (DTIC + SIS), CRUD universal, "
        "CQRS dinâmico (db_read), orquestração flexível e SSE."
    ),
    version="0.2.0",
    lifespan=lifespan,
)

# Setup Rate Limiting
setup_rate_limiting(app)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers (ORDEM IMPORTA: específicos antes do catch-all) ────────────
app.include_router(health.router)

# Capabilities Universais (novos)
app.include_router(db_read.router)            # /db/aggregate, /db/query, /db/kpis, /db/qa
app.include_router(orchestrator.router)        # /orchestrate (multi-step)
app.include_router(chargers.router)            # /chargers/kanban, etc.
app.include_router(chargers.metrics_router)    # /metrics/chargers (ranking, legado-compat)
app.include_router(analytics.router)           # /analytics/* (summary, trends, ranking, recent-activity)

# Auth e Lookups (já universais)
app.include_router(domain_auth.router)         # /auth/me, /auth/login, /auth/logout
app.include_router(lookups.router)             # /lookups/locations, /itilcategories, /users/technicians
app.include_router(domain_formcreator.router)  # /domain/formcreator (catálogo dinâmico)
app.include_router(admin.router)               # /admin/users (Painel/Matriz permissional)

# SSE
app.include_router(events.router)              # /events/stream

# Search (busca direta no banco MySQL)
app.include_router(search.router)              # /tickets/search
app.include_router(ticket_workflow.router)     # /tickets/{ticket_id}/detail + acoes

# Knowledge Base (leitura direta no banco — somente DTIC)
app.include_router(knowledge.router)           # /knowledge/articles, /knowledge/categories
app.include_router(inventory.router)           # /inventory/* (DTIC-only, read via DB / write via API)

# CRUD Genérico (catch-all — SEMPRE POR ÚLTIMO)
app.include_router(items.router)               # /{itemtype} (catch-all)


@app.get("/", tags=["Root"])
async def root():
    return {
        "name": "GLPI Universal Backend",
        "version": "0.2.0",
        "docs": "/docs",
        "health": "/health",
        "contexts": ["dtic", "sis"],
        "capabilities": {
            "crud": "/api/v1/{context}/{itemtype}",
            "search": "/api/v1/{context}/tickets/search?q={query}",
            "db_aggregate": "/api/v1/{context}/db/aggregate",
            "db_query": "/api/v1/{context}/db/query",
            "db_kpis": "/api/v1/{context}/db/kpis",
            "db_qa": "/api/v1/{context}/db/qa",
            "analytics_summary": "/api/v1/{context}/analytics/summary",
            "inventory_summary": "/api/v1/{context}/inventory/summary",
            "orchestrate": "/api/v1/{context}/orchestrate",
            "lookups": "/api/v1/{context}/lookups/{type}",
            "events_sse": "/api/v1/{context}/events/stream",
        },
    }
