import yaml
import logging
from dataclasses import dataclass
from typing import Dict, List, Optional
from pathlib import Path
from app.config import settings

logger = logging.getLogger(__name__)

@dataclass
class RoleDef:
    role: str
    label: str
    route: str = "dashboard"
    context_override: Optional[str] = None

@dataclass
class ContextConfig:
    id: str
    label: str
    glpi_url: str
    glpi_user_token: str
    glpi_app_token: str
    db_host: str
    db_port: int
    db_name: str
    db_user: str
    db_pass: str
    db_context: str
    color: str
    theme: str
    features: List[str]
    profile_map: Dict[int, RoleDef]
    group_map: Dict[int, RoleDef]
    group_ids: Optional[List[int]] = None
    parent: Optional[str] = None

class ContextRegistry:
    def __init__(self):
        self._contexts: Dict[str, ContextConfig] = {}

    def load_from_yaml(self, yaml_path: str):
        with open(yaml_path, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f)

        for ctx_id, ctx_data in data.get('contexts', {}).items():
            self._register_context(ctx_id, ctx_data)

    def _register_context(self, ctx_id: str, ctx_data: dict):
        # Resolve vars using settings matching
        def _resolve_env(env_key: str, default: any = None):
            if not isinstance(env_key, str) or not env_key.startswith('${') or not env_key.endswith('}'):
                return env_key
            
            key = env_key[2:-1]
            return getattr(settings, key.lower(), default)

        # Tratar map de roles
        def _parse_role_map(raw_map: dict) -> Dict[int, RoleDef]:
            res = {}
            if not raw_map:
                return res
            for k, v in raw_map.items():
                res[int(k)] = RoleDef(
                    role=v.get('role'),
                    label=v.get('label'),
                    route=v.get('route', 'dashboard'),
                    context_override=v.get('context_override')
                )
            return res

        # Para sub-contexts (ex: sis-manutencao), herdar dados do parent
        parent_id = ctx_data.get('parent')
        if parent_id and parent_id in self._contexts:
            parent = self._contexts[parent_id]
            self._contexts[ctx_id] = ContextConfig(
                id=ctx_id,
                parent=parent_id,
                label=ctx_data.get('label', parent.label),
                glpi_url=parent.glpi_url,
                glpi_user_token=parent.glpi_user_token,
                glpi_app_token=parent.glpi_app_token,
                db_host=parent.db_host,
                db_port=parent.db_port,
                db_name=parent.db_name,
                db_user=parent.db_user,
                db_pass=parent.db_pass,
                db_context=parent.db_context,
                color=ctx_data.get('color', parent.color),
                theme=ctx_data.get('theme', parent.theme),
                features=parent.features, # Herda do pai
                profile_map={},
                group_map={},
                group_ids=ctx_data.get('group_ids', [])
            )
        else:
            self._contexts[ctx_id] = ContextConfig(
                id=ctx_id,
                label=ctx_data.get('label', ""),
                glpi_url=_resolve_env(ctx_data.get('glpi_url')),
                glpi_user_token=_resolve_env(ctx_data.get('glpi_user_token')),
                glpi_app_token=_resolve_env(ctx_data.get('glpi_app_token')),
                db_host=_resolve_env(ctx_data.get('db_host')),
                db_port=_resolve_env(ctx_data.get('db_port'), 3306),
                db_name=_resolve_env(ctx_data.get('db_name')),
                db_user=_resolve_env(ctx_data.get('db_user')),
                db_pass=_resolve_env(ctx_data.get('db_pass')),
                db_context=ctx_data.get('db_context', ctx_id),
                color=ctx_data.get('color', "#000000"),
                theme=ctx_data.get('theme', ""),
                features=ctx_data.get('features', []),
                profile_map=_parse_role_map(ctx_data.get('profile_map', {})),
                group_map=_parse_role_map(ctx_data.get('group_map', {})),
                group_ids=ctx_data.get('group_ids')
            )

    def get(self, context_id: str) -> ContextConfig:
        if context_id not in self._contexts:
            raise KeyError(f"Context '{context_id}' not found in registry.")
        return self._contexts[context_id]

    def list_all(self) -> List[ContextConfig]:
        return list(self._contexts.values())
    
    def list_parents(self) -> List[ContextConfig]:
        return [c for c in self._contexts.values() if not c.parent]

    def get_base_context(self, context_id: str) -> str:
        if context_id in self._contexts:
            ctx = self._contexts[context_id]
            if ctx.parent:
                return ctx.parent
        return context_id.split('-')[0] if '-' in context_id else context_id

registry = ContextRegistry()
yaml_path = Path(__file__).parent / 'contexts.yaml'
if yaml_path.exists():
    registry.load_from_yaml(str(yaml_path))
else:
    logger.warning(f"Could not find {yaml_path}. ContextRegistry is empty.")
