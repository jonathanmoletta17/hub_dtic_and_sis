import json
import html
import logging
import hashlib
import asyncio
import re
from contextlib import asynccontextmanager
from pathlib import Path

logger = logging.getLogger(__name__)
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, bindparam

from app.config import settings
from app.core.authorization import require_hub_permissions
from app.core.database import get_db
from app.core.rate_limit import limiter
from app.core.cache import formcreator_cache
from app.core.context_registry import registry
from app.core.glpi_client import GLPIClient
from app.schemas.formcreator import (
    FormSchema, FormSection, FormCondition, FormQuestion, FormOption,
    ServiceCategory, ServiceForm, SubmitFormRequest, SubmitFormResponse
)

MAX_FORMCREATOR_FILES_PER_SUBMIT = 10
MAX_FORMCREATOR_FILE_SIZE_BYTES = 10 * 1024 * 1024
_ALLOWED_FORMCREATOR_ATTACHMENT_EXTENSIONS = {
    ".pdf",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".csv",
    ".txt",
    ".ppt",
    ".pptx",
}
_ALLOWED_FORMCREATOR_ATTACHMENT_MIME_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
}

router = APIRouter(
    prefix="/api/v1/{context}/domain/formcreator",
    tags=["Domain: FormCreator (Forms Dinamicos)"],
)

def _parse_json(value: Any) -> Any:
    if value is None: return None
    if not isinstance(value, str): return value
    raw = value.strip()
    if not raw or raw[0] not in "[{": return value
    try: return json.loads(raw)
    except Exception: return value

def _decode_html(value: Any) -> Any:
    if value is None: return None
    if not isinstance(value, str): return value
    return html.unescape(value)

def _normalize_options(value: Any) -> Optional[List[FormOption]]:
    parsed = _parse_json(value)
    if isinstance(parsed, list):
        opts: List[FormOption] = []
        for item in parsed:
            if isinstance(item, dict) and "value" in item and "label" in item:
                opts.append(FormOption(label=str(item["label"]), value=item["value"]))
            else:
                opts.append(FormOption(label=str(item), value=item))
        return opts
    return None

def _derive_lookup(itemtype: str, values: Any) -> Optional[Dict[str, Any]]:
    it = (itemtype or "").strip()
    if not it: return None
    parsed = _parse_json(values)
    params = parsed if isinstance(parsed, dict) else {}
    source_map = {
        "Location": "locations",
        "ITILCategory": "itilcategories",
        "User": "users",
    }
    return {"source": source_map.get(it, f"glpi:{it}"), "params": params}

@asynccontextmanager
async def _user_client(context: str, session_token: str):
    base_context = registry.get_base_context(context)
    client = GLPIClient.from_session_token(
        settings.get_glpi_instance(base_context),
        session_token,
    )
    try:
        yield client
    finally:
        await client._http.aclose()


def _sanitize_formcreator_filename(filename: str) -> str:
    base = Path(filename).name.strip()
    if not base:
        base = "anexo"
    base = re.sub(r"[^A-Za-z0-9._ -]", "_", base)
    return base[:255]


def _assert_formcreator_file_constraints(filename: str, content_type: str, size: int) -> None:
    suffix = Path(filename).suffix.lower()
    mime = (content_type or "application/octet-stream").lower()

    if size <= 0:
        raise HTTPException(status_code=400, detail=f"Arquivo '{filename}' vazio.")

    if size > MAX_FORMCREATOR_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Arquivo '{filename}' excede o limite de {MAX_FORMCREATOR_FILE_SIZE_BYTES // (1024 * 1024)} MB.",
        )

    if (
        suffix not in _ALLOWED_FORMCREATOR_ATTACHMENT_EXTENSIONS
        and mime not in _ALLOWED_FORMCREATOR_ATTACHMENT_MIME_TYPES
    ):
        raise HTTPException(
            status_code=415,
            detail=f"Tipo de arquivo nao permitido para '{filename}'.",
        )


def _extract_created_item_id(payload: object) -> int | None:
    if isinstance(payload, dict):
        direct_id = payload.get("id")
        if isinstance(direct_id, int):
            return direct_id
        if isinstance(direct_id, str) and direct_id.isdigit():
            return int(direct_id)

        for key in ("0", 0):
            nested = payload.get(key)
            if isinstance(nested, dict):
                nested_id = nested.get("id")
                if isinstance(nested_id, int):
                    return nested_id
                if isinstance(nested_id, str) and nested_id.isdigit():
                    return int(nested_id)

    return None


def _extract_glpi_upload_errors(payload: object) -> list[str]:
    if not isinstance(payload, dict):
        return []

    upload_result = payload.get("upload_result")
    if not isinstance(upload_result, dict):
        return []

    entries = upload_result.get("filename")
    if not isinstance(entries, list):
        return []

    errors: list[str] = []
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        error = entry.get("error")
        if isinstance(error, str) and error.strip():
            errors.append(error.strip())
    return errors


def _build_form_answer_input(form_id: int, answers: Dict[str, Any]) -> Dict[str, Any]:
    answers_payload: Dict[str, str] = {}
    for q_id_str, val in answers.items():
        if val is None or (isinstance(val, dict) and not val):
            continue

        key = (
            str(q_id_str)
            if str(q_id_str).startswith("formcreator_field_")
            else f"formcreator_field_{q_id_str}"
        )

        if isinstance(val, (dict, list)):
            answers_payload[key] = json.dumps(val)
        else:
            answers_payload[key] = str(val)

    return {
        "plugin_formcreator_forms_id": form_id,
        "requesttypes_id": 1,
        **answers_payload,
    }


def _parse_file_question_ids(raw: str, files_count: int) -> list[int]:
    try:
        parsed = json.loads(raw or "[]")
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="file_question_ids_json invalido.") from exc

    if not isinstance(parsed, list):
        raise HTTPException(status_code=400, detail="file_question_ids_json deve ser uma lista.")

    question_ids: list[int] = []
    for value in parsed:
        try:
            question_ids.append(int(value))
        except (TypeError, ValueError) as exc:
            raise HTTPException(status_code=400, detail="ID de pergunta de arquivo invalido.") from exc

    if len(question_ids) != files_count:
        raise HTTPException(
            status_code=400,
            detail="Quantidade de arquivos nao corresponde aos IDs de perguntas enviados.",
        )

    return question_ids


def _get_required_file_question_labels(
    question_ids: list[int],
    question_metadata: dict[int, dict[str, Any]],
) -> list[str]:
    return [
        str(question_metadata[question_id].get("name") or question_id)
        for question_id in question_ids
        if int(question_metadata[question_id].get("required") or 0) == 1
    ]


async def _get_file_question_metadata(
    db: AsyncSession,
    question_ids: list[int],
) -> dict[int, dict[str, Any]]:
    if not question_ids:
        return {}

    stmt = text(
        "SELECT id, name, required "
        "FROM glpi_plugin_formcreator_questions "
        "WHERE id IN :question_ids AND fieldtype='file'"
    ).bindparams(bindparam("question_ids", expanding=True))
    rows = (await db.execute(stmt, {"question_ids": question_ids})).mappings().all()
    return {int(row["id"]): dict(row) for row in rows}


async def _fetch_generated_ticket_ids(db: AsyncSession, form_answer_id: int) -> list[int]:
    if form_answer_id <= 0:
        return []

    for attempt in range(5):
        rows = (
            await db.execute(
                text(
                    "SELECT tickets_id "
                    "FROM glpi_items_tickets "
                    "WHERE itemtype='PluginFormcreatorFormAnswer' AND items_id=:form_answer_id "
                    "ORDER BY tickets_id"
                ),
                {"form_answer_id": form_answer_id},
            )
        ).mappings().all()
        ticket_ids = [int(row["tickets_id"]) for row in rows if row.get("tickets_id")]
        if ticket_ids or attempt == 4:
            return ticket_ids
        await asyncio.sleep(0.2)

    return []


async def _upload_formcreator_files(
    *,
    client: GLPIClient,
    form_answer_id: int,
    ticket_ids: list[int],
    files: list[UploadFile],
    question_ids: list[int],
    question_metadata: dict[int, dict[str, Any]],
) -> None:
    if not files:
        return
    if len(files) > MAX_FORMCREATOR_FILES_PER_SUBMIT:
        raise HTTPException(
            status_code=400,
            detail=f"Maximo de {MAX_FORMCREATOR_FILES_PER_SUBMIT} arquivos por envio.",
        )

    for file, question_id in zip(files, question_ids):
        metadata = question_metadata.get(question_id, {})
        safe_name = _sanitize_formcreator_filename(file.filename or "anexo")
        content = await file.read()
        _assert_formcreator_file_constraints(safe_name, file.content_type or "", len(content))

        question_name = str(metadata.get("name") or f"Pergunta {question_id}")
        display_name = f"{question_name} - {safe_name}"[:255]
        uploaded = await client.upload_document(
            display_name=display_name,
            filename=safe_name,
            content=content,
            mime_type=file.content_type or "application/octet-stream",
        )
        upload_errors = _extract_glpi_upload_errors(uploaded)
        document_id = _extract_created_item_id(uploaded)

        if upload_errors:
            if document_id:
                try:
                    await client.delete_item("Document", document_id, force_purge=True)
                except Exception:
                    pass
            raise HTTPException(
                status_code=415,
                detail=f"Erro ao enviar '{safe_name}': {'; '.join(upload_errors)}",
            )

        if not document_id:
            raise HTTPException(
                status_code=502,
                detail=f"Upload concluido sem ID de documento para '{safe_name}'.",
            )

        link_targets = [("PluginFormcreatorFormAnswer", form_answer_id)]
        link_targets.extend(("Ticket", ticket_id) for ticket_id in ticket_ids)

        try:
            for itemtype, item_id in link_targets:
                await client.link_document_to_item(
                    itemtype=itemtype,
                    item_id=item_id,
                    document_id=document_id,
                )
        except Exception:
            try:
                await client.delete_item("Document", document_id, force_purge=True)
            except Exception:
                pass
            raise


async def _submit_form_answer_to_glpi(
    *,
    context: str,
    form_id: int,
    answers: Dict[str, Any],
    db: AsyncSession,
    session_token: str,
    files: list[UploadFile] | None = None,
    file_question_ids: list[int] | None = None,
    file_question_metadata: dict[int, dict[str, Any]] | None = None,
) -> SubmitFormResponse:
    try:
        client_cm = _user_client(context, session_token)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    form_answer_input = _build_form_answer_input(form_id, answers)

    async with client_cm as client:
        glpi_url = client._url("PluginFormcreatorFormAnswer")
        logger.info(
            "[SUBMIT] form_id=%s context=%s glpi_url=%s payload_keys=%s files=%s",
            form_id, context, glpi_url, list(form_answer_input.keys()), len(files or []),
        )
        logger.debug("[SUBMIT] full_payload=%s", json.dumps(form_answer_input, default=str))

        try:
            res = await client.create_item("PluginFormcreatorFormAnswer", form_answer_input)
            form_answer_id = _extract_created_item_id(res) or 0
            ticket_ids = await _fetch_generated_ticket_ids(db, form_answer_id)

            await _upload_formcreator_files(
                client=client,
                form_answer_id=form_answer_id,
                ticket_ids=ticket_ids,
                files=files or [],
                question_ids=file_question_ids or [],
                question_metadata=file_question_metadata or {},
            )

            logger.info(
                "[SUBMIT] Sucesso form_answer_id=%s ticket_ids=%s response=%s",
                form_answer_id, ticket_ids, res,
            )

            message = "Solicitacao (Formulario) enviada e processada via sessao do usuario."
            if files:
                message = (
                    "Solicitacao enviada com anexos vinculados ao chamado."
                    if ticket_ids
                    else "Solicitacao enviada com anexos vinculados a resposta do formulario."
                )

            return SubmitFormResponse(
                form_answer_id=form_answer_id,
                message=message,
                ticket_ids=ticket_ids,
            )
        except HTTPException:
            raise
        except Exception as e:
            error_detail = str(e)
            status_code = 502

            if hasattr(e, "status_code"):
                glpi_status = getattr(e, "status_code")
                if 400 <= glpi_status < 500:
                    status_code = glpi_status

            if hasattr(e, "detail"):
                glpi_detail = getattr(e, "detail")
                error_detail = f"GLPI respondeu ({status_code}): {json.dumps(glpi_detail, default=str)}"

            logger.error(
                "[SUBMIT] FALHA form_id=%s status=%s error=%s payload_enviado=%s",
                form_id, status_code, error_detail,
                json.dumps(form_answer_input, default=str),
            )

            raise HTTPException(status_code=status_code, detail=error_detail)


async def fetch_categories_from_glpi(context: str, session_token: str) -> List[dict]:
    """Helper para consulta cacheada usando a sessao do usuario autenticado."""
    try:
        async with _user_client(context, session_token) as client:
            raw = await client.get_all_items("PluginFormcreatorCategory", range_end=9999)
            return raw if isinstance(raw, list) else []
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Erro buscando FormCategories: {e}")

@router.get("/categories", response_model=List[ServiceCategory])
@limiter.limit("60/minute")
async def list_categories(
    request: Request,
    context: str,
    identity: dict = Depends(require_hub_permissions("solicitante", "tecnico", "gestor")),
):
    """
    Lista Categorias ativas com Cache in-memory (TTL 5 mins).
    """
    session_token = str(identity["session_token"])
    token_hash = hashlib.sha256(session_token.encode("utf-8")).hexdigest()[:16]
    cache_key = f"fc_categories_{registry.get_base_context(context)}_{token_hash}"
    items = await formcreator_cache.get_or_set(
        cache_key, 
        lambda: fetch_categories_from_glpi(context, session_token)
    )
    
    result: List[ServiceCategory] = []
    for c in items:
        if not isinstance(c, dict): continue
        result.append(
            ServiceCategory(
                id=int(c.get("id", 0)),
                name=str(c.get("name") or ""),
                parent_id=int(c.get("plugin_formcreator_categories_id") or 0),
                level=int(c.get("level") or 0),
                completename=c.get("completename"),
            )
        )
    result.sort(key=lambda x: (x.level, x.completename or x.name, x.id))
    return result

@router.get("/forms", response_model=List[ServiceForm])
@limiter.limit("120/minute")
async def list_forms(
    request: Request,
    context: str,
    category_id: int | None = None,
    identity: dict = Depends(require_hub_permissions("solicitante", "tecnico", "gestor")),
):
    """
    Lista Formulários ativos, visíveis que não foram deletados.
    """
    try:
        async with _user_client(context, str(identity["session_token"])) as client:
            items = await client.get_all_items("PluginFormcreatorForm", range_end=9999)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Erro formulários: {e}")
        
    result: List[ServiceForm] = []
    for f in items:
        if not isinstance(f, dict): continue
        if int(f.get("is_deleted") or 0) == 1: continue
        if int(f.get("is_active") or 0) != 1: continue
        if int(f.get("is_visible") or 0) != 1: continue
        if category_id is not None and int(f.get("plugin_formcreator_categories_id") or 0) != category_id:
            continue
            
        result.append(
            ServiceForm(
                id=int(f.get("id")),
                name=str(f.get("name") or ""),
                description=_decode_html(f.get("description")),
                category_id=int(f.get("plugin_formcreator_categories_id") or 0),
                icon=f.get("icon"),
                icon_color=f.get("icon_color"),
                background_color=f.get("background_color"),
            )
        )
    result.sort(key=lambda x: (x.name.lower(), x.id))
    return result

@router.get("/forms/{form_id}/schema", response_model=FormSchema)
@limiter.limit("120/minute")
async def get_form_schema(
    request: Request, 
    context: str, 
    form_id: int, 
    db: AsyncSession = Depends(get_db),
    _identity: dict = Depends(require_hub_permissions("solicitante", "tecnico", "gestor")),
):
    """
    Monta completamente o Layout dinâmico lendo Async diretamente do GLPI DB.
    CQRS puro (apenas consultas, usando o pool robusto para evitar milhares de requests REST).
    """
    # Usando bt = "`" escapado p MySQL
    bt = "`"
    
    # Form metadata
    r_form = await db.execute(
        text(
            "SELECT id,name,entities_id,is_recursive,is_active,is_visible,access_rights,helpdesk_home,"
            "plugin_formcreator_categories_id,language,validation_required,is_captcha_enabled,show_rule,"
            "formanswer_name,icon,icon_color,background_color,description,content "
            "FROM glpi_plugin_formcreator_forms WHERE id=:id AND is_deleted=0"
        ), {"id": form_id}
    )
    form_map = r_form.mappings().first()
    if not form_map: raise HTTPException(status_code=404, detail="Form not found")

    # Sections (Abas do Formulário)
    r_secs = await db.execute(
        text(f"SELECT id,name,{bt}order{bt} AS section_order,show_rule,uuid "
             "FROM glpi_plugin_formcreator_sections "
             "WHERE plugin_formcreator_forms_id=:id "
             f"ORDER BY {bt}order{bt}, id"), {"id": form_id}
    )
    sections = r_secs.mappings().all()
    section_ids = [int(s["id"]) for s in sections] or [0]

    # Questions (Campos do forms como Radio, Dropdown, Text)
    q_sql = (
        "SELECT q.id,q.name,q.fieldtype,q.required,q.show_empty,q.default_values,q.itemtype,"
        f"q.{bt}values{bt} AS values_json,q.description,q.row,q.col,q.width,q.show_rule,q.plugin_formcreator_sections_id "
        "FROM glpi_plugin_formcreator_questions q "
        "WHERE q.plugin_formcreator_sections_id IN :section_ids "
        "ORDER BY q.plugin_formcreator_sections_id, q.row, q.col, q.id"
    )
    stmt_q = text(q_sql).bindparams(bindparam("section_ids", expanding=True))
    r_qs = await db.execute(stmt_q, {"section_ids": section_ids})
    questions = r_qs.mappings().all()
    question_ids = [int(q["id"]) for q in questions] or [0]

    r_targets = await db.execute(
        text(
            "SELECT id FROM glpi_plugin_formcreator_targettickets "
            "WHERE plugin_formcreator_forms_id=:id"
        ),
        {"id": form_id},
    )
    target_ticket_ids = [int(t["id"]) for t in r_targets.mappings().all()] or [0]

    # Conditions (Regras de mostrar/ocultar)
    cond_sql = (
        f"SELECT id,itemtype,items_id,plugin_formcreator_questions_id,show_condition,show_logic,show_value,{bt}order{bt} AS cond_order "
        "FROM glpi_plugin_formcreator_conditions "
        "WHERE ("
        "(itemtype='PluginFormcreatorQuestion' AND items_id IN :qids) "
        "OR (itemtype='PluginFormcreatorSection' AND items_id IN :section_ids) "
        "OR (itemtype IN ('PluginFormcreatorTargetTicket','PluginFormcreatorTargetChange','PluginFormcreatorTargetProblem') AND items_id IN :target_ids) "
        "OR plugin_formcreator_questions_id IN :qids"
        ") "
        f"ORDER BY plugin_formcreator_questions_id, {bt}order{bt}, id"
    )
    stmt_cond = text(cond_sql).bindparams(
        bindparam("qids", expanding=True),
        bindparam("section_ids", expanding=True),
        bindparam("target_ids", expanding=True),
    )
    r_conds = await db.execute(
        stmt_cond,
        {
            "qids": question_ids,
            "section_ids": section_ids,
            "target_ids": target_ticket_ids,
        },
    )
    conditions = r_conds.mappings().all()

    # Regexes e Ranges de validação
    stmt_reg = text("SELECT id,plugin_formcreator_questions_id,fieldname,regex FROM glpi_plugin_formcreator_questionregexes WHERE plugin_formcreator_questions_id IN :qids ORDER BY plugin_formcreator_questions_id,id").bindparams(bindparam("qids", expanding=True))
    r_reg = await db.execute(stmt_reg, {"qids": question_ids})
    regexes = r_reg.mappings().all()

    stmt_rng = text("SELECT id,plugin_formcreator_questions_id,fieldname,range_min,range_max FROM glpi_plugin_formcreator_questionranges WHERE plugin_formcreator_questions_id IN :qids ORDER BY plugin_formcreator_questions_id,id").bindparams(bindparam("qids", expanding=True))
    r_rng = await db.execute(stmt_rng, {"qids": question_ids})
    ranges = r_rng.mappings().all()

    # Processamento Final (Aglomerar Arrays)
    by_section: Dict[int, List[FormQuestion]] = {sid: [] for sid in section_ids}
    
    for q in questions:
        fieldtype = str(q.get("fieldtype") or "text")
        itemtype = str(q.get("itemtype") or "")
        values_json = q.get("values_json")
        options: Optional[List[FormOption]] = None
        lookup: Optional[Dict[str, Any]] = None

        if fieldtype in {"select", "multiselect", "radios"}:
            options = _normalize_options(values_json)
        elif fieldtype in {"dropdown", "glpiselect"}:
            lookup = _derive_lookup(itemtype, values_json)

        default_value = _decode_html(q.get("default_values"))
        parsed_default = _parse_json(default_value)
        if fieldtype in {"select", "radios"} and isinstance(parsed_default, list) and parsed_default:
            parsed_default = parsed_default[0]

        question = FormQuestion(
            id=int(q["id"]),
            name=str(q.get("name") or ""),
            fieldtype=fieldtype,
            required=bool(int(q.get("required") or 0)),
            description=_decode_html(q.get("description")),
            default_value=parsed_default,
            options=options,
            lookup=lookup,
            layout={"row": int(q.get("row") or 0), "col": int(q.get("col") or 0), "width": int(q.get("width") or 0)},
            show_rule=int(q.get("show_rule") or 0),
        )
        sid = int(q.get("plugin_formcreator_sections_id") or 0)
        if sid in by_section:
            by_section[sid].append(question)

    sections_out: List[FormSection] = []
    for s in sections:
        sid = int(s["id"])
        sections_out.append(
            FormSection(
                id=sid,
                name=str(s.get("name") or ""),
                order=int(s.get("section_order") or 0),
                questions=by_section.get(sid, []),
                show_rule=int(s.get("show_rule") or 0),
            )
        )

    conditions_out: List[FormCondition] = [
        FormCondition(
            id=int(c["id"]),
            controller_question_id=int(c.get("plugin_formcreator_questions_id") or 0),
            target_itemtype=str(c.get("itemtype") or ""),
            target_items_id=int(c.get("items_id") or 0),
            show_condition=int(c.get("show_condition") or 0),
            show_logic=int(c.get("show_logic") or 0),
            show_value=str(c.get("show_value") or ""),
            order=int(c.get("cond_order") or 0),
        ) for c in conditions
    ]

    form_dict = dict(form_map)
    form_dict["description"] = _decode_html(form_dict.get("description"))
    form_dict["content"] = _decode_html(form_dict.get("content"))

    return FormSchema(
        form=form_dict,
        sections=sections_out,
        conditions=conditions_out,
        regexes=[dict(r) for r in regexes],
        ranges=[dict(r) for r in ranges],
    )

@router.post("/forms/{form_id}/submit", response_model=SubmitFormResponse)
@limiter.limit("30/minute")
async def submit_form(
    request: Request,
    context: str,
    form_id: int,
    payload: SubmitFormRequest,
    db: AsyncSession = Depends(get_db),
    identity: dict = Depends(require_hub_permissions("solicitante", "tecnico", "gestor")),
):
    """
    Orquestra as respostas do usuário e repassa para a API do GLPI 
    como um ItemType gerado (Normalmente Ticket).
    """
    return await _submit_form_answer_to_glpi(
        context=context,
        form_id=form_id,
        answers=payload.answers,
        db=db,
        session_token=str(identity["session_token"]),
    )


@router.post("/forms/{form_id}/submit-multipart", response_model=SubmitFormResponse)
@limiter.limit("30/minute")
async def submit_form_multipart(
    request: Request,
    context: str,
    form_id: int,
    answers_json: str = Form("{}"),
    file_question_ids_json: str = Form("[]"),
    files: list[UploadFile] | None = File(default=None),
    db: AsyncSession = Depends(get_db),
    identity: dict = Depends(require_hub_permissions("solicitante", "tecnico", "gestor")),
):
    uploaded_files = files or []
    try:
        try:
            answers = json.loads(answers_json or "{}")
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=400, detail="answers_json invalido.") from exc
        if not isinstance(answers, dict):
            raise HTTPException(status_code=400, detail="answers_json deve ser um objeto.")

        file_question_ids = _parse_file_question_ids(file_question_ids_json, len(uploaded_files))
        question_metadata = await _get_file_question_metadata(db, file_question_ids)

        unknown_question_ids = [
            question_id for question_id in file_question_ids if question_id not in question_metadata
        ]
        if unknown_question_ids:
            raise HTTPException(
                status_code=400,
                detail=f"Pergunta(s) de arquivo inexistente(s): {unknown_question_ids}.",
            )

        required_file_labels = _get_required_file_question_labels(
            file_question_ids,
            question_metadata,
        )
        if required_file_labels:
            raise HTTPException(
                status_code=422,
                detail=(
                    "Arquivo obrigatorio nativo do FormCreator nao pode ser submetido por este endpoint seguro. "
                    "Caso consolidado conhecido: DTIC / NOMEIA / EXONERA quando TIPO=INGRESSO - ANEXO DE ARQUIVO DO RHE. "
                    "Campo(s): "
                    + ", ".join(required_file_labels)
                ),
            )

        return await _submit_form_answer_to_glpi(
            context=context,
            form_id=form_id,
            answers=answers,
            db=db,
            session_token=str(identity["session_token"]),
            files=uploaded_files,
            file_question_ids=file_question_ids,
            file_question_metadata=question_metadata,
        )
    finally:
        for file in uploaded_files:
            await file.close()
