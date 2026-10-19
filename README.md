# Hackathon Core Starter Kit 🚀

Starter kit modular e acelerado em **Python (Flask)** desenvolvido para criar aplicações completas rapidamente durante hackathons.

## ✨ O que já vem pronto:

1. **Autenticação Completa**:
   - Cadastro multi-etapas com suporte a **Pessoa Física (PF)** e **Pessoa Jurídica (PJ)**.
   - Login por email ou nome de usuário.
   - Validações completas de CPF, CNPJ, RG, CEP e telefone.
   - Integração com **Google OAuth 2.0**.
   - Verificação de email por tokens temporários com auto-expiração.
   - Suporte a autenticação em duas etapas (2FA).
   - Redefinição e recuperação de senha.
   - Sessões seguras com cookies criptografados via **Fernet**.

2. **Controle de Acesso por Diretórios (Zero Boilerplate)**:
   - Pastas `public/`: Acesso livre.
   - Pastas `common/`: Acesso restrito a usuários autenticados (redireciona para login se não autenticado).
   - Pastas `admin/`: Acesso restrito a administradores (`admin_user == True`).

3. **WebSockets em Tempo Real (Flask-SocketIO)**:
   - Handlers automáticos para gerenciamento de salas (`join_room`, `leave_room`).
   - Disparo de mensagens (`send_message`) e broadcast.
   - Testador de WebSockets interativo integrado na tela inicial (`Index.html`).

4. **Banco de Dados com Auto-Discovery**:
   - Criação automática de tabelas a partir de qualquer modelo em `myapp/models/`.
   - SQLite como fallback zero-config (`sqlite:///hackathon.db`) ou PostgreSQL/MySQL configurável.

5. **Console Administrativo Web (`/admin`)**:
   - Terminal interativo no navegador para consultas e modificações SQL diretas.
   - Ação de force logout por usuário ou global.

---

## 🚀 Como Rodar o Projeto

1. **Ative o ambiente virtual**:
   ```powershell
   .venv\Scripts\activate
   ```

2. **Configure o arquivo `.env`**:
   O arquivo `.env` já vem pré-configurado com SQLite. Se desejar usar PostgreSQL ou outros serviços (Google OAuth, Cloudinary, Gmail), configure as chaves em `.env` (baseado no `.env.example`).

3. **Inicie o servidor**:
   ```powershell
   python app.py
   ```
   Acesse no navegador: `http://localhost:5000`

---

## 📁 Estrutura de Pastas

```
myapp/
├── config.py             # Configurações do ambiente
├── context.py            # Variáveis globais disponíveis no Jinja (dados do usuário logado)
├── models/               # Modelos SQLAlchemy com auto-descoberta
├── repositories/         # Funções de consulta e persistência no banco
├── services/             # Regras de negócio, tokens, criptografia, emails e OAuth
├── sockets/              # Eventos de WebSocket
├── routes/
│   ├── actions/          # Endpoints de API (public, common, admin)
│   └── pages/            # Páginas HTML (public, common, admin)
├── templates/            # HTML (Jinja2)
└── static/               # CSS, JS e Assets
```

---

## 🛠️ Como Adicionar Funcionalidades

- **Nova Rota**: Crie um arquivo em `myapp/routes/{actions|pages}/{public|common|admin}/NomeDaRota.py` com um `Blueprint`. Ela será registrada automaticamente!
- **Novo Modelo**: Crie uma classe em `myapp/models/NomeDoModelo.py` herdando de `db.Model`. A tabela será criada automaticamente!
- **Novo Evento WebSocket**: Adicione handlers em `myapp/sockets/` usando `@socket_io.on("nome_do_evento")`.

Consulte o arquivo `.agents/skills/hackathon-system-guide/SKILL.md` ou `GEMINI.md` para o guia técnico completo.