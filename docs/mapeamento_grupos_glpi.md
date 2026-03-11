# Consolidado de Capability Tags (Hub-App-*) no GLPI

Este documento define a lista final e obrigatória de grupos que devem ser criados no GLPI para controlar a visibilidade dos módulos no Hub.

## 1. Tags Globais (Comuns a ambos contextos)

| Nome do Grupo no GLPI | Funcionalidade Liberada | Quem deve ter? |
|-----------------------|-------------------------|----------------|
| `Hub-App-busca`       | Smart Search (Buscadores) | Técnicos e Gestores |
| `Hub-App-permissoes`  | Gestão de Acessos (Matriz) | Administradores e Governadores |

---

## 2. Tags Específicas: Contexto SIS (Manutenção & Serviços)

| Nome do Grupo no GLPI | Funcionalidade Liberada | Quem deve ter? |
|-----------------------|-------------------------|----------------|
| `Hub-App-sis-dashboard`| Dashboard Geral (Manutenção e Conservação) | Gestores e Coordenadores SIS |
| `Hub-App-carregadores` | Dashboard de Carregadores | Gestores de frotas e transportes |

---

## 3. Tags Específicas: Contexto DTIC (Tecnologia & Governança)

| Nome do Grupo no GLPI | Funcionalidade Liberada | Quem deve ter? |
|-----------------------|-------------------------|----------------|
| `Hub-App-dtic-metrics` | Dashboard de Métricas de Tickets (SLA/Volume) | Gestores de núcleo e técnicos DTIC |
| `Hub-App-dtic-kpi`     | Dashboard de Governança e KPIs Estratégicos | Direção e Coordenadores |
| `Hub-App-dtic-infra`   | Dashboard de Dados de Infraestrutura e Rede | Equipe de Infraestrutura |

---

## Observações de Implementação

1. **Case-Sensitivity**: O sistema converte tudo para minúsculas internamente, mas por padrão, use os nomes exatamente como listados acima para evitar confusão.
2. **Setup**:
    - Crie os grupos em `Administração > Grupos`.
    - Adicione os usuários desejados a estes grupos.
    - O usuário precisará fazer **Logoff e Login** no Hub para que a nova permissão seja carregada na sessão.
3. **Escopo**: Estas tags controlam apenas a **visibilidade** na Sidebar e o acesso às rotas. As permissões de edição dentro do módulo podem depender de perfis adicionais (técnico vs gestor).
