# n8n-mcp-cli

<p align="center">
  <img src="assets/banner.svg" alt="n8n-mcp-cli" width="100%"/>
</p>

<p align="center">
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-E8784A.svg" alt="Licença: MIT"/></a>
  <a href="https://modelcontextprotocol.io"><img src="https://img.shields.io/badge/MCP-Compatible-D4A574.svg" alt="MCP Compatível"/></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-5.7-blue.svg" alt="TypeScript"/></a>
  <a href="https://n8n.io"><img src="https://img.shields.io/badge/n8n-2.12+-FF6D5A.svg" alt="n8n"/></a>
</p>

<p align="center">
  <strong>Plataforma de QA e saúde de workflows n8n pronta para produção</strong><br/>
  <em>Validação governada, diagnósticos e prontidão operacional para automação de workflows.</em>
</p>

---

## Porquê?

A maioria das integrações MCP para n8n dá **acesso total de admin** — credenciais, operações destrutivas, loops de auto-fix. Isso funciona para desenvolvimento. É arriscado para CI, ambientes partilhados ou agentes autónomos.

O `n8n-mcp-cli` segue uma abordagem diferente:

| Funcionalidade | Este MCP | MCPs admin completos |
|----------------|----------|---------------------|
| Validação & scoring de workflows | ✅ Sim | ❌ Não |
| Análise de trace de execução (timing, erros, regressão) | ✅ Sim | ❌ Não |
| Classificação de falhas (lógica/infra/dados/perm/timeout) | ✅ Sim | ❌ Não |
| Sugestão de nodes para tarefas | ✅ Sim | ❌ Não |
| Versão n8n + health check | ✅ Sim | ❌ Não |
| **Gestão de credenciais** | ❌ Excluída | ✅ Sim |
| **Ciclo de vida de secrets** | ❌ Excluída | ✅ Sim |
| **Loops de auto-reparo destrutivos** | ❌ Excluída | ✅ Alguns |

**Resultado:** Uma camada operacional focada que faz validação, diagnóstico e avaliação de saúde realmente bem, sem a superfície de risco de um wrapper admin completo.

---

## Início Rápido

### 1. Instalar

```bash
git clone https://github.com/Souzix76/n8n-mcp-cli.git
cd n8n-mcp-cli
npm install && npm run build
```

### 2. Configurar

```bash
cp .env.example .env  # Criar a partir do template
# Editar .env com o URL e API key do n8n
```

```env
N8N_BASE_URL=http://127.0.0.1:5678
N8N_API_KEY=your_n8n_api_key_here
DEFAULT_TIMEOUT_MS=30000
```

### 3. Executar

**Como servidor MCP** (para Hermes Agent, Claude/Codex, ou qualquer cliente MCP):

```bash
# Modo read-only (padrão)
node dist/mcp/server.js

# Ou programaticamente com modo de credencial:
# const server = createMcpServer(client, 'read-only'); // ou 'external'
```

**Como CLI** — *A camada CLI é module-only (ainda sem entry point executável). Importar funções diretamente:*

```js
import { validateV2Project } from './dist/cli/validate.js';
import { generateV2Report, generateV2ReportCi } from './dist/cli/report.js';
// etc.
```

*CLI executável a chegar na Fase 3.*

---

## Configuração de Cliente MCP

### Hermes Agent / Claude Code (`~/.claude.json`)

```json
{
  "mcpServers": {
    "n8n-mcp-cli": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/n8n-mcp-cli/dist/mcp/server.js"],
      "env": {
        "N8N_BASE_URL": "http://localhost:5678",
        "N8N_API_KEY": "your_api_key"
      }
    }
  }
}
```

### Codex / Qualquer cliente MCP

O servidor usa **stdio transport** — compatível com qualquer cliente MCP que suporte stdio.

---

## Como Funciona

### Fronteira de Credenciais (Read-Only por Defeito)

O servidor MCP impõe uma fronteira estrita de credenciais via a factory `createMcpServer`:

| Modo | Ferramentas Permitidas | Caso de Uso |
|------|------------------------|-------------|
| **read-only** (padrão) | `validate_workflow`, `get_workflow_health`, `get_n8n_version`, `suggest_nodes`, `diagnose_workflow` | Inspeção segura, validação, diagnósticos |
| **external** | Todas read-only + `create_workflow` | Operações de escrita que requerem credenciais |

```js
// Uso programático:
import { createMcpServer } from './dist/mcp/server.js';
import { N8nClient } from './dist/core/n8n-client.js';

const client = new N8nClient({ baseUrl: 'http://localhost:5678', apiKey: '...' });

// Read-only (padrão)
const server = createMcpServer(client, 'read-only');

// Modo external (operações de escrita)
const server = createMcpServer(client, 'external');
```

**Tratamento de erros:** `CredentialBoundaryError` dá mensagens de remediação acionáveis quando uma tool é chamada num modo incompatível.

---

### Pipeline de Diagnóstico

A tool `diagnose_workflow` executa um pipeline de diagnóstico de três etapas:

```
Dados de Execução → Análise de Trace → Classificação de Falha → Detecção de Regressão
```

**Análise de Trace** — Timing por nó, erros, contagem de items, fluxo de dados
**Classificação de Falha** — Taxonomia: logic | infrastructure | data | permission | timeout
**Detecção de Regressão** — Padrões de recorrência através de runs históricos

### Exemplo de Output

```json
{
  "workflowId": "1hO3EGpPD5es3pi7",
  "trace": {
    "nodes": 20,
    "totalDurationMs": 3450,
    "nodeTimings": [
      {"name": "HTTP Request", "durationMs": 1200, "status": "success"},
      {"name": "IF", "durationMs": 45, "status": "success"}
    ],
    "errors": []
  },
  "classification": {
    "failures": [
      {"node": "HTTP Request", "type": "infrastructure", "severity": "warning", "message": "Timeout risk detected"}
    ]
  },
  "regression": {
    "recurringFailures": 2,
    "patterns": ["timeout:webhook", "permission:credential"]
  },
  "health": {
    "score": 92,
    "status": "stable"
  }
}
```

---

## Referência de Tools

### Diagnósticos & Validação (5 tools)

| Tool | Descrição | Modos |
|------|-----------|-------|
| `validate_workflow` | Validar workflow e retornar resumo de risco/saúde sem mutar | read-only, external |
| `get_workflow_health` | Retornar score de saúde e resumo de risco do workflow | read-only, external |
| `get_n8n_version` | Obter versão do servidor n8n + health check (nota limitação API) | read-only, external |
| `suggest_nodes` | Sugerir nodes compatíveis baseados na descrição da tarefa | read-only, external |
| `diagnose_workflow` | Diagnóstico completo: trace analysis, classificação, regressão | read-only, external |

### Operações de Escrita (1 tool)

| Tool | Descrição | Modos |
|------|-----------|-------|
| `create_workflow` | Criar novo workflow (placeholder, requer modo external) | external |

---

## CLI (Module-Only)

*CLI executável ainda não disponível — camada CLI é module-only. Usar servidor MCP ou importar funções diretamente.*

```js
// Módulos disponíveis em dist/cli/
import { validateV2Project } from './dist/cli/validate.js';
import { runV2Suite } from './dist/cli/run.js';
import { generateV2Report, generateV2ReportCi } from './dist/cli/report.js';
import { registryGenerate, registryValidate } from './dist/cli/registry.js';
import { startMcpServer } from './dist/cli/mcp.js';
```

*Comando executável `n8n-mcp-cli` a chegar na Fase 3.*

---

## Arquitetura

```
├── cli/              # Camada CLI — CI/CD, checks scriptáveis, reports
├── core/             # Core partilhado — segurança, validação, saúde, retry, erros
├── diagnostics/      # Trace analysis, classificação de falha, regressão
├── mcp/              # Camada MCP — surface de tools AI-safe, fronteira credencial
├── recommendations/  # Health scoring, compatibility checks
├── reports/          # JSON, Markdown, HTML, JUnit reports
├── registry/         # Manifest MCP registry
├── testing/          # Fundações de assertion e suite execution
└── examples/         # CI validation, health check examples
```

### Princípios de Design

- **Read-only por defeito** — Inspeção segura sem mutação
- **Dry-run para paths de mutação** — Validar antes de escrever
- **Fronteira de credencial explícita** — Modos `read-only` vs `external`
- **Diagnósticos estruturados sobre logs crus** — Traces baseados em evidência
- **Validação environment-aware** — Contexto importa
- **Segurança de produção sobre volume de features** — Camada operacional de confiança
- **Sem gestão de ciclo de vida de credenciais** — Não lê, cria ou apaga credenciais
- **Sem loops de auto-reparo destrutivos** — Reporta issues, não auto-fixa

---

## Exemplos de Config

O diretório `examples/` inclui workflows prontos a usar:

| Ficheiro | Descrição |
|----------|-----------|
| `ci-validation.json` | Exemplo de workflow validação CI |
| `health-check.json` | Exemplo health check workflow (modo read-only) |

---

## Postura de Segurança

### Incluído

- Validação de workflow e health scoring
- Análise de trace de execução (timing, erros, fluxo de dados)
- Classificação de falhas com taxonomia
- Detecção de regressão através de runs históricos
- Sugestão de nodes para tarefas
- Versão n8n + health check
- Geração/validação manifest MCP registry
- Reporting multi-formato (JSON, Markdown, HTML, JUnit)

### Excluído Deliberadamente

- Gestão de credenciais
- Ciclo de vida de secrets
- Flows de restore destrutivos
- Loops de auto-fix LLM autónomos
- Operações de deploy produção

---

## Roadmap

- [x] Fase 1 — Fundação governança e segurança (Credential Boundary, CLI flags, MCP tools)
- [x] Fase 2 — Integração API n8n (endpoints `/api/v1/` reais, extração API key SQLite)
- [ ] Fase 3 — Validação e suite execution
- [ ] Fase 4 — Diagnósticos e análise de regressão
- [ ] Fase 5 — Motor de recomendação e compatibilidade
- [ ] Fase 6 — Reporting e maturidade operacional

---

## Contribuir

1. Fork o repo
2. Criar feature branch (`git checkout -b feat/my-feature`)
3. Commit mudanças (`git commit -m 'feat: add my feature'`)
4. Push para branch (`git push origin feat/my-feature`)
5. Abrir Pull Request

---

## Licença

[MIT](LICENSE)

---

Desenvolvido para operadores [n8n](https://n8n.io/) que querem validação e diagnósticos sem a superfície de risco.

Compatível com [Hermes Agent](https://hermes-agent.nousresearch.com/), [Claude/Codex](https://claude.ai/), e qualquer cliente MCP.