# B4 — Levantamento de Forms Duplicados (SIS)

Data da coleta: 2026-03-16  
Fonte: MySQL GLPI (`glpi_plugin_formcreator_forms`, `glpi_plugin_formcreator_formanswers`) + comparação de schema via API `/domain/formcreator/forms/{id}/schema`.

## Resumo executivo

- Existem **15 pares** duplicados por `(categoria + nome)`.
- Em **14/15 pares**, os dois forms têm **schema idêntico**.
- Em **1/15 pares** (`Projeto`), há **diferença real de schema**.
- O uso real está fortemente concentrado no primeiro ID (mais antigo) na maioria dos pares.

## Tabela consolidada

| Nome | IDs | Answers total | Answers 90d | Último uso | Schema |
|---|---|---:|---:|---|---|
| Ar-Condicionado | 1 vs 21 | 193 vs 16 | 67 vs 9 | 2026-03-15 vs 2026-03-05 | Igual |
| Carregadores | 3 vs 22 | 2273 vs 123 | 408 vs 63 | 2026-03-13 vs 2026-03-12 | Igual |
| Copa | 4 vs 23 | 8 vs 0 | 0 vs 0 | 2025-09-16 vs sem uso | Igual |
| Elevadores | 2 vs 25 | 3 vs 0 | 0 vs 0 | 2025-12-02 vs sem uso | Igual |
| Elétrica | 5 vs 24 | 310 vs 8 | 77 vs 3 | 2026-03-13 vs 2026-03-11 | Igual |
| Hidráulica | 6 vs 26 | 158 vs 4 | 38 vs 0 | 2026-03-13 vs 2025-11-18 | Igual |
| Jardinagem | 7 vs 27 | 41 vs 1 | 7 vs 1 | 2026-03-13 vs 2025-12-16 | Igual |
| Limpeza | 8 vs 28 | 158 vs 11 | 22 vs 4 | 2026-03-13 vs 2026-01-29 | Igual |
| Marcenaria | 9 vs 29 | 340 vs 9 | 61 vs 5 | 2026-03-12 vs 2026-02-23 | Igual |
| Mensageria | 10 vs 30 | 585 vs 1 | 41 vs 1 | 2026-03-12 vs 2026-03-06 | Igual |
| Pedreiro | 11 vs 31 | 115 vs 5 | 30 vs 1 | 2026-03-12 vs 2026-01-28 | Igual |
| Pintura | 12 vs 32 | 53 vs 7 | 14 vs 3 | 2026-03-10 vs 2026-01-13 | Igual |
| Projeto | 15 vs 36 | 1 vs 0 | 0 vs 0 | 2025-07-17 vs sem uso | **Diferente** |
| Técnico de Redes | 13 vs 34 | 117 vs 1 | 23 vs 1 | 2026-03-12 vs 2026-03-09 | Igual |
| Vidraçaria | 14 vs 35 | 13 vs 0 | 1 vs 0 | 2026-03-08 vs sem uso | Igual |

## Interpretação prática

- Para quase todos os serviços, o segundo ID parece “cópia recente” de baixo uso.
- `Projeto` precisa de tratamento separado, porque não é duplicata perfeita.

## Mapa canônico sugerido (baseado em uso real)

- Ar-Condicionado: `1` (secundário `21`)
- Carregadores: `3` (secundário `22`)
- Copa: `4` (secundário `23`)
- Elevadores: `2` (secundário `25`)
- Elétrica: `5` (secundário `24`)
- Hidráulica: `6` (secundário `26`)
- Jardinagem: `7` (secundário `27`)
- Limpeza: `8` (secundário `28`)
- Marcenaria: `9` (secundário `29`)
- Mensageria: `10` (secundário `30`)
- Pedreiro: `11` (secundário `31`)
- Pintura: `12` (secundário `32`)
- Projeto: `15` (secundário `36`) — revisar regra antes de consolidar por haver diferença de schema
- Técnico de Redes: `13` (secundário `34`)
- Vidraçaria: `14` (secundário `35`)

## Critério técnico recomendado para consolidação segura

1. Não remover nada agora.
2. Definir um **ID canônico por par** (maior histórico de uso + uso recente).
3. No frontend, exibir apenas o canônico por padrão e manter secundário em modo compatibilidade (temporário).
4. Após janela de observação sem regressão, desativar no GLPI apenas os duplicados idênticos sem uso recente relevante.
5. Tratar `Projeto (15 vs 36)` como caso de decisão de negócio antes de qualquer consolidação.
