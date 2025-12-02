# Estrutura do Banco de Dados

## SQLite Local (Offline Cache)

O aplicativo utiliza SQLite para cache offline e sincronização.

### Tabelas

#### 1. usuarios_local
Cache de usuários para autenticação offline.

```sql
CREATE TABLE usuarios_local (
  id_usuario INTEGER PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  senha_hash TEXT,
  perfil TEXT NOT NULL,
  setor TEXT,
  nfc_tag TEXT UNIQUE,
  ativo INTEGER DEFAULT 1,
  criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TEXT
);
```

**Campos:**
- `id_usuario`: ID do usuário (sincronizado com MySQL)
- `nome`: Nome completo
- `email`: Email único para login
- `senha_hash`: Hash da senha (bcrypt)
- `perfil`: ADMIN, OPERADOR, etc.
- `setor`: ADM (Admin), LO (Logística), etc.
- `nfc_tag`: ID da tag NFC do crachá
- `ativo`: 1 (ativo) ou 0 (inativo)

#### 2. produtos_local
Cache de produtos.

```sql
CREATE TABLE produtos_local (
  id_produto INTEGER PRIMARY KEY,
  codigo_interno TEXT NOT NULL,
  descricao TEXT NOT NULL,
  categoria TEXT,
  quantidade_atual INTEGER DEFAULT 0,
  atualizado_em TEXT
);
```

**Campos:**
- `id_produto`: ID do produto (sincronizado com MySQL)
- `codigo_interno`: Código único do produto (usado em tags NFC)
- `descricao`: Nome/descrição do produto
- `categoria`: Categoria do produto
- `quantidade_atual`: Estoque atual

#### 3. movimentacoes_local
Movimentações de estoque pendentes de sincronização.

```sql
CREATE TABLE movimentacoes_local (
  id_local INTEGER PRIMARY KEY AUTOINCREMENT,
  id_produto INTEGER NOT NULL,
  tipo TEXT NOT NULL,
  quantidade INTEGER NOT NULL,
  origem TEXT,
  timestamp_mobile TEXT,
  sincronizado INTEGER DEFAULT 0
);
```

**Campos:**
- `id_local`: ID local temporário
- `id_produto`: Referência ao produto
- `tipo`: 'ENTRADA' ou 'SAIDA'
- `quantidade`: Quantidade movimentada
- `origem`: Origem da movimentação
- `timestamp_mobile`: Data/hora da movimentação
- `sincronizado`: 0 (pendente) ou 1 (sincronizado)

#### 4. fila_sincronizacao
Fila de operações para sincronizar com MySQL.

```sql
CREATE TABLE fila_sincronizacao (
  id_fila INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo_operacao TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  tentativas INTEGER DEFAULT 0,
  ultima_tentativa TEXT,
  status TEXT DEFAULT 'PENDENTE'
);
```

**Campos:**
- `id_fila`: ID da operação na fila
- `tipo_operacao`: 'MOVIMENTACAO', 'PRODUTO', etc.
- `payload_json`: Dados da operação em JSON
- `tentativas`: Número de tentativas de sincronização
- `ultima_tentativa`: Timestamp da última tentativa
- `status`: 'PENDENTE', 'SINCRONIZADO', 'ERRO'

#### 5. logs_erros
Registro de erros do sistema (LogService).

```sql
CREATE TABLE logs_erros (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  nivel TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  contexto TEXT,
  plataforma TEXT
);
```

**Campos:**
- `id`: ID do log
- `timestamp`: Data/hora do erro (ISO 8601)
- `nivel`: 'INFO', 'WARNING', 'ERROR', 'DEBUG'
- `mensagem`: Mensagem descritiva
- `contexto`: JSON com contexto adicional
- `plataforma`: 'android', 'ios', 'web'

---

## MySQL (Servidor Backend)

O backend deve implementar as seguintes tabelas no MySQL:

### Tabelas Recomendadas

#### usuarios
```sql
CREATE TABLE usuarios (
  id_usuario INT PRIMARY KEY AUTO_INCREMENT,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  perfil ENUM('ADMIN', 'OPERADOR') NOT NULL,
  setor VARCHAR(50),
  nfc_tag VARCHAR(100) UNIQUE,
  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### produtos
```sql
CREATE TABLE produtos (
  id_produto INT PRIMARY KEY AUTO_INCREMENT,
  codigo_interno VARCHAR(100) UNIQUE NOT NULL,
  descricao VARCHAR(255) NOT NULL,
  categoria VARCHAR(100),
  quantidade_atual INT DEFAULT 0,
  estoque_minimo INT DEFAULT 0,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### movimentacoes
```sql
CREATE TABLE movimentacoes (
  id_movimentacao INT PRIMARY KEY AUTO_INCREMENT,
  id_produto INT NOT NULL,
  id_usuario INT,
  tipo ENUM('ENTRADA', 'SAIDA') NOT NULL,
  quantidade INT NOT NULL,
  origem VARCHAR(255),
  observacao TEXT,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_produto) REFERENCES produtos(id_produto),
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);
```

#### tags_nfc
```sql
CREATE TABLE tags_nfc (
  id_tag INT PRIMARY KEY AUTO_INCREMENT,
  valor_tag VARCHAR(100) UNIQUE NOT NULL,
  tipo ENUM('USUARIO', 'PRODUTO') NOT NULL,
  id_referencia INT NOT NULL,
  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## API Endpoints Esperados

### Autenticação
- `POST /api/auth/login` - Login com email/senha
- `GET /api/tags-nfc/tag/:valor` - Buscar usuário por tag NFC

### Usuários
- `GET /api/usuarios` - Listar usuários
- `GET /api/usuarios/:id` - Buscar usuário
- `POST /api/usuarios` - Criar usuário
- `PUT /api/usuarios/:id` - Atualizar usuário

### Produtos
- `GET /api/produtos` - Listar produtos
- `GET /api/produtos/:id` - Buscar produto
- `GET /api/produtos/codigo/:codigo` - Buscar por código
- `POST /api/produtos` - Criar produto
- `PUT /api/produtos/:id` - Atualizar produto

### Movimentações
- `GET /api/movimentacoes` - Listar movimentações
- `POST /api/movimentacoes` - Registrar movimentação
- `POST /api/movimentacoes/sync` - Sincronização em lote

### Sincronização
- `GET /api/sync/pull` - Baixar dados do servidor
- `POST /api/sync/push` - Enviar dados para servidor

---

## Formato de Dados

### Payload de Autenticação (Login)
```json
{
  "email": "usuario@example.com",
  "senha": "senha123"
}
```

**Resposta:**
```json
{
  "success": true,
  "user": {
    "id_usuario": 1,
    "nome": "João Silva",
    "email": "joao@example.com",
    "perfil": "OPERADOR",
    "setor": "LO",
    "nfc_tag": "04ABC123"
  },
  "token": "jwt-token-here"
}
```

### Payload de Movimentação
```json
{
  "id_produto": 5,
  "tipo": "ENTRADA",
  "quantidade": 10,
  "origem": "Fornecedor XYZ",
  "timestamp_mobile": "2025-12-02T10:30:00.000Z"
}
```

### Payload de Sincronização
```json
{
  "operacoes": [
    {
      "tipo_operacao": "MOVIMENTACAO",
      "dados": {
        "id_produto": 5,
        "tipo": "SAIDA",
        "quantidade": 3,
        "timestamp_mobile": "2025-12-02T14:20:00.000Z"
      }
    }
  ]
}
```

---

## Fluxo de Sincronização

1. **Offline**: Dados salvos no SQLite + fila_sincronizacao
2. **Conexão detectada**: SyncService dispara sincronização
3. **Push para MySQL**: Envia operações pendentes
4. **Pull do MySQL**: Baixa atualizações (produtos, usuários)
5. **Limpeza**: Remove dados sincronizados do SQLite

---

## Notas de Implementação

### Backend (Node.js/Express exemplo)

```javascript
// Endpoint de login
app.post('/api/auth/login', async (req, res) => {
  const { email, senha } = req.body;
  // Verificar credenciais no MySQL
  // Retornar usuário + token JWT
});

// Endpoint de movimentação
app.post('/api/movimentacoes', async (req, res) => {
  const { id_produto, tipo, quantidade } = req.body;
  // Inserir no MySQL
  // Atualizar quantidade_atual do produto
  // Retornar confirmação
});

// Endpoint de sincronização em lote
app.post('/api/movimentacoes/sync', async (req, res) => {
  const { operacoes } = req.body;
  // Processar array de operações
  // Transação MySQL para garantir consistência
  // Retornar resultados
});
```

### Segurança

- Use HTTPS em produção
- Implemente autenticação JWT
- Valide todos os inputs
- Use prepared statements (SQL injection)
- Implemente rate limiting
- Log de todas as operações

---

## Manutenção

### Limpeza de Dados Antigos

```javascript
// Limpar logs antigos (7+ dias)
await LogService.clearOldLogs(7);

// Limpar movimentações sincronizadas (30+ dias)
await DatabaseModel.executeQuery(
  `DELETE FROM movimentacoes_local 
   WHERE sincronizado = 1 
   AND timestamp_mobile < datetime('now', '-30 days')`
);
```

### Backup

```bash
# SQLite
adb pull /data/data/com.nfcstocksimplify/databases/nfcstocksimplify.db

# MySQL
mysqldump -u user -p database > backup.sql
```

---

**Última atualização:** Dezembro 2025
