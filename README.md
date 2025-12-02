# NFCStockSimplify

Sistema mobile de gestão de estoque com autenticação e leitura de produtos via NFC, desenvolvido em React Native com Expo.

## Visão Geral

Aplicação offline-first para controle de estoque através de tags NFC, permitindo autenticação por crachá e registro de movimentações (entrada/saída) de produtos. Sincronização automática com servidor MySQL quando online.

## Estrutura do Projeto

```
NFCStockSimplify/
├── src/
│   ├── models/              # Camada de dados e lógica de negócio
│   │   ├── AuthModel.js         # Autenticação (MySQL + SQLite)
│   │   ├── UserModel.js         # Gerenciamento de usuários
│   │   ├── ProductModel.js      # Gestão de produtos
│   │   ├── MovementModel.js     # Movimentações de estoque
│   │   └── DatabaseModel.js     # Interface SQLite
│   ├── views/               # Telas da aplicação
│   │   ├── LoginScreen.js       # Login (email/senha ou NFC)
│   │   ├── ReadMethodScreen.js  # Escolha NFC/Barcode
│   │   ├── NFCReaderScreen.js   # Leitura NFC de produtos
│   │   ├── BarcodeReaderScreen.js  # Leitura por câmera
│   │   └── ReportScreen.js      # Dashboard administrativo
│   ├── controllers/         # Orquestração de lógica
│   │   └── AuthController.js
│   ├── services/            # Serviços externos
│   │   ├── NFCService.js        # Gerenciamento NFC nativo
│   │   ├── SyncService.js       # Sincronização offline-online
│   │   └── LogService.js        # Sistema centralizado de logs
│   ├── components/          # Componentes reutilizáveis
│   │   └── ConnectionStatus.js  # Indicador de conexão
│   ├── navigation/          # Configuração de rotas
│   │   └── AppNavigator.js
│   ├── styles/              # Estilos globais
│   │   └── globalStyles.js
│   └── config/              # Configurações
│       └── api.config.js        # Endpoints da API
├── android/                 # Configuração Android (prebuild)
├── assets/                  # Recursos estáticos
├── App.js                   # Ponto de entrada
├── app.config.js            # Configuração Expo dinâmica
├── eas.json                 # Configuração EAS Build
└── package.json

```

## Tecnologias e Bibliotecas

### Core
- **React Native** 0.81.5 - Framework mobile cross-platform
- **Expo SDK** ~54.0.25 - Plataforma de desenvolvimento
- **React** 19.1.0 - Biblioteca de UI
- **JavaScript ES6+** - Linguagem

### Navegação
- **@react-navigation/native** 7.1.22 - Sistema de navegação
- **@react-navigation/native-stack** 7.8.2 - Stack Navigator nativo

### NFC e Câmera
- **react-native-nfc-manager** 3.17.2 - Leitura de tags NFC
- **expo-camera** 17.0.9 - Captura de barcode/QR code

### Banco de Dados
- **expo-sqlite** 16.0.9 - Banco local para cache offline
- **axios** 1.13.2 - Cliente HTTP para API MySQL

### Conectividade
- **@react-native-community/netinfo** 11.4.1 - Monitoramento de rede

### UI/UX
- **expo-linear-gradient** 15.0.7 - Gradientes de cores
- **react-native-safe-area-context** 5.6.2 - Áreas seguras de tela

### Desenvolvimento
- **expo-dev-client** 6.0.18 - Build customizado com módulos nativos

## Arquitetura

### Padrão MVC

**Models** - Gerenciam dados e lógica de negócio
- Comunicação com API MySQL (online)
- Fallback para SQLite (offline)
- Validações de dados

**Views** - Interfaces visuais
- Componentes React Native
- Feedback visual (loading, erros)
- Navegação entre telas

**Controllers** - Orquestração
- Coordenam Models e Views
- Tratamento de erros
- Fluxo de autenticação

### Sincronização Offline-First

1. **Operação Offline**: Dados salvos no SQLite local + fila de sincronização
2. **Detecção de Conexão**: NetInfo monitora estado da rede
3. **Sincronização Automática**: A cada 5 minutos ou ao detectar conexão
4. **Envio ao MySQL**: Fila processada, dados enviados via API
5. **Limpeza Local**: SQLite limpo após confirmação do servidor

### Banco de Dados SQLite

Tabelas locais:
- `usuarios_local` - Cache de usuários autenticados
- `produtos_local` - Cache de produtos
- `movimentacoes_local` - Movimentações pendentes
- `fila_sincronizacao` - Operações aguardando envio
- `logs_erros` - Registro de erros do sistema (LogService)

## Funcionalidades Implementadas

### Autenticação
- Login com email/senha (MySQL com fallback SQLite)
- Login por tag NFC (crachá com JSON: `{"user_id": "email", "token": "senha"}`)
- Navegação baseada em setor do usuário (ADM ou LO)
- Indicador visual de status de conexão

### Leitura de Produtos
- Leitura NFC com tags JSON: `{"produto": "codigo"}`
- Leitura de barcode/QR code via câmera
- Fallback para ID da tag quando sem JSON
- Busca automática de produto no banco

### Movimentação de Estoque
- Registro de ENTRADA/SAÍDA de produtos
- Quantidade personalizável
- Timestamp automático
- Sincronização transparente (online/offline)

### Dashboard Administrativo
- Acesso exclusivo para setor ADM
- Visualização de relatórios
- Logout seguro

### Sincronização
- Auto-sync a cada 5 minutos
- Sync manual ao detectar conexão
- Fila persistente de operações pendentes
- Retry automático em caso de falha

### Sistema de Logs
- Logging centralizado via LogService
- Persistência de erros no SQLite
- Níveis: INFO, WARNING, ERROR, DEBUG
- Métodos de consulta e exportação de logs
- Limpeza automática de logs antigos

## Instalação e Execução

### Pré-requisitos
- Node.js 18+ instalado
- Android Studio (para Android) ou Xcode (para iOS)
- Dispositivo físico com NFC ou emulador
- Git instalado

### Clonar Repositório

```bash
git clone https://github.com/SEU_USUARIO/NFCStockSimplify.git
cd NFCStockSimplify
```

### Instalação

```bash
# Instale as dependências
npm install

# OU usando yarn
yarn install
```

### Configuração

Edite `src/config/api.config.js` com o IP do servidor:

```javascript
const API_CONFIG = {
  BASE_URL: 'http://SEU_IP:3000/api',
  // ...
};
```

### Execução em Desenvolvimento

```bash
# Gerar arquivos nativos (primeira vez ou após adicionar pacotes nativos)
npx expo prebuild

# Executar no Android (requer dispositivo conectado ou emulador)
npx expo run:android

# Executar no iOS (requer macOS e Xcode)
npx expo run:ios

# Iniciar servidor Metro (se não iniciar automaticamente)
npx expo start --dev-client
```

### Build para Produção

```bash
# Build APK para Android
npm run build:preview

# Build completo de produção
npm run build:prod
```

## Uso da Aplicação

### Fluxo de Login

1. Abra o aplicativo
2. **Opção 1**: Digite email e senha, clique em "Entrar"
3. **Opção 2**: Clique em "Login com Crachá NFC", aproxime o crachá
4. Após autenticação:
   - **Setor ADM**: Acessa dashboard de relatórios
   - **Setor LO**: Acessa menu de leitura (NFC ou Barcode)

### Fluxo de Movimentação (Setor LO)

1. Na tela "Escolha o Método", selecione "Leitura por NFC"
2. Clique em "Iniciar Leitura de Tags NFC"
3. Aproxime a tag NFC do produto
4. Sistema exibe dados do produto
5. Escolha tipo de movimentação: "ENTRADA" ou "SAÍDA"
6. Informe a quantidade
7. Confirme - movimentação registrada

### Formato das Tags NFC

**Tag de Login (crachá):**
```json
{
  "user_id": "usuario@empresa.com",
  "token": "senha123"
}
```

**Tag de Produto:**
```json
{
  "produto": "ABC123"
}
```

Tags devem ser gravadas no formato NDEF Text Record.

## API Backend

O sistema requer uma API REST com os seguintes endpoints:

```
POST /api/auth/login              # Autenticação
GET  /api/produtos                # Listar produtos
GET  /api/produtos/codigo/:codigo # Buscar por código
POST /api/movimentacoes           # Registrar movimentação
POST /api/movimentacoes/sync      # Sincronização em lote
GET  /api/tags-nfc/tag/:valor     # Buscar usuário por tag NFC
```

Veja `RELATORIO_TECNICO.md` para detalhes de implementação da API.

## Configuração do Expo

### app.config.js

Configurações importantes:
- Permissões NFC para Android
- Suporte a expo-dev-client
- EAS Project ID configurado

### eas.json

Perfis de build:
- **development**: Build de desenvolvimento com DevClient
- **preview**: APK para testes
- **production**: Build otimizado para publicação

## Desenvolvimento

### Estrutura de Código

```javascript
// Exemplo de implementação Model
class ProductModel {
  static async getProductByCode(codigo) {
    // Tenta API MySQL primeiro
    // Fallback para SQLite se offline
  }
}

// Exemplo de View
const NFCReaderScreen = ({ navigation, route }) => {
  const [produto, setProduto] = useState(null);
  
  const handleTagDiscovered = async (nfcData) => {
    const result = await ProductModel.getProductByCode(codigo);
    setProduto(result.data);
  };
};

// Exemplo de Controller
class AuthController {
  static async login(email, senha, onSuccess, onError) {
    const result = await AuthModel.authenticate(email, senha);
    if (result.success) {
      onSuccess(result.user);
    } else {
      onError(result.message);
    }
  }
}
```

### Boas Práticas

- Sempre use try-catch para operações assíncronas
- Forneça feedback visual (loading, erros)
- Valide entrada do usuário
- Teste com e sem conexão de rede
- Use LogService para registrar erros importantes
- Documente funções complexas
- Mantenha console.log comentado em produção

## Paleta de Cores

```javascript
Colors = {
  primary: '#0056D2',           // Azul institucional
  secondary: '#00C2CB',         // Ciano vibrante
  textPrimary: '#2D3748',       // Texto principal
  textSecondary: '#718096',     // Texto secundário
  background: '#FFFFFF',        // Fundo branco
  backgroundSecondary: '#F7FAFC', // Fundo alternativo
  success: '#4CAF50',           // Verde sucesso
  warning: '#FFC107',           // Amarelo aviso
  error: '#F44336',             // Vermelho erro
  info: '#2196F3',              // Azul informação
  border: '#E2E8F0',            // Bordas
};
```

## Solução de Problemas

### NFC não funciona

- Verifique se o dispositivo possui chip NFC
- Ative NFC nas configurações do Android
- Use `npx expo run:android` (não Expo Go)
- Tags devem estar no formato NDEF

### Erro de compilação no Android

```bash
# Limpe o build
cd android
.\gradlew.bat clean
cd ..

# Reconstrua
npx expo run:android
```

### Sincronização não funciona

- Verifique IP do servidor em `api.config.js`
- Confirme que API está rodando
- Teste conexão de rede com NetInfo
- Verifique logs da fila_sincronizacao no SQLite

### Verificar logs de erro

```javascript
import LogService from './src/services/LogService';

// Buscar últimos erros
const logs = await LogService.getLogs(50, 'ERROR');

// Ver estatísticas
const stats = await LogService.getLogStats();
console.log(stats); // { total: 150, errors: 23, warnings: 12 }

// Limpar logs antigos (7+ dias)
await LogService.clearOldLogs(7);
```

## Documentação Adicional

### Documentação Técnica
- `RELATORIO_TECNICO.md` - Documentação técnica detalhada com trechos de código
- `DATABASE.md` - Estrutura completa do banco de dados (SQLite + MySQL)
- `CONTRIBUTING.md` - Guia para contribuidores

### Configuração e Deploy
- `GIT_SETUP.md` - Instruções para configurar Git e publicar no GitHub
- `CHECKLIST.md` - Checklist de preparação antes de publicar
- `src/config/api.config.example.js` - Exemplo de configuração de API

### Assets
- `assets/README.md` - Documentação dos recursos visuais do app

## Autores

Desenvolvido por [Gustavo Benittes]

## Licença

Este projeto está sob a licença MIT - veja o arquivo LICENSE para detalhes.

## Versão

**v1.0.0** - Sistema completo de gestão de estoque com NFC

---

**Desenvolvido com React Native + Expo**
**Última atualização:** Dezembro 2025
