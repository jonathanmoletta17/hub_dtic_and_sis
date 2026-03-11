#!/usr/bin/env python3
"""
Verificação de Contratos — tensor-aurora / hub_dtic_and_sis
Runner standalone: executa SEM pytest, SEM pyyaml, SEM imports do app.
Usa AST + regex para introspecção estática — apenas stdlib Python.

Referência: ARCHITECTURE_RULES.md → Contratos Imutáveis
"""

import ast
import re
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent

PASS = 0
FAIL = 0


def check(name: str, condition: bool, msg: str = ""):
    global PASS, FAIL
    if condition:
        PASS += 1
        print(f"  ✅ {name}")
    else:
        FAIL += 1
        print(f"  ❌ {name} — {msg}")


def get_fields(filepath: str, class_name: str) -> set:
    """Extrai campos anotados de um BaseModel via AST."""
    source = (BASE / filepath).read_text(encoding="utf-8")
    tree = ast.parse(source)
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef) and node.name == class_name:
            fields = set()
            for item in node.body:
                if isinstance(item, ast.AnnAssign) and isinstance(item.target, ast.Name):
                    fields.add(item.target.id)
            return fields
    raise ValueError(f"Classe '{class_name}' não encontrada em {filepath}")


def get_dict_from_func(filepath: str, func_name: str, var_name: str) -> dict:
    """Extrai dict literal de função via AST."""
    source = (BASE / filepath).read_text(encoding="utf-8")
    tree = ast.parse(source)
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef) and node.name == func_name:
            for child in ast.walk(node):
                if isinstance(child, ast.Assign):
                    for target in child.targets:
                        if isinstance(target, ast.Name) and target.id == var_name:
                            return ast.literal_eval(child.value)
    raise ValueError(f"'{var_name}' não encontrado em {func_name}()")


def get_roles_from_yaml(filepath: str) -> set:
    """Extrai roles do contexts.yaml via regex (sem pyyaml)."""
    content = (BASE / filepath).read_text(encoding="utf-8")
    return set(re.findall(r'role:\s*([\w-]+)', content))


# ═══════════════════════════════════════════════════════════
print("\n═══ CONTRATO 1: LoginResponse (auth_schemas.py) ═══")
fields = get_fields("app/schemas/auth_schemas.py", "LoginResponse")
for f in ["session_token", "hub_roles", "app_access", "context", "user_id", "roles"]:
    check(f"LoginResponse.{f}", f in fields, "Campo removido!")

# ═══════════════════════════════════════════════════════════
print("\n═══ CONTRATO 1b: AuthMeResponse ═══")
fields = get_fields("app/schemas/auth_schemas.py", "AuthMeResponse")
for f in ["hub_roles", "app_access", "context", "user_id"]:
    check(f"AuthMeResponse.{f}", f in fields, "Campo removido!")

# ═══════════════════════════════════════════════════════════
print("\n═══ CONTRATO 1c: HubRole ═══")
fields = get_fields("app/schemas/auth_schemas.py", "HubRole")
for f in ["role", "label", "route", "context_override"]:
    check(f"HubRole.{f}", f in fields, "Campo removido!")

# ═══════════════════════════════════════════════════════════
print("\n═══ CONTRATO 2: Roles semânticos (contexts.yaml) ═══")
ROLES_VALIDOS = {"gestor", "tecnico", "tecnico-manutencao", "tecnico-conservacao", "solicitante"}
roles_encontrados = get_roles_from_yaml("app/core/contexts.yaml")
desconhecidos = roles_encontrados - ROLES_VALIDOS
check("Nenhum role desconhecido", len(desconhecidos) == 0, f"Novos roles: {desconhecidos}")

# ═══════════════════════════════════════════════════════════
print("\n═══ CONTRATO 3: Grupos Hub-App-* (admin.py) ═══")
allowed = get_dict_from_func("app/routers/admin.py", "validate_hub_app_group", "allowed_groups")
DTIC_IDS = {109, 110, 112, 113, 114}
SIS_IDS = {102, 104, 105}
check("Grupos DTIC completos", not (DTIC_IDS - set(allowed.get("dtic", []))),
      f"Faltando: {DTIC_IDS - set(allowed.get('dtic', []))}")
check("Grupos SIS completos", not (SIS_IDS - set(allowed.get("sis", []))),
      f"Faltando: {SIS_IDS - set(allowed.get('sis', []))}")
check("Rejeita ID 999", 999 not in allowed.get("dtic", []) and 999 not in allowed.get("sis", []))

# ═══════════════════════════════════════════════════════════
print("\n═══ CONTRATO 4: AdminUserResponse (admin.py) ═══")
fields = get_fields("app/routers/admin.py", "AdminUserResponse")
for f in ["id", "username", "realname", "firstname", "profiles", "groups", "app_access", "roles"]:
    check(f"AdminUserResponse.{f}", f in fields, "Campo removido!")

fields_grp = get_fields("app/routers/admin.py", "GroupAssignmentRequest")
check("GroupAssignmentRequest.group_id", "group_id" in fields_grp, "Campo removido!")

fields_rev = get_fields("app/routers/admin.py", "RevokeGroupResponse")
for f in ["success", "message", "user_id", "group_id"]:
    check(f"RevokeGroupResponse.{f}", f in fields_rev, "Campo removido!")

# ═══════════════════════════════════════════════════════════
print(f"\n{'═' * 40}")
total = PASS + FAIL
if FAIL == 0:
    print(f"  ✅ TODOS OS {PASS} CONTRATOS ÍNTEGROS")
    sys.exit(0)
else:
    print(f"  ❌ {FAIL} CONTRATO(S) QUEBRADO(S) de {total}")
    sys.exit(1)
