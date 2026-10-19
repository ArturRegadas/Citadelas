---
name: hackathon-system-guide
description: >-
  Guia completo da arquitetura e convenções do projeto Hackathon Starter (Flask, SQLAlchemy,
  SocketIO, Auth PF/PJ, Permissões Automáticas por Pastas, e Painel Admin). Use esta skill
  para entender a estrutura do sistema, como adicionar novos modelos, novas rotas públicas/autenticadas/admin,
  novos eventos de WebSocket, e como construir funcionalidades rapidamente durante a hackathon.
---

# Hackathon System Guide & Architecture Playbook

Este projeto é um **Starter Kit modular e escalável** em Python (Flask) projetado para acelerar o desenvolvimento durante hackathons. Ele fornece autenticação completa, controle de permissões por pastas, WebSockets em tempo real, banco de dados desacoplado e painel administrativo.

---

## 1. Visão Geral da Arquitetura

O sistema adota o padrão **Factory + Auto-Discovery**:
- **Entrypoint**: `app.py` cria a aplicação via `create_app()` e inicia o servidor com `socketIo.run(app)`.
- **Configuração**: `myapp/config.py` centraliza variáveis de ambiente (.env), com fallbacks seguros (SQLite por padrão para rodar imediatamente sem configurar PostgreSQL se não quiser).
- **Auto-Discovery**:
  - Modelos em `myapp/models/` são descobertos e criados automaticamente no banco (`db.create_all()`).
  - Rotas em `myapp/routes/` são registradas automaticamente como Blueprints.
  - Eventos de Socket em `myapp/sockets/` são importados e ativados automaticamente.

```
hackaton/
├── app.py                      # Ponto de entrada do servidor (SocketIO + Flask)
├── .env / .env.example         # Configurações de ambiente
├── myapp/
│   ├── __init__.py             # Factory create_app()
│   ├── config.py               # Configurações do sistema (DB, Cache, Mail, Keys)
│   ├── context.py              # Context Processor do Jinja (injeta dados do usuário logado)
│   ├── extensions.py           # Instâncias compartilhadas (db, socket_io, cache)
│   ├── initExtensions.py       # Inicialização sequencial dos componentes
│   ├── setup/                  # Motores de inicialização e auto-descoberta
│   │   ├── InitSqlAlchemy.py   # Inicialização do SQLAlchemy
│   │   ├── createTables.py     # Varredura automática de myapp/models
│   │   ├── registerRoutes.py   # Varredura automática de myapp/routes com permissões
│   │   ├── PermissionRequire.py# Interceptor de autorização (before_request)
│   │   ├── InitSocket.py       # Inicialização do Flask-SocketIO
│   │   ├── createSocketEvents.py# Varredura automática de myapp/sockets
│   │   ├── InitCache.py        # Cache de dados com decorador @cached
│   │   ├── InitImageDb.py      # Configuração do Cloudinary
│   │   └── registerHandlers.py # Tratamento global de erros (403, 404)
│   ├── models/                 # Modelos SQLAlchemy (Users, Addresses, Settings, etc.)
│   ├── repositories/           # Camada de acesso a dados (UserRepository, AddressRepository)
│   ├── services/               # Lógica de negócio (Auth, Sockets, GoogleAuth, Email, Cookies)
│   ├── sockets/                # Handlers de WebSockets (Room.py)
│   ├── routes/                 # Blueprints organizados por nível de permissão
│   │   ├── actions/            # Endpoints de API / mutação (POST/PUT/DELETE)
│   │   │   ├── public/         # Rotas públicas (Login, SignUp, Auth)
│   │   │   ├── common/         # Rotas autenticadas (Logout, Address, Photo, Config)
│   │   │   └── admin/          # Rotas de administrador (Bash SQL, ForceLogout, UpImage)
│   │   └── pages/              # Rotas que renderizam HTML (GET)
│   │       ├── public/         # Páginas públicas (Home, Login, SignUp, About, etc.)
│   │       ├── common/         # Páginas autenticadas (Profile, Config)
│   │       └── admin/          # Páginas de administrador (Admin terminal)
│   ├── templates/              # Templates Jinja2 (HTML)
│   ├── static/                 # CSS, JavaScript e imagens
│   └── utils/                  # Utilitários (validações CPF/CNPJ/Email, mascaras, paginação)
```

---

## 2. O Segredo das Permissões Automáticas por Pastas

O arquivo `myapp/setup/registerRoutes.py` varre recursivamente toda a pasta `myapp/routes`.
O nível de permissão de qualquer rota é determinado pelo **nome da pasta imediata** onde ela está localizada:

| Nome da Pasta | Nível de Acesso | Comportamento |
| :--- | :--- | :--- |
| `public` | Livre para todos | Nenhuma autenticação exigida. |
| `common` | Usuário Autenticado | Exige que o usuário tenha sessão ativa (`session["user_id"]`) ou cookie criptografado Fernet. Caso não esteja logado, redireciona automaticamente para a tela de login. |
| `admin` | Administrador | Exige autenticação e `session["admin"] == True`. Caso contrário, aborta com código `403 Forbidden`. |

### Como criar uma nova rota:
Basta criar um arquivo `.py` dentro da pasta apropriada contendo um Blueprint:
```python
# Exemplo: myapp/routes/pages/common/DashboardPage.py
from flask import Blueprint, render_template

dashboard_bp = Blueprint("dashboardPage", __name__)

@dashboard_bp.route("/dashboard")
def DashboardPage():
    return render_template("Dashboard.html")
```
> O sistema registrará a rota `/dashboard` automaticamente e garantirá que apenas usuários logados consigam acessá-la!

---

## 3. Banco de Dados e Modelos Automáticos

### Auto-Discovery:
Ao iniciar a aplicação, `myapp/setup/createTables.py` importa todos os módulos dentro de `myapp/models/` e executa `db.create_all()`.

### Como criar um novo modelo:
Crie um arquivo em `myapp/models/NomeDoModelo.py`:
```python
# Exemplo: myapp/models/Tasks.py
from myapp.setup.InitSqlAlchemy import db
from datetime import datetime

class tasks(db.Model):
    task_id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    completed = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
```
Pronto! Ao iniciar o app, a tabela `tasks` será criada automaticamente no banco de dados.

### Modelos já existentes no sistema:
- `users`: Armazena dados cadastrais, credenciais (hash Werkzeug), foto, saldo/wallet, flags `admin_user` e `force_logout`.
- `physical_persons`: Dados complementares de Pessoa Física (RG, data de nascimento, gênero).
- `legal_persons`: Dados de Pessoa Jurídica (CNPJ, Razão Social, Nome Fantasia, Inscrição Estadual).
- `addresses`: Endereços dos usuários (Rua, Número, CEP, Bairro, Cidade, Estado, flag `principal_address`).
- `settings`: Configurações de segurança e conta (2FA, modo anônimo).

---

## 4. WebSockets em Tempo Real (Flask-SocketIO)

O WebSocket já está configurado e integrado ao sistema de auto-descoberta em `myapp/sockets/`.

### Eventos padrão disponíveis (`myapp/sockets/Room.py`):
- `connect`: Notifica conexão, associa ID de sessão e usuário.
- `disconnect`: Registra saída.
- `join_room`: Insere o cliente em uma sala (`room_id`) e dispara evento `room_joined`.
- `leave_room`: Remove o cliente de uma sala e dispara `room_left`.
- `send_message`: Envia mensagens em tempo real para uma sala específica ou faz broadcast geral (dispara `new_message`).
- `ping_server`: Responde com `pong_server` e timestamp.

### Como conectar e usar no Frontend:
```html
<script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
<script>
  const socket = io();

  // Ao conectar, entrar em uma sala
  socket.on("connect", () => {
    socket.emit("join_room", { room_id: "sala-123" });
  });

  // Escutar mensagens recebidas
  socket.on("new_message", (data) => {
    console.log("Nova mensagem:", data.username, data.message);
  });

  // Enviar uma mensagem
  function enviar(texto) {
    socket.emit("send_message", { room_id: "sala-123", message: texto });
  }
</script>
```

### Como criar novos eventos no Backend:
Crie um novo arquivo em `myapp/sockets/meu_evento.py`:
```python
from myapp.setup.InitSocket import socket_io
from flask_socketio import emit

@socket_io.on("meu_evento_customizado")
def handle_custom(data):
    emit("resposta_customizada", {"status": "ok", "recebido": data})
```

---

## 5. Autenticação & Sessão

### Métodos de Autenticação Prontos:
1. **Login Tradicional**:
   - Endpoint: `POST /login`
   - Aceita username ou email + senha.
   - Suporte a 2FA opcional por email.
   - Configura sessão Flask e cookie seguro Fernet (`set_cookies`).
2. **Cadastro (Multi-Etapas)**:
   - Endpoint: `POST /signUp`
   - Validação de formulário via `myapp/utils/Validations/GeneralUserValidation.py`.
   - Gera token temporário (`AuthTokens.py`) e dispara email de confirmação.
   - Endpoint de validação de token: `/auth/confirm/<token>`.
3. **Google OAuth 2.0**:
   - Redirecionamento: `/auth/google/redirect`
   - Callback: `/auth/google/validate` (cria usuário automaticamente se não existir).
4. **Redefinição de Senha**:
   - Solicitação: `POST /auth/change`
   - Confirmação e redefinição com formulário dedicado.
5. **Force Logout**:
   - Admin pode invalidar sessões via `/forceLogoutUser/<username>` ou `/forceLogoutAll`.
   - Interceptado no `PermissionRequire.py` a cada requisição.

---

## 6. Ferramentas Administrativas

- **Terminal Web Admin**: Acessível em `/admin` (apenas para usuários com `admin_user=True`).
- **Execução SQL**: Endpoint `POST /admin/bash/psql` permite executar consultas diretamente pelo browser com histórico interativo e exibição tabular.
- **Upload de Imagens**: `myapp/routes/actions/admin/UpImage.py` com integração ao Cloudinary ou armazenamento local.

---

## 7. Como Executar e Testar

### Rodando o Servidor:
```powershell
# Ativar ambiente virtual
.venv\Scripts\Activate.ps1

# Iniciar servidor
python app.py
```
O servidor iniciará em `http://localhost:5000` (ou na porta configurada em `.env`).

### Testando com Python:
```powershell
python -c "from myapp import create_app; app, s = create_app(); print('Tudo ok!')"
```
