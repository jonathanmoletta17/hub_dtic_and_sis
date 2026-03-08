from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import settings

# Engine pools per context
_engines = {}
_session_makers = {}

# Local SQLite Engine for Domain State (Chargers, Audit, etc.)
local_engine = create_async_engine(
    "sqlite+aiosqlite:///auth.db",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
local_session_maker = sessionmaker(
    local_engine, class_=AsyncSession, expire_on_commit=False
)

def _init_engines():
    # DTIC Engine
    dtic_conf = settings.get_db_config("dtic")
    _engines["dtic"] = create_async_engine(
        dtic_conf.dsn,
        pool_size=5,
        max_overflow=10,
        pool_recycle=3600,
        echo=False
    )
    _session_makers["dtic"] = sessionmaker(
        _engines["dtic"], class_=AsyncSession, expire_on_commit=False
    )
    
    # SIS Engine
    sis_conf = settings.get_db_config("sis")
    _engines["sis"] = create_async_engine(
        sis_conf.dsn,
        pool_size=5,
        max_overflow=10,
        pool_recycle=3600,
        echo=False
    )
    _session_makers["sis"] = sessionmaker(
        _engines["sis"], class_=AsyncSession, expire_on_commit=False
    )

# Inicializa ao carregar o módulo
_init_engines()

async def get_db(context: str = "dtic") -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency injection handler to provide an active Read-Only AsyncSession 
    to the correct database instance based on the context parameter.
    Sub-contextos SIS (sis-manutencao, sis-memoria) são normalizados para 'sis'.
    """
    ctx = context.lower()
    # Normalizar sub-contextos SIS → 'sis' (compartilham mesma instância DB)
    if ctx.startswith("sis"):
        ctx = "sis"
    if ctx not in _session_makers:
        raise ValueError(f"Context '{context}' not configured for database connections.")
        
    async_session_maker = _session_makers[ctx]
    
    async with async_session_maker() as session:
        yield session

async def get_local_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency injection para o banco SQLite local."""
    async with local_session_maker() as session:
        yield session

async def close_all_db_connections():
    """Fechamento graceful dos connection pools ao desligar o app"""
    for engine in _engines.values():
        await engine.dispose()
    await local_engine.dispose()
