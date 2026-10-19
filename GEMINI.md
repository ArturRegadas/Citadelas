# Hackathon Starter Guidelines & Architecture Rules

## Visão Geral do Projeto
Este projeto é um starter kit em **Flask + SQLAlchemy + Flask-SocketIO + Jinja2** otimizado para hackathons.
Conta com sistema de auto-descoberta de rotas, modelos e sockets, autenticação robusta (PF/PJ, Google OAuth, Tokens, 2FA) e controle de acesso hierárquico por diretórios.

## Regras Críticas de Desenvolvimento

### 1. Sistema de Rotas por Pastas (`myapp/routes/`)
O nível de acesso a qualquer rota é definido pelo nome da subpasta imediata onde o Blueprint está:
- Pastas com nome `public/` (ex: `myapp/routes/pages/public/`): Rota pública, sem login.
- Pastas com nome `common/` (ex: `myapp/routes/pages/common/`): Rota restrita a usuários logados (`session["user_id"]`). Se não autenticado, redireciona para a página de login.
- Pastas com nome `admin/` (ex: `myapp/routes/actions/admin/`): Restrita a administradores (`session["admin"] == True`). Aborta 403 se não for admin.

### 2. Auto-descoberta de Modelos (`myapp/models/`)
- Todos os arquivos `.py` em `myapp/models/` são importados dinamicamente em `myapp/setup/createTables.py`.
- Para criar uma nova tabela, basta adicionar um arquivo com a classe herdando de `db.Model` em `myapp/models/`.

### 3. Auto-descoberta de WebSockets (`myapp/sockets/`)
- Todos os arquivos `.py` em `myapp/sockets/` são carregados dinamicamente em `myapp/setup/createSocketEvents.py`.
- Eventos genéricos prontos: `connect`, `disconnect`, `join_room`, `leave_room`, `send_message`, `ping_server`.

### 4. Como Executar
```powershell
.venv\Scripts\python.exe app.py
```
Default DB: SQLite (`sqlite:///hackathon.db`) ou PostgreSQL configurável via `.env`.
Default Cache: SimpleCache ou Redis configurável via `.env`.

### 5. Documentação & Skill
Consulte a skill em `.agents/skills/hackathon-system-guide/SKILL.md` para exemplos completos de código.
