"""
Router: Orchestrator — Composição Flexível de Entidades
O Frontend define a sequência de operações. O Backend executa e resolve referências.
Zero presunção de fluxo de negócio.
"""

import re
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from app.core.session_manager import session_manager
from app.core.rate_limit import limiter
from app.schemas.universal import (
    OrchestrationCommand,
    OrchestrationResult,
    OrchestrationStepResult,
)
from app.core.auth_guard import verify_session

router = APIRouter(prefix="/api/v1/{context}/orchestrate", tags=["Orchestrator (Multi-Step)"], dependencies=[Depends(verify_session)])

# Regex para resolver referências: $ref:step_name.field
_REF_PATTERN = re.compile(r"^\$ref:(\w+)\.(\w+)$")


def _resolve_refs(input_data: dict[str, Any], refs: dict[str, Any]) -> dict[str, Any]:
    """
    Resolve referências dinâmicas ($ref:step_name.field) no payload de um step.
    Exemplo: {"tickets_id": "$ref:new_ticket.id"} → {"tickets_id": 42}
    """
    resolved = {}
    for key, value in input_data.items():
        if isinstance(value, str):
            match = _REF_PATTERN.match(value)
            if match:
                ref_name, ref_field = match.groups()
                if ref_name not in refs:
                    raise ValueError(f"Reference '{ref_name}' not found. Available: {list(refs.keys())}")
                ref_data = refs[ref_name]
                if isinstance(ref_data, dict) and ref_field in ref_data:
                    resolved[key] = ref_data[ref_field]
                else:
                    raise ValueError(f"Field '{ref_field}' not found in ref '{ref_name}'")
            else:
                resolved[key] = value
        else:
            resolved[key] = value
    return resolved


@router.post("/", operation_id="orchestrate")
@limiter.limit("30/minute")
async def orchestrate(
    request: Request,
    context: str,
    command: OrchestrationCommand,
):
    """
    [Universal] Executa uma sequência ordenada de operações GLPI.
    
    Cada step pode referenciar resultados de steps anteriores via $ref:nome.campo.
    Substitui: domain_tickets (create+actors), domain_chargers (assign/unassign),
    e qualquer composição futura.
    
    Exemplo de payload:
    ```json
    {
      "steps": [
        {"action":"create","itemtype":"Ticket","input":{"name":"Teste"},"ref":"t1"},
        {"action":"create","itemtype":"Ticket_User","input":{"tickets_id":"$ref:t1.id","users_id":10,"type":1}}
      ]
    }
    ```
    """
    try:
        client = await session_manager.get_client(context)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    refs: dict[str, Any] = {}
    results: list[OrchestrationStepResult] = []
    completed = 0
    failed = 0

    for i, step in enumerate(command.steps):
        try:
            # Resolver referências no input
            resolved_input = _resolve_refs(step.input, refs) if step.input else {}

            if step.action == "create":
                result = await client.create_item(step.itemtype, resolved_input)

            elif step.action == "update":
                if step.item_id is None:
                    raise ValueError("item_id é obrigatório para action='update'")
                result = await client.update_item(step.itemtype, step.item_id, resolved_input)

            elif step.action == "delete":
                if step.item_id is None:
                    raise ValueError("item_id é obrigatório para action='delete'")
                result = await client.delete_item(
                    step.itemtype, step.item_id, force_purge=step.force_purge
                )
            else:
                raise ValueError(f"Action desconhecida: {step.action}")

            # Armazenar referência se definida
            if step.ref:
                refs[step.ref] = result

            results.append(OrchestrationStepResult(
                step_index=i, ref=step.ref, status="success", result=result
            ))
            completed += 1

        except Exception as e:
            failed += 1
            results.append(OrchestrationStepResult(
                step_index=i, ref=step.ref, status="error", error=str(e)
            ))
            # Fail-fast: para na primeira falha
            break

    return OrchestrationResult(
        context=context,
        total_steps=len(command.steps),
        completed=completed,
        failed=failed,
        results=results,
    )
