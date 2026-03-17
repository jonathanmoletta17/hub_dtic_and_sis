# Plano de Implementação: Ingestão de Documentos (Upload & Parsing)

Este plano detalha a estratégia de engenharia para implementar a capacidade de upload e extração de dados estruturados a partir de múltiplos formatos de arquivo (.csv, .xlsx, .md, .txt, .docx, .pdf), garantindo que o LLM (Qwen2.5) receba dados limpos sem superlotar o servidor Node.js.

## Estratégia Principal: Entregas Faseadas e Híbridas
A implementação ocorrerá em **duas grandes fases**, minimizando riscos técnicos e entregando valor imediato ao usuário, respeitando a atual stack em Node.js (React/Vite).

---

## 🛠️ Fase 1: Ingestão Nativa e Formatos Simples (Ecossistema Atual)

**Objetivo:** Permitir o upload imediato de arquivos cujo parsing direto para texto/JSON no Node.js seja seguro e determinístico, sem necessidade de ferramentas de visão de máquina ou OCR.
**Formatos Alvo:** `.txt`, [.md](file:///c:/Users/jonathan-moletta/code/storageEinconsistenciasIDES/knowledge_base_projects/README.md), `.csv`, `.xlsx`.

### 1.1 Modificações no Frontend (UI/UX)
*   **Componente de Upload (`src/components/UploadDropzone.jsx`)**: 
    *   Criar um componente visual de *drag-and-drop* dentro do [ImportModal.jsx](file:///c:/Users/jonathan-moletta/code/storageEinconsistenciasIDES/knowledge_base_claudecode/src/components/ImportModal.jsx) ou como uma nova rota dedicada à ingestão de arquivos.
    *   Implementar validação de extensão de arquivo (`accept=".csv,.xlsx,.txt,.md"`) e tamanho máximo (ex: 10MB).
    *   Exibir feedback visual de progresso (barra de carregamento, ícone de sucesso/erro).

### 1.2 Parsing Client-Side ou Server-Side Light
Como estamos numa SPA (React), podemos usar o poder do navegador para processar formatos simples sem onerar o backend.
*   **TXT/MD**: Leitura direta via API nativa do navegador (`FileReader`). O texto é capturado em sua forma bruta e injetado diretamente no prompt da IA (como já fazemos copiando e colando).
*   **CSV/XLSX**: 
    *   Utilizar a biblioteca **`xlsx` (SheetJS)** (versão client-side).
    *   A biblioteca vai ler as linhas da planilha e convertê-las para um Array de Objetos JSON limpo ou uma string formatada em Markdown Table (ideal para LLMs).
    *   *Exemplo:* Transformar a linha 1 em Cabeçalho e iterar as linhas subsequentes como valores separados por " | ".

### 1.3 Integração com o LLM (`storage.js / deep_validation.js`)
*   O texto limpo resultante do parsing é empacotado e enviado ao modelo local via Ollama simulando o comportamento atual do "ImportModal", respeitando os prompts de extração (CoT) da Fase anterior.
*   **Validação E2E da Fase 1**: Subir planilhas de testes e arquivos Markdowns longos, atestando que o React não trava no parsing e que o Ollama não alucina.

---

## 🚀 Fase 2: Ingestão Híbrida Inteligente (Arquivos Complexos)

**Objetivo:** Processar e extrair dados hierárquicos e layout visual com perfeição de PDFs e arquivos de Word que quebram facilmente parsers baseados em strings estáticas.
**Formatos Alvo:** `.pdf`, `.docx`.

### 2.1 A Arquitetura do Microserviço Auxiliar (Python)
Para blindar a API Node.js principal, introduziremos um servidor levíssimo local que operará exclusivamente a engenharia de Parsing Avançado (Visão Computacional e extração geométrica de tabelas nativas de PDFs).

*   **Setup Rápido:** Um servidor API em **FastAPI (Python)** rodando localmente (ex: porta `8000`).
*   **Motor Principal**: Utilizaremos a biblioteca **IBM Docling** ou **PyMuPDF4LLM**. Ambas são o estado-da-arte open source para ler IDs visuais de PDFs (Header, Título, Imagem, Grids de Tabela) e devolver o documento reconstruído como um **Markdown 100% legível** por LLMs.

### 2.2 O Fluxo de Dados Bidirecional (Node -> Python -> Ollama)
1.  O Frontend React (Node) recebe o `.pdf` ou `.docx` do usuário.
2.  Em vez de rodar o parsing no Browser, o Node envia o binário (blob) via HTTP Request (POST) para o nosso microserviço FastAPI (`http://localhost:8000/parse`).
3.  A rotina rica do IBM Docling devora o arquivo e devolve ao Node.js uma string Markdown perfeita, contendo todas as formatações, links e tabelas respeitadas.
4.  O Node.js então envia esse Markdown para o LLM local (`qwen2.5-coder:14b`) via roteador `/api/ollama` para seguir a extração de resumos e tags padrão da base de conhecimento.

### 2.3 Tratamento de Erros e Timeouts
*   Arquivos pesados no microserviço podem levar vários segundos (10s a 20s). 
*   O Frontend precisará exibir "Processando Estrutura Visual do Documento..." e o `fetch` da API Node para a API Python precisará de timeout seguro (excesso de 60s).

---

## 📅 Resumo Executivo e Cronograma Sugerido

| Etapa | Foco Técnico | Entrega de Valor | Risco / Dependência |
| :--- | :--- | :--- | :--- |
| **Fase 1** | Upload de Componente, SheetJS, FileReader nativo. | Ingestão de *XLSX, CSV, TXT, MD* através de soltar arquivo. Fim do Copy/Paste lento. | **Baixo**. Componentes nativos e bibliotecas maduras em JS. |
| **Fase 2** | Subir Microserviço FastAPI local, Docling/PyMuPDF. | Ingestão de *PDFs* e Documentações Pesadas (*DOCX*) respeitando layout e tabelas internas. | **Médio**. Requer Python no ambiente do SO e gerenciamento de 2 servidores rodando juntos. |

**Aprovação:** Todo o design foi construído mirando na escalabilidade sem reinventar a roda ou criar gargalos de hardware. Aguardamos a validação deste plano para iniciarmos a Codificação da Fase 1 imediatamente no frontend React.
