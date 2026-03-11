# Relatório de Diagnóstico de Performance

Este documento detalha o estado atual do sistema após as reclamações de alto uso de CPU e falta de uso de GPU.

## 1. Diagnóstico de Recursos (Hardware)

### GPU (NVIDIA)

- **Status**: Reconhecida e Operacional.
- **Memória Total**: 16 GB (16376 MiB).
- **Uso Observado**: Durante a execução do modelo `qwen2.5-coder:14b`, a alocação foi parcial (~1.7GB a 2.5GB inconsistentes).
- **Gargalo**: O modelo de 14B deveria ocupar significativamente mais VRAM. O uso reduzido indica que o Ollama está descarregando camadas para a **CPU**, causando o lentidão relatada.

### CPU

- **Carga de Trabalho**: Foram encontrados múltiplos processos `npm run dev` e `node deep_validation.js` rodando em paralelo, somados ao fallback do Ollama.
- **Ação Tomada**: Todos os processos de desenvolvimento foram interrompidos para liberar o processador.

## 2. Status do Ollama (Pós-Liberação de VRAM)

- **Modelo**: `qwen2.5-coder:14b`
- **Performance de Teste Atualizada**:
  - **Load Duration**: 5.33s
  - **Prompt Eval**: 428.68 tokens/s (Excelente aceleração)
  - **Generation Rate**: 41.92 tokens/s (Salto massivo de qualidade - antes estava em 5.44 t/s).
- **Diagnóstico Confirmado**: O container desligado pelo usuário estava retendo a memória de vídeo, forçando o modelo 14B a trabalhar alocado parcialmente na RAM (Fallback para CPU), o que reduzia a performance quase 10 vezes e travava os aplicativos base. Seu desligamento estabilizou 100% o ambiente.

## 3. Plano de Recuperação

1. **Reinicialização Limpa**: Iniciar apenas UM servidor de cada vez.
2. **Priorização de GPU**: Forçar o Ollama a subir o modelo com parâmetros de GPU explícitos (se necessário via variáveis de ambiente `OLLAMA_NUM_PARALLEL`).
3. **Estabilização do Frontend**: O erro de "nada abre" no browser deve-se aos processos zumbis que travam as portas 5173/5174.

---

> [!NOTE]
> Estabilização confirmada. A GPU está rodando solta e o fallback para CPU parou. O Claudecode pode ser iniciado novamente com velocidade total.
