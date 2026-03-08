import json
import html
import logging

logger = logging.getLogger(__name__)
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, bindparam

from app.core.database import get_db
from app.core.rate_limit import limiter
from app.core.cache import formcreator_cache
from app.core.session_manager import session_manager
from app.schemas.formcreator import (
    FormSchema, FormSection, FormCondition, FormQuestion, FormOption,
    LookupItem, ServiceCategory, ServiceForm, SubmitFormRequest, SubmitFormResponse
)

router = APIRouter(prefix="/api/v1/{context}/domain/formcreator", tags=["Domain: FormCreator (Forms Dinâmicos)"])

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

async def fetch_categories_from_glpi(context: str) -> List[dict]:
    """Helper for cached glpi fetch."""
    try:
        client = await session_manager.get_client(context)
        raw = await client.get_all_items("PluginFormcreatorCategory", range_end=9999)
        return raw if isinstance(raw, list) else []
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Erro buscando FormCategories: {e}")

@router.get("/categories", response_model=List[ServiceCategory])
@limiter.limit("60/minute")
async def list_categories(request: Request, context: str):
    """
    Lista Categorias ativas com Cache in-memory (TTL 5 mins).
    """
    cache_key = f"fc_categories_{context}"
    items = await formcreator_cache.get_or_set(
        cache_key, 
        lambda: fetch_categories_from_glpi(context)
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
    category_id: int | None = None
):
    """
    Lista Formulários ativos, visíveis que não foram deletados.
    """
    try:
        client = await session_manager.get_client(context)
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
    db: AsyncSession = Depends(get_db)
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

    # Conditions (Regras de mostrar/ocultar)
    cond_sql = (
        f"SELECT id,itemtype,items_id,plugin_formcreator_questions_id,show_condition,show_logic,show_value,{bt}order{bt} AS cond_order "
        "FROM glpi_plugin_formcreator_conditions "
        "WHERE itemtype IN ('PluginFormcreatorQuestion','PluginFormcreatorTargetTicket','PluginFormcreatorTargetChange','PluginFormcreatorTargetProblem') "
        "AND (items_id IN :qids OR plugin_formcreator_questions_id IN :qids) "
        f"ORDER BY plugin_formcreator_questions_id, {bt}order{bt}, id"
    )
    stmt_cond = text(cond_sql).bindparams(bindparam("qids", expanding=True))
    r_conds = await db.execute(stmt_cond, {"qids": question_ids})
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
    db: AsyncSession = Depends(get_db)
):
    """
    Orquestra as respostas do usuário e repassa para a API do GLPI 
    como um ItemType gerado (Normalmente Ticket).
    """
    try:
        client = await session_manager.get_client(context)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Formatar answers: {question_id: valor} → {formcreator_field_{id}: "valor"}
    # GLPI Formcreator exige TODOS os valores como STRING e rejeita null/int
    answers_payload = {}
    for q_id_str, val in payload.answers.items():
        # Remover campos null/vazio (ex: file upload mockado no front vira {})
        if val is None or (isinstance(val, dict) and not val):
            continue
            
        key = f"formcreator_field_{q_id_str}" if not q_id_str.startswith("formcreator_field_") else q_id_str
        
        # GLPI exige strings como payload dos campos.
        # Evita a falha sintática no parse nativo de str(dict) do Python (que gera aspas simples).
        if isinstance(val, (dict, list)):
            answers_payload[key] = json.dumps(val)
        else:
            answers_payload[key] = str(val)
        
    form_answer_input = {
        "plugin_formcreator_forms_id": form_id,
        "requesttypes_id": 1, 
        **answers_payload
    }

    # === LOGGING DE DIAGNÓSTICO ===
    glpi_url = client._url("PluginFormcreatorFormAnswer")
    logger.info(
        "[SUBMIT] form_id=%s context=%s glpi_url=%s payload_keys=%s",
        form_id, context, glpi_url, list(form_answer_input.keys())
    )
    logger.debug("[SUBMIT] full_payload=%s", json.dumps(form_answer_input, default=str))
    
    try:
        res = await client.create_item("PluginFormcreatorFormAnswer", form_answer_input)
        form_answer_id = res.get("id")
        
        logger.info("[SUBMIT] Sucesso! form_answer_id=%s response=%s", form_answer_id, res)
        
        return SubmitFormResponse(
            form_answer_id=int(form_answer_id) if form_answer_id else 0,
            message="Solicitação (Formulário) enviada e processada via Universal Backend.",
            ticket_ids=[]
        )
    except Exception as e:
        # Extrair detalhes reais do erro GLPI
        error_detail = str(e)
        status_code = 502
        
        # Se o GLPI retornou erro HTTP (400, 422, etc.), preservar o status real
        if hasattr(e, 'status_code'):
            glpi_status = getattr(e, 'status_code')
            if 400 <= glpi_status < 500:
                status_code = glpi_status  # Preservar 400/422 do GLPI
        
        if hasattr(e, 'detail'):
            glpi_detail = getattr(e, 'detail')
            error_detail = f"GLPI respondeu ({status_code}): {json.dumps(glpi_detail, default=str)}"
        
        logger.error(
            "[SUBMIT] FALHA form_id=%s status=%s error=%s payload_enviado=%s",
            form_id, status_code, error_detail,
            json.dumps(form_answer_input, default=str)
        )
        
        raise HTTPException(
            status_code=status_code,
            detail=error_detail
        )
