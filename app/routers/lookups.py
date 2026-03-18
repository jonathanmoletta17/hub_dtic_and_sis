from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.database import get_db
from app.core.rate_limit import limiter
from app.core.cache import identity_cache
from app.core.auth_guard import verify_session
from app.schemas.lookup_schemas import (
    CategoriesResponse,
    GroupsResponse,
    LocationsResponse,
    ManufacturersResponse,
    ModelsResponse,
    StatesResponse,
    TechniciansResponse,
    UsersResponse,
)

router = APIRouter(prefix="/api/v1/{context}/lookups", tags=["Domain: Lookups & Arrays (CQRS)"], dependencies=[Depends(verify_session)])

MODEL_TABLES = {
    "Computer": "glpi_computermodels",
    "Monitor": "glpi_monitormodels",
    "Printer": "glpi_printermodels",
    "NetworkEquipment": "glpi_networkequipmentmodels",
    "Peripheral": "glpi_peripheralmodels",
    "Phone": "glpi_phonemodels",
}


def _named_option_sql(table_name: str) -> str:
    return (
        "SELECT id, "
        "COALESCE(NULLIF(TRIM(name), ''), CONCAT('Sem nome (#', id, ')')) AS name "
        f"FROM {table_name} "
        "ORDER BY name ASC, id ASC"
    )

@router.get("/locations", response_model=LocationsResponse, operation_id="getLocations")
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

@router.get("/itilcategories", response_model=CategoriesResponse, operation_id="getItilCategories")
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

@router.get("/users/technicians", response_model=TechniciansResponse, operation_id="getTechnicians")
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


@router.get("/users/responsible", response_model=UsersResponse, operation_id="getResponsibleUsers")
@limiter.limit("100/minute")
async def get_responsible_users(request: Request, context: str, db: AsyncSession = Depends(get_db)):
    """[CQRS Cacheable] Retorna usuarios ativos elegiveis para responsabilidade patrimonial."""
    cache_key = f"lookup_users_responsible_{context}"

    async def fetch_db():
        query = text("""
            SELECT DISTINCT
                u.id,
                u.realname,
                u.firstname,
                u.name AS login
            FROM glpi_users u
            WHERE u.is_deleted = 0
              AND u.is_active = 1
            ORDER BY u.firstname ASC, u.realname ASC, u.name ASC
        """)
        result = await db.execute(query)
        rows = result.mappings().all()

        users = []
        for r in rows:
            name_parts = [p for p in [r["firstname"], r["realname"]] if p]
            full_name = " ".join(name_parts) if name_parts else r["login"]
            users.append({
                "id": r["id"],
                "name": full_name,
                "login": r["login"],
            })
        return users

    try:
        data = await identity_cache.get_or_set(cache_key, fetch_db)
        return {"context": context, "users": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error on users lookup: {str(e)}")


@router.get("/states", response_model=StatesResponse, operation_id="getInventoryStates")
@limiter.limit("200/minute")
async def get_states(request: Request, context: str, db: AsyncSession = Depends(get_db)):
    cache_key = f"lookup_states_{context}"

    async def fetch_db():
        result = await db.execute(text(_named_option_sql("glpi_states")))
        rows = result.mappings().all()
        return [dict(r) for r in rows]

    try:
        data = await identity_cache.get_or_set(cache_key, fetch_db)
        return {"context": context, "states": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error on states lookup: {str(e)}")


@router.get("/manufacturers", response_model=ManufacturersResponse, operation_id="getManufacturers")
@limiter.limit("200/minute")
async def get_manufacturers(request: Request, context: str, db: AsyncSession = Depends(get_db)):
    cache_key = f"lookup_manufacturers_{context}"

    async def fetch_db():
        result = await db.execute(text(_named_option_sql("glpi_manufacturers")))
        rows = result.mappings().all()
        return [dict(r) for r in rows]

    try:
        data = await identity_cache.get_or_set(cache_key, fetch_db)
        return {"context": context, "manufacturers": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error on manufacturers lookup: {str(e)}")


@router.get("/groups/responsible", response_model=GroupsResponse, operation_id="getResponsibleGroups")
@limiter.limit("200/minute")
async def get_responsible_groups(request: Request, context: str, db: AsyncSession = Depends(get_db)):
    cache_key = f"lookup_groups_responsible_{context}"

    async def fetch_db():
        result = await db.execute(text("""
            SELECT id, name, completename
            FROM glpi_groups
            WHERE is_assign = 1
            ORDER BY completename ASC, id ASC
        """))
        rows = result.mappings().all()
        return [dict(r) for r in rows]

    try:
        data = await identity_cache.get_or_set(cache_key, fetch_db)
        return {"context": context, "groups": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error on groups lookup: {str(e)}")


@router.get("/models", response_model=ModelsResponse, operation_id="getModelsByItemtype")
@limiter.limit("200/minute")
async def get_models(
    request: Request,
    context: str,
    itemtype: str = Query(..., description="ItemType alvo do lookup de modelos"),
    db: AsyncSession = Depends(get_db),
):
    model_table = MODEL_TABLES.get(itemtype)
    if not model_table:
        raise HTTPException(status_code=400, detail=f"ItemType nao suportado para lookup de modelos: {itemtype}")

    cache_key = f"lookup_models_{context}_{itemtype}"

    async def fetch_db():
        result = await db.execute(text(_named_option_sql(model_table)))
        rows = result.mappings().all()
        return [dict(r) for r in rows]

    try:
        data = await identity_cache.get_or_set(cache_key, fetch_db)
        return {"context": context, "itemtype": itemtype, "models": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error on models lookup: {str(e)}")
