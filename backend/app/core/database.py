from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.core.context_registry import registry

# Engine pools per context
_engines = {}
_session_makers = {}

# Local SQLite Engine for Domain State (Chargers, Audit, etc.)
local_engine = create_async_engine(
    f"sqlite+aiosqlite:///{settings.local_state_db_path}",
    connect_args={"check_same_thread": False},
    pool_pre_ping=True,
)
local_session_maker = sessionmaker(
    local_engine, class_=AsyncSession, expire_on_commit=False
)

def _init_engines():
    for ctx in registry.list_parents():
        dsn = f"mysql+aiomysql://{ctx.db_user}:{ctx.db_pass}@{ctx.db_host}:{ctx.db_port}/{ctx.db_name}"
        _engines[ctx.id] = create_async_engine(
            dsn,
            pool_size=5,
            max_overflow=10,
            pool_recycle=3600,
            echo=False
        )
        _session_makers[ctx.id] = sessionmaker(
            _engines[ctx.id], class_=AsyncSession, expire_on_commit=False
        )

# Inicializa ao carregar o módulo
_init_engines()

async def get_db(context: str = "dtic") -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency injection handler to provide an active Read-Only AsyncSession 
    to the correct database instance based on the context parameter.
    Sub-contextos SIS (sis-manutencao, sis-memoria) são normalizados para seus parents.
    """
    ctx = registry.get_base_context(context)
    if ctx not in _session_makers:
        raise ValueError(f"Context '{context}' (base '{ctx}') not configured for database connections.")
        
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
