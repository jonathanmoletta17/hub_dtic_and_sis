import re
import logging
from typing import Any, Optional, List, Dict
from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

# ─── Whitelist de Segurança ──────────────────────────────────────────────
ALLOWED_TABLES = {
    "glpi_tickets", "glpi_users", "glpi_groups", "glpi_locations",
    "glpi_itilcategories", "glpi_tickets_users", "glpi_groups_tickets",
    "glpi_items_tickets", "glpi_tickettasks", "glpi_itilsolutions",
    "glpi_logs", "glpi_entities", "glpi_states",
    "glpi_plugin_genericobject_carregadors",
    "glpi_profiles_users", "glpi_plugin_formcreator_categories",
    "glpi_plugin_formcreator_forms", "glpi_plugin_formcreator_sections",
    "glpi_plugin_formcreator_questions",
    "glpi_knowbaseitems", "glpi_knowbaseitemcategories", "glpi_knowbaseitems_knowbaseitemcategories"
}

# Regex para validar nomes de colunas (previne injection)
_SAFE_IDENTIFIER = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_.]*$")


def validate_identifier(name: str, label: str = "identifier") -> str:
    """Valida que um identificador SQL é seguro."""
    if not _SAFE_IDENTIFIER.match(name):
        raise HTTPException(status_code=400, detail=f"Invalid {label}: '{name}'")
    return name


def validate_table(table: str) -> str:
    """Valida que a tabela está na whitelist."""
    if table not in ALLOWED_TABLES:
        raise HTTPException(
            status_code=403,
            detail=f"Table '{table}' not in allowed list."
        )
    return table


def build_where_clause(filters: Dict[str, Any], params: Dict, alias: str = "") -> str:
    """
    Constrói cláusula WHERE dinâmica a partir de filtros.
    """
    clauses = []
    prefix = f"{alias}." if alias else ""
    for i, (key, value) in enumerate(filters.items()):
        col = validate_identifier(key, "filter column")
        param_name = f"f_{i}"
        if isinstance(value, list):
            placeholders = ", ".join(f":f_{i}_{j}" for j in range(len(value)))
            clauses.append(f"{prefix}{col} IN ({placeholders})")
            for j, v in enumerate(value):
                params[f"f_{i}_{j}"] = v
        elif value is None:
            clauses.append(f"{prefix}{col} IS NULL")
        else:
            clauses.append(f"{prefix}{col} = :{param_name}")
            params[param_name] = value
    return " AND ".join(clauses) if clauses else "1=1"


async def run_aggregate(
    db: AsyncSession,
    table: str,
    group_by: str,
    agg_function: str = "count",
    agg_column: str = "id",
    status: Optional[str] = None,
    is_deleted: int = 0,
    group_ids: Optional[str] = None,
    date_field: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 50,
) -> List[Dict[str, Any]]:
    """
    Executa agregação dinâmica no banco de dados.
    """
    validate_table(table)
    validate_identifier(group_by, "group_by")
    validate_identifier(agg_column, "agg_column")

    params: Dict[str, Any] = {}
    where_parts = [f"{'t.' if group_ids else ''}is_deleted = :is_del"]
    params["is_del"] = is_deleted

    if status:
        status_list = [int(s.strip()) for s in status.split(",")]
        placeholders = ", ".join(f":st_{i}" for i in range(len(status_list)))
        where_parts.append(f"{'t.' if group_ids else ''}status IN ({placeholders})")
        for i, s in enumerate(status_list):
            params[f"st_{i}"] = s

    join_sql = ""
    if group_ids:
        gids = [int(g.strip()) for g in group_ids.split(",")]
        placeholders = ", ".join(f":g_{i}" for i in range(len(gids)))
        join_sql = f"JOIN glpi_groups_tickets gt ON gt.tickets_id = t.id AND gt.type = 2"
        where_parts.append(f"gt.groups_id IN ({placeholders})")
        for i, g in enumerate(gids):
            params[f"g_{i}"] = g

    if date_field and date_from:
        validate_identifier(date_field, "date_field")
        where_parts.append(f"{'t.' if group_ids else ''}{date_field} >= :d_from")
        params["d_from"] = date_from
    if date_field and date_to:
        where_parts.append(f"{'t.' if group_ids else ''}{date_field} <= :d_to")
        params["d_to"] = date_to

    where_sql = " AND ".join(where_parts)
    
    sql = f"""
        SELECT {group_by}, {agg_function.upper()}({agg_column}) as agg_value
        FROM {table} {'t' if group_ids else ''}
        {join_sql}
        WHERE {where_sql}
        GROUP BY {group_by}
        ORDER BY agg_value DESC
        LIMIT :lim
    """
    params["lim"] = limit

    result = await db.execute(text(sql), params)
    return [dict(r) for r in result.mappings().all()]


async def run_dynamic_query(
    db: AsyncSession,
    table: str,
    columns: str = "*",
    join_table: Optional[str] = None,
    join_on: Optional[str] = None,
    join_table2: Optional[str] = None,
    join_on2: Optional[str] = None,
    status: Optional[str] = None,
    is_deleted: Optional[int] = None,
    group_by: Optional[str] = None,
    order_by: Optional[str] = None,
    limit: int = 100,
) -> List[Dict[str, Any]]:
    """
    Executa query dinâmica parametrizada.
    """
    validate_table(table)
    
    col_list = [validate_identifier(c.strip(), "column") for c in columns.split(",")]
    cols_sql = ", ".join(col_list)

    params: Dict[str, Any] = {}
    where_parts = []
    joins_sql = ""

    if is_deleted is not None:
        where_parts.append(f"t.is_deleted = :is_del")
        params["is_del"] = is_deleted

    if status:
        status_list = [int(s.strip()) for s in status.split(",")]
        placeholders = ", ".join(f":st_{i}" for i in range(len(status_list)))
        where_parts.append(f"t.status IN ({placeholders})")
        for i, s in enumerate(status_list):
            params[f"st_{i}"] = s

    if join_table and join_on:
        validate_table(join_table)
        on_parts = []
        for pair in join_on.split(","):
            kv = pair.strip().split("=")
            if len(kv) == 2:
                left = validate_identifier(kv[0].strip(), "join column")
                right = kv[1].strip()
                if right.isdigit() or (right.startswith("'") and right.endswith("'")):
                    on_parts.append(f"j1.{left} = {right}")
                else:
                    right = validate_identifier(right, "join column")
                    on_parts.append(f"j1.{left} = t.{right}")
        joins_sql += f" LEFT JOIN {join_table} j1 ON {' AND '.join(on_parts)}"

    if join_table2 and join_on2:
        validate_table(join_table2)
        on_parts = []
        for pair in join_on2.split(","):
            kv = pair.strip().split("=")
            if len(kv) == 2:
                left = validate_identifier(kv[0].strip(), "join column")
                right = kv[1].strip()
                if right.isdigit() or (right.startswith("'") and right.endswith("'")):
                    on_parts.append(f"j2.{left} = {right}")
                else:
                    right = validate_identifier(right, "join column")
                    on_parts.append(f"j2.{left} = j1.{right}")
        joins_sql += f" LEFT JOIN {join_table2} j2 ON {' AND '.join(on_parts)}"

    where_sql = " AND ".join(where_parts) if where_parts else "1=1"
    group_sql = f"GROUP BY {validate_identifier(group_by, 'group_by')}" if group_by else ""
    order_sql = ""
    if order_by:
        parts = order_by.strip().split()
        col = validate_identifier(parts[0], "order column")
        direction = parts[1].upper() if len(parts) > 1 and parts[1].upper() in ("ASC", "DESC") else "ASC"
        order_sql = f"ORDER BY {col} {direction}"

    sql = f"""
        SELECT {cols_sql}
        FROM {table} t
        {joins_sql}
        WHERE {where_sql}
        {group_sql}
        {order_sql}
        LIMIT :lim
    """
    params["lim"] = limit

    result = await db.execute(text(sql), params)
    return [dict(r) for r in result.mappings().all()]
