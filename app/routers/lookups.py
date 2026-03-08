from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.database import get_db
from app.core.rate_limit import limiter
from app.core.cache import identity_cache

router = APIRouter(prefix="/api/v1/{context}/lookups", tags=["Domain: Lookups & Arrays (CQRS)"])

@router.get("/locations", operation_id="getLocations")
@limiter.limit("200/minute")
async def get_locations(
    request: Request,
    context: str,
    db: AsyncSession = Depends(get_db),
    tree_root: Optional[int] = Query(None, description="ID do nó raiz para filtrar sub-árvore")
):
    """[CQRS Cacheable] Retorna tabela chave-valor de Locations, filtrável por sub-árvore."""
    cache_key = f"lookup_locations_{context}_{tree_root or 'all'}"
    
    async def fetch_db():
        if tree_root and tree_root > 0:
            # Busca o completename do nó raiz, depois filtra descendentes
            root_q = text("SELECT completename FROM glpi_locations WHERE id = :rid")
            root_res = await db.execute(root_q, {"rid": tree_root})
            root_row = root_res.mappings().first()
            if root_row:
                prefix = root_row["completename"]
                query = text("""
                    SELECT id, name, completename 
                    FROM glpi_locations 
                    WHERE completename LIKE :prefix
                    ORDER BY completename ASC
                """)
                result = await db.execute(query, {"prefix": f"{prefix}%"})
            else:
                result = await db.execute(text("SELECT id, name, completename FROM glpi_locations ORDER BY completename ASC"))
        else:
            result = await db.execute(text("SELECT id, name, completename FROM glpi_locations ORDER BY completename ASC"))
        rows = result.mappings().all()
        return [dict(r) for r in rows]
        
    try:
        data = await identity_cache.get_or_set(cache_key, fetch_db)
        return {"context": context, "locations": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error on locations lookup: {str(e)}")

@router.get("/itilcategories", operation_id="getItilCategories")
@limiter.limit("200/minute")
async def get_itilcategories(
    request: Request,
    context: str,
    db: AsyncSession = Depends(get_db),
    tree_root: Optional[int] = Query(None, description="ID do nó raiz para filtrar sub-árvore")
):
    """[CQRS Cacheable] Retorna Categorias de Serviço, filtrável por sub-árvore."""
    cache_key = f"lookup_itilcategories_{context}_{tree_root or 'all'}"
    
    async def fetch_db():
        if tree_root and tree_root > 0:
            root_q = text("SELECT completename FROM glpi_itilcategories WHERE id = :rid")
            root_res = await db.execute(root_q, {"rid": tree_root})
            root_row = root_res.mappings().first()
            if root_row:
                prefix = root_row["completename"]
                query = text("""
                    SELECT id, name, completename 
                    FROM glpi_itilcategories 
                    WHERE completename LIKE :prefix
                    ORDER BY completename ASC
                """)
                result = await db.execute(query, {"prefix": f"{prefix}%"})
            else:
                result = await db.execute(text("SELECT id, name, completename FROM glpi_itilcategories ORDER BY completename ASC"))
        else:
            result = await db.execute(text("SELECT id, name, completename FROM glpi_itilcategories ORDER BY completename ASC"))
        rows = result.mappings().all()
        return [dict(r) for r in rows]
        
    try:
        data = await identity_cache.get_or_set(cache_key, fetch_db)
        return {"context": context, "categories": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error on itilcategories lookup: {str(e)}")

@router.get("/users/technicians", operation_id="getTechnicians")
@limiter.limit("100/minute")
async def get_technicians(request: Request, context: str, db: AsyncSession = Depends(get_db)):
    """[CQRS Cacheable] Retorna Técnicos Elegíveis (Profile Tech, Admin, Super-Admin)"""
    cache_key = f"lookup_techs_{context}"
    
    async def fetch_db():
        query = text("""
            SELECT DISTINCT
                u.id, 
                u.realname, 
                u.firstname,
                u.name as login
            FROM glpi_users u
            INNER JOIN glpi_profiles_users pu ON pu.users_id = u.id
            WHERE pu.profiles_id IN (3, 4, 6) 
              AND u.is_deleted = 0 
              AND u.is_active = 1
            ORDER BY u.firstname ASC, u.realname ASC
        """)
        result = await db.execute(query)
        rows = result.mappings().all()
        
        techs = []
        for r in rows:
            name_parts = [p for p in [r['firstname'], r['realname']] if p]
            full_name = " ".join(name_parts) if name_parts else r['login']
            techs.append({
                "id": r['id'],
                "name": full_name,
                "login": r['login']
            })
        return techs
        
    try:
        data = await identity_cache.get_or_set(cache_key, fetch_db)
        return {"context": context, "technicians": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error on technicians lookup: {str(e)}")
