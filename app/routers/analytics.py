from __future__ import annotations

from typing import Iterable

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth_guard import verify_session
from app.core.authorization import get_authorization_identity
from app.core.database import get_db
from app.core.rate_limit import limiter
from app.schemas.analytics import (
    AnalyticsDistributionResponse,
    AnalyticsFilters,
    AnalyticsRankingResponse,
    AnalyticsRecentActivityResponse,
    AnalyticsSummaryResponse,
    AnalyticsTrendsResponse,
)
from app.services import analytics_service

router = APIRouter(
    prefix="/api/v1/{context}/analytics",
    tags=["Analytics"],
    dependencies=[Depends(verify_session)],
)


def _normalize_values(values: Iterable[str]) -> set[str]:
    return {value.strip().lower() for value in values if value and value.strip()}


def _parse_group_ids(group_ids: str | None) -> list[int] | None:
    if not group_ids:
        return None

    parsed = []
    for chunk in group_ids.split(","):
        token = chunk.strip()
        if not token:
            continue
        if not token.isdigit():
            raise HTTPException(status_code=400, detail="group_ids deve conter apenas inteiros positivos.")
        parsed.append(int(token))
    return parsed or None


def _build_filters(scope: analytics_service.AnalyticsScope) -> AnalyticsFilters:
    return AnalyticsFilters(
        date_from=scope.date_from.date().isoformat(),
        date_to=scope.date_to.date().isoformat(),
        department=scope.department,
        group_ids=scope.group_ids,
    )


async def require_analytics_access(
    context: str,
    identity: dict = Depends(get_authorization_identity),
) -> dict:
    active_role = str(identity.get("active_hub_role") or "").strip().lower()
    if not active_role:
        raise HTTPException(
            status_code=403,
            detail="Acesso negado: papel ativo obrigatorio para esta operacao.",
        )

    app_access = _normalize_values(str(item) for item in (identity.get("app_access") or []))
    normalized_context = context.strip().lower()

    if normalized_context.startswith("dtic"):
        allowed_roles = {"tecnico", "gestor"}
        required_apps = {"dtic-metrics"}
        has_role = active_role in allowed_roles
    elif normalized_context.startswith("sis"):
        required_apps = {"sis-dashboard"}
        has_role = active_role == "gestor" or active_role.startswith("tecnico")
    else:
        raise HTTPException(status_code=400, detail=f"Contexto '{context}' nao suportado para analytics.")

    if not has_role:
        raise HTTPException(
            status_code=403,
            detail="Acesso negado: requer papel de autorizacao para analytics.",
        )

    if not app_access.intersection(required_apps):
        required = ", ".join(sorted(required_apps))
        raise HTTPException(
            status_code=403,
            detail=f"Acesso negado: requer permissao de modulo ({required}).",
        )

    return identity


@router.get("/summary", response_model=AnalyticsSummaryResponse, operation_id="getAnalyticsSummary")
@limiter.limit("90/minute")
async def get_summary(
    request: Request,
    context: str,
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    department: str | None = Query(default=None),
    group_ids: str | None = Query(default=None, description="IDs separados por virgula: '21,22'"),
    _identity: dict = Depends(require_analytics_access),
    db: AsyncSession = Depends(get_db),
):
    try:
        parsed_group_ids = _parse_group_ids(group_ids)
        scope = analytics_service.resolve_scope(context, date_from, date_to, department, parsed_group_ids)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    data = await analytics_service.get_summary(db, scope)
    return {
        "context": context,
        "filters": _build_filters(scope),
        "data": data,
    }


@router.get("/trends", response_model=AnalyticsTrendsResponse, operation_id="getAnalyticsTrends")
@limiter.limit("90/minute")
async def get_trends(
    request: Request,
    context: str,
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    department: str | None = Query(default=None),
    group_ids: str | None = Query(default=None, description="IDs separados por virgula: '21,22'"),
    _identity: dict = Depends(require_analytics_access),
    db: AsyncSession = Depends(get_db),
):
    try:
        parsed_group_ids = _parse_group_ids(group_ids)
        scope = analytics_service.resolve_scope(context, date_from, date_to, department, parsed_group_ids)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    series = await analytics_service.get_trends(db, scope)
    return {
        "context": context,
        "filters": _build_filters(scope),
        "series": series,
    }


@router.get("/ranking", response_model=AnalyticsRankingResponse, operation_id="getAnalyticsRanking")
@limiter.limit("90/minute")
async def get_ranking(
    request: Request,
    context: str,
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    department: str | None = Query(default=None),
    group_ids: str | None = Query(default=None, description="IDs separados por virgula: '21,22'"),
    limit: int = Query(default=10, ge=1, le=50),
    _identity: dict = Depends(require_analytics_access),
    db: AsyncSession = Depends(get_db),
):
    try:
        parsed_group_ids = _parse_group_ids(group_ids)
        scope = analytics_service.resolve_scope(context, date_from, date_to, department, parsed_group_ids)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    data = await analytics_service.get_ranking(db, scope, limit)
    return {
        "context": context,
        "filters": _build_filters(scope),
        "limit": limit,
        "data": data,
    }


@router.get(
    "/recent-activity",
    response_model=AnalyticsRecentActivityResponse,
    operation_id="getAnalyticsRecentActivity",
)
@limiter.limit("90/minute")
async def get_recent_activity(
    request: Request,
    context: str,
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    department: str | None = Query(default=None),
    group_ids: str | None = Query(default=None, description="IDs separados por virgula: '21,22'"),
    limit: int = Query(default=10, ge=1, le=50),
    _identity: dict = Depends(require_analytics_access),
    db: AsyncSession = Depends(get_db),
):
    try:
        parsed_group_ids = _parse_group_ids(group_ids)
        scope = analytics_service.resolve_scope(context, date_from, date_to, department, parsed_group_ids)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    data = await analytics_service.get_recent_activity(db, scope, limit)
    return {
        "context": context,
        "filters": _build_filters(scope),
        "limit": limit,
        "data": data,
    }


@router.get(
    "/distribution/entity",
    response_model=AnalyticsDistributionResponse,
    operation_id="getAnalyticsDistributionEntity",
)
@limiter.limit("90/minute")
async def get_distribution_entity(
    request: Request,
    context: str,
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    department: str | None = Query(default=None),
    group_ids: str | None = Query(default=None, description="IDs separados por virgula: '21,22'"),
    limit: int = Query(default=10, ge=1, le=50),
    _identity: dict = Depends(require_analytics_access),
    db: AsyncSession = Depends(get_db),
):
    try:
        parsed_group_ids = _parse_group_ids(group_ids)
        scope = analytics_service.resolve_scope(context, date_from, date_to, department, parsed_group_ids)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    data = await analytics_service.get_distribution_entity(db, scope, limit)
    return {
        "context": context,
        "filters": _build_filters(scope),
        "limit": limit,
        "data": data,
    }


@router.get(
    "/distribution/category",
    response_model=AnalyticsDistributionResponse,
    operation_id="getAnalyticsDistributionCategory",
)
@limiter.limit("90/minute")
async def get_distribution_category(
    request: Request,
    context: str,
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    department: str | None = Query(default=None),
    group_ids: str | None = Query(default=None, description="IDs separados por virgula: '21,22'"),
    limit: int = Query(default=10, ge=1, le=50),
    _identity: dict = Depends(require_analytics_access),
    db: AsyncSession = Depends(get_db),
):
    try:
        parsed_group_ids = _parse_group_ids(group_ids)
        scope = analytics_service.resolve_scope(context, date_from, date_to, department, parsed_group_ids)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    data = await analytics_service.get_distribution_category(db, scope, limit)
    return {
        "context": context,
        "filters": _build_filters(scope),
        "limit": limit,
        "data": data,
    }
