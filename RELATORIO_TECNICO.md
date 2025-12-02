# Relatório Técnico - NFCStockSimplify

## Sumário Executivo

Sistema de gestão de estoque mobile desenvolvido em React Native com Expo, utilizando leitura NFC para autenticação e movimentação de produtos, com sincronização offline-first entre SQLite local e MySQL remoto.

---

## Funcionalidades Essenciais

### 1. Autenticação via NFC
### 2. Leitura de Produtos por NFC
### 3. Sincronização Offline-First
### 4. Navegação por Setor
### 5. Gestão de Estoque Local

---

## 1. AUTENTICAÇÃO VIA NFC

### Arquivo: `src/views/LoginScreen.js`

```javascript
/**
 * Inicia leitura contínua de NFC para login
 */
const startNFCReading = async () => {
  if (isReadingNFC) {
    await stopNFCReading();
    return;
  }

  setIsReadingNFC(true);
  setLoadingNFC(true);

  const result = await NFCService.startReading(
    handleNFCTagDiscovered,
    handleNFCReadError
  );
};

/**
 * Callback quando tag NFC é descoberta
 */
const handleNFCTagDiscovered = async (nfcData) => {
  await stopNFCReading();
  
  // Verifica se tem conteúdo de texto na tag (JSON)
  if (nfcData.textContent && nfcData.textContent.trim() !== '') {
    try {
      const jsonData = JSON.parse(nfcData.textContent);
      
      // Tag com formato: {"user_id": "email", "token": "senha"}
      if (jsonData.user_id && jsonData.token) {
        // Faz login com as credenciais
        await AuthController.login(
          jsonData.user_id,
          jsonData.token,
          (user, message) => {
            // Sucesso - navega baseado no setor
            if (user.setor === 'ADM') {
              navigation.replace('Report', { user });
            } else if (user.setor === 'LO') {
              navigation.replace('ReadMethod', { user });
            }
          },
          (error) => {
            Alert.alert('Erro de Autenticação', error);
          }
        );
        return;
      }
    } catch (e) {
      // Não é JSON válido
    }
  }
  
  // Fallback: autenticação pelo ID da tag
  const AuthModel = require('../models/AuthModel').default;
  const authResult = await AuthModel.authenticateByNFC(nfcData.id);

  if (authResult.success) {
    navigation.replace(user.setor === 'ADM' ? 'Report' : 'ReadMethod', { user });
  }
};
```

**Formato esperado da tag NFC de login:**
```json
{
  "user_id": "usuario@email.com",
  "token": "senha123"
}
```

**Fluxo:**
1. Usuário pressiona "Login com Crachá NFC"
2. Sistema inicia leitura contínua
3. Ao aproximar crachá, extrai JSON com credenciais
4. Autentica via API MySQL (online) ou SQLite (offline)
5. Navega para tela específica do setor

---

## 2. LEITURA DE PRODUTOS POR NFC

### Arquivo: `src/views/NFCReaderScreen.js`

```javascript
/**
 * Callback quando tag é descoberta
 */
const handleTagDiscovered = async (nfcData) => {
  setLastTagRead(nfcData);
  setIsReading(false);

  let codigoProduto = null;

  // Verifica se tem conteúdo JSON na tag
  if (nfcData.textContent && nfcData.textContent.trim() !== '') {
    try {
      const jsonData = JSON.parse(nfcData.textContent);
      
      // Tag com formato: {"produto": "ABC123"}
      if (jsonData.produto) {
        codigoProduto = jsonData.produto;
      }
    } catch (e) {
      // Não é JSON válido, usa ID da tag
    }
  }

  // Fallback: usa ID da tag
  if (!codigoProduto) {
    codigoProduto = nfcData.id;
  }

  // Busca produto pelo código
  const productResult = await ProductModel.getProductByCode(codigoProduto);

  if (productResult.success && productResult.data) {
    // Produto encontrado - mostra diálogo de movimentação
    showMovementDialog(productResult.data, nfcData);
  } else {
    Alert.alert('Produto Não Encontrado', `Código: ${codigoProduto}`);
  }
};
```

**Formato esperado da tag NFC de produto:**
```json
{
  "produto": "ABC123"
}
```

**Fluxo:**
1. Operador na tela NFCReader pressiona "Iniciar Leitura"
2. Aproxima tag NFC do produto
3. Sistema extrai código do produto (JSON ou ID)
4. Busca produto no banco local (SQLite)
5. Exibe diálogo para ENTRADA/SAÍDA
6. Registra movimentação

---

## 3. SINCRONIZAÇÃO OFFLINE-FIRST

### Arquivo: `src/services/SyncService.js`

```javascript
class SyncService {
  /**
   * Adiciona operação à fila de sincronização
   */
  static async addToSyncQueue(tipoOperacao, payload) {
    try {
      const query = `
        INSERT INTO fila_sincronizacao 
        (tipo_operacao, payload_json, tentativas, status) 
        VALUES (?, ?, 0, 'PENDENTE')
      `;

      await DatabaseModel.executeQuery(query, [
        tipoOperacao,
        JSON.stringify(payload)
      ]);

      // Tenta sincronizar imediatamente se online
      const netState = await NetInfo.fetch();
      if (netState.isConnected) {
        await this.syncPendingOperations();
      }
    } catch (error) {
      console.log('Erro ao adicionar à fila:', error);
    }
  }

  /**
   * Sincroniza operações pendentes com MySQL
   */
  static async syncPendingOperations() {
    try {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        return { success: false, message: 'Sem conexão' };
      }

      // Busca operações pendentes
      const result = await DatabaseModel.fetchQuery(
        `SELECT * FROM fila_sincronizacao 
         WHERE status = 'PENDENTE' 
         ORDER BY id_fila ASC`
      );

      if (!result.success || !result.data || result.data.length === 0) {
        return { success: true, message: 'Nenhuma operação pendente' };
      }

      let sincronizadas = 0;

      for (const operacao of result.data) {
        try {
          const payload = JSON.parse(operacao.payload_json);
          let endpoint = '';

          // Define endpoint baseado no tipo
          switch (operacao.tipo_operacao) {
            case 'MOVIMENTACAO':
              endpoint = API_CONFIG.ENDPOINTS.MOVEMENTS_SYNC;
              break;
            case 'PRODUTO':
              endpoint = API_CONFIG.ENDPOINTS.PRODUCTS;
              break;
            default:
              continue;
          }

          // Envia para API
          const response = await axios.post(
            `${API_CONFIG.BASE_URL}${endpoint}`,
            payload,
            { timeout: API_CONFIG.TIMEOUT }
          );

          if (response.data && response.data.success) {
            // Remove da fila após sucesso
            await DatabaseModel.executeQuery(
              'DELETE FROM fila_sincronizacao WHERE id_fila = ?',
              [operacao.id_fila]
            );

            // Remove do SQLite local (cache temporário)
            if (operacao.tipo_operacao === 'MOVIMENTACAO') {
              await DatabaseModel.executeQuery(
                'DELETE FROM movimentacoes_local WHERE id_local = ?',
                [payload.id_local]
              );
            }

            sincronizadas++;
          }
        } catch (error) {
          // Incrementa tentativas
          await DatabaseModel.executeQuery(
            `UPDATE fila_sincronizacao 
             SET tentativas = tentativas + 1, 
                 ultima_tentativa = datetime('now') 
             WHERE id_fila = ?`,
            [operacao.id_fila]
          );
        }
      }

      return { success: true, sincronizadas };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Inicia sincronização automática a cada X minutos
   */
  static startAutoSync(intervalMinutes = 5) {
    setInterval(async () => {
      await this.syncPendingOperations();
    }, intervalMinutes * 60 * 1000);
  }
}
```

**Fluxo de Sincronização:**

1. **Operação Offline:**
   - Dados salvos no SQLite local
   - Operação adicionada à `fila_sincronizacao`
   - Status: PENDENTE

2. **Detecção de Conexão:**
   - `NetInfo` monitora conectividade
   - Ao conectar, dispara `syncPendingOperations()`

3. **Sincronização:**
   - Envia dados pendentes para MySQL via API
   - Se sucesso: remove da fila e do SQLite
   - Se erro: incrementa contador de tentativas

4. **Auto-Sync:**
   - A cada 5 minutos, tenta sincronizar
   - Executado em background

**Tabela de Fila:**
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

---

## 4. NAVEGAÇÃO POR SETOR

### Arquivo: `src/navigation/AppNavigator.js`

```javascript
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        {/* Autenticação */}
        <Stack.Screen name="Login" component={LoginScreen} />

        {/* Setor ADM - Administração */}
        <Stack.Screen name="Report" component={ReportScreen} />

        {/* Setor LO - Logística */}
        <Stack.Screen name="ReadMethod" component={ReadMethodScreen} />
        <Stack.Screen name="NFCReader" component={NFCReaderScreen} />
        <Stack.Screen name="BarcodeReader" component={BarcodeReaderScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
```

**Lógica de Navegação baseada em Setor:**

```javascript
// LoginScreen.js
if (user.setor === 'ADM') {
  navigation.replace('Report', { user });
} else if (user.setor === 'LO') {
  navigation.replace('ReadMethod', { user });
}

// ReportScreen.js - Botão Voltar desabilitado (primeira tela ADM)
// ReadMethodScreen.js - Botão Voltar desabilitado (primeira tela LO)
// NFCReaderScreen.js - Botão Voltar habilitado
// BarcodeReaderScreen.js - Botão Voltar habilitado
```

**Fluxo de Navegação:**

```
Login (autenticação)
  │
  ├─── ADM → Report (dashboard admin)
  │              └── Logout → Login
  │
  └─── LO → ReadMethod (escolha NFC/Barcode)
                 │
                 ├─── NFCReader → volta ReadMethod
                 └─── BarcodeReader → volta ReadMethod
```

---

## 5. GESTÃO DE BANCO SQLITE

### Arquivo: `src/models/DatabaseModel.js`

```javascript
import { Platform } from 'react-native';

let SQLite = null;
if (Platform.OS !== 'web') {
  SQLite = require('expo-sqlite');
}

class DatabaseModel {
  static db = null;

  /**
   * Inicializa banco SQLite
   */
  static async initDatabase() {
    try {
      if (Platform.OS === 'web') {
        return { success: true, message: 'Web - sem SQLite local' };
      }

      this.db = await SQLite.openDatabaseAsync('nfcstocksimplify.db');
      await this.createTables();
      
      return { success: true, message: 'Banco inicializado' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Cria tabelas do sistema
   */
  static async createTables() {
    if (Platform.OS === 'web' || !this.db) return;

    // Tabela: usuarios_local (cache de autenticação offline)
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS usuarios_local (
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
    `);

    // Tabela: produtos_local (cache de produtos)
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS produtos_local (
        id_produto INTEGER PRIMARY KEY,
        codigo_interno TEXT NOT NULL,
        descricao TEXT NOT NULL,
        categoria TEXT,
        quantidade_atual INTEGER DEFAULT 0,
        atualizado_em TEXT
      );
    `);

    // Tabela: movimentacoes_local (cache temporário)
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS movimentacoes_local (
        id_local INTEGER PRIMARY KEY AUTOINCREMENT,
        id_produto INTEGER NOT NULL,
        tipo TEXT NOT NULL,
        quantidade INTEGER NOT NULL,
        origem TEXT,
        timestamp_mobile TEXT,
        sincronizado INTEGER DEFAULT 0
      );
    `);

    // Tabela: fila_sincronizacao (operações pendentes)
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS fila_sincronizacao (
        id_fila INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo_operacao TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        tentativas INTEGER DEFAULT 0,
        ultima_tentativa TEXT,
        status TEXT DEFAULT 'PENDENTE'
      );
    `);
  }

  /**
   * Executa query SQL
   */
  static async executeQuery(query, params = []) {
    if (Platform.OS === 'web') {
      return { success: false, error: 'SQLite não disponível na web' };
    }

    try {
      const result = await this.db.runAsync(query, params);
      return { 
        success: true, 
        lastInsertRowId: result.lastInsertRowId,
        changes: result.changes 
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Busca dados (SELECT)
   */
  static async fetchQuery(query, params = []) {
    if (Platform.OS === 'web') {
      return { success: false, data: [] };
    }

    try {
      const result = await this.db.getAllAsync(query, params);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, data: [], error: error.message };
    }
  }
}
```

**Características do SQLite:**

1. **Uso Temporário:**
   - Dados salvos apenas quando offline
   - Removidos após sincronização bem-sucedida
   - Cache de autenticação para login offline

2. **Platform-Aware:**
   - Desabilitado na web (usa apenas API)
   - Ativo em Android/iOS

3. **Estrutura:**
   - `usuarios_local`: Cache de usuários autenticados
   - `produtos_local`: Cache de produtos
   - `movimentacoes_local`: Movimentações pendentes
   - `fila_sincronizacao`: Fila de operações

---

## 6. PRINCIPAIS BIBLIOTECAS

### React Native & Expo
```json
{
  "react": "19.1.0",
  "react-native": "0.81.5",
  "expo": "~54.0.25",
  "expo-dev-client": "^6.0.18"
}
```

**Uso:** Framework base para desenvolvimento mobile cross-platform

---

### Navegação
```json
{
  "@react-navigation/native": "^7.1.22",
  "@react-navigation/native-stack": "^7.8.2",
  "react-native-screens": "~4.16.0",
  "react-native-safe-area-context": "^5.6.2"
}
```

**Uso:** Sistema de navegação entre telas com stack nativo

**Exemplo:**
```javascript
navigation.replace('Report', { user });
navigation.goBack();
```

---

### NFC
```json
{
  "react-native-nfc-manager": "^3.17.2"
}
```

**Uso:** Leitura de tags NFC para autenticação e produtos

**Arquivo:** `src/services/NFCService.js`

```javascript
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';

// Inicializar
await NfcManager.start();

// Registrar listener
await NfcManager.registerTagEvent((tag) => {
  console.log('Tag detectada:', tag);
});

// Ler mensagens NDEF
const text = Ndef.text.decodePayload(record.payload);
const jsonData = JSON.parse(text);
```

---

### Câmera & Barcode
```json
{
  "expo-camera": "^17.0.9"
}
```

**Uso:** Leitura de códigos de barras/QR

**Arquivo:** `src/views/BarcodeReaderScreen.js`

```javascript
import { CameraView, Camera } from 'expo-camera';

<CameraView
  onBarcodeScanned={handleBarCodeScanned}
  barcodeScannerSettings={{
    barcodeTypes: ['qr', 'ean13', 'ean8', 'code128']
  }}
/>
```

---

### SQLite
```json
{
  "expo-sqlite": "^16.0.9"
}
```

**Uso:** Banco de dados local para cache offline

```javascript
const db = await SQLite.openDatabaseAsync('nfcstocksimplify.db');
await db.runAsync(query, params);
const result = await db.getAllAsync(query, params);
```

---

### Rede & HTTP
```json
{
  "@react-native-community/netinfo": "^11.4.1",
  "axios": "^1.13.2"
}
```

**Uso:** Detecção de conectividade e chamadas API

```javascript
// NetInfo
const netState = await NetInfo.fetch();
if (netState.isConnected) {
  // Sincronizar
}

// Axios
const response = await axios.post(
  `${API_CONFIG.BASE_URL}/api/auth/login`,
  { email, senha }
);
```

---

### UI
```json
{
  "expo-linear-gradient": "^15.0.7"
}
```

**Uso:** Gradientes na interface (login screen)

```javascript
<LinearGradient
  colors={['#0056D2', '#003D99', '#002766']}
  style={styles.gradient}
>
```

---

## 7. PALETA DE CORES

### Arquivo: `src/styles/globalStyles.js`

```javascript
export const Colors = {
  // Cores principais
  primary: '#0056D2',        // Azul Institucional
  secondary: '#00C2CB',      // Ciano Vibrante
  
  // Texto
  textPrimary: '#2D3748',    // Cinza Escuro
  textSecondary: '#718096',  // Cinza Médio
  
  // Fundos
  background: '#FFFFFF',
  backgroundSecondary: '#F7FAFC',
  
  // Estados
  success: '#4CAF50',
  warning: '#FFC107',
  error: '#F44336',
  info: '#2196F3',
  
  // Outros
  border: '#E2E8F0',
};
```

---

## 8. CONFIGURAÇÃO DE API

### Arquivo: `src/config/api.config.js`

```javascript
const API_CONFIG = {
  BASE_URL: 'http://192.168.0.56:3000/api',
  TIMEOUT: 10000,
  
  ENDPOINTS: {
    // Autenticação
    LOGIN: '/auth/login',
    USERS: '/usuarios',
    
    // Produtos
    PRODUCTS: '/produtos',
    PRODUCT_BY_CODE: '/produtos/codigo/:codigo',
    
    // Movimentações
    MOVEMENTS: '/movimentacoes',
    MOVEMENTS_SYNC: '/movimentacoes/sync',
    
    // Tags NFC
    NFC_TAGS: '/tags-nfc',
    NFC_TAG_BY_VALUE: '/tags-nfc/tag/:valor',
    
    // Sincronização
    SYNC_PULL: '/sync/pull',
    SYNC_PUSH: '/sync/push',
  },
};
```

---

## 9. INICIALIZAÇÃO DO APP

### Arquivo: `App.js`

```javascript
import React, { useEffect } from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import DatabaseModel from './src/models/DatabaseModel';
import SyncService from './src/services/SyncService';

export default function App() {
  useEffect(() => {
    // Inicializa banco SQLite
    const initApp = async () => {
      await DatabaseModel.initDatabase();
      
      // Inicia sincronização automática (a cada 5 minutos)
      SyncService.startAutoSync(5);
    };

    initApp();
  }, []);

  return <AppNavigator />;
}
```

---

## 10. FLUXO COMPLETO DE MOVIMENTAÇÃO

### Sequência de Operações:

```
1. Usuário faz login (setor LO)
   └─> LoginScreen → ReadMethodScreen

2. Escolhe "Leitura por NFC"
   └─> ReadMethodScreen → NFCReaderScreen

3. Pressiona "Iniciar Leitura"
   └─> NFCService.startReading()

4. Aproxima tag NFC do produto
   └─> handleTagDiscovered()
       └─> Extrai JSON: {"produto": "ABC123"}
       └─> ProductModel.getProductByCode("ABC123")

5. Produto encontrado
   └─> showMovementDialog()
       └─> Usuário escolhe: ENTRADA ou SAÍDA
       └─> Insere quantidade

6. Registra movimentação
   └─> MovementModel.registerMovement()
       
       a) SE ONLINE:
          └─> POST para MySQL API
          └─> Atualiza estoque no MySQL
          └─> Retorna sucesso
       
       b) SE OFFLINE:
          └─> INSERT em movimentacoes_local (SQLite)
          └─> INSERT em fila_sincronizacao
          └─> Retorna sucesso (pendente sync)

7. Feedback visual
   └─> Alert: "Movimentação registrada com sucesso"
   └─> Atualiza histórico na tela

8. Sincronização (quando voltar online)
   └─> SyncService.syncPendingOperations()
       └─> Envia dados pendentes para MySQL
       └─> DELETE de movimentacoes_local
       └─> DELETE de fila_sincronizacao
```

---

## 11. CONCLUSÃO

### Diferenciais do Sistema:

- **Offline-First:** Funciona sem internet, sincroniza quando disponível
- **NFC Nativo:** Autenticação e leitura de produtos por aproximação
- **Multi-Plataforma:** Android, iOS (via Expo)
- **Sincronização Automática:** A cada 5 minutos e ao detectar conexão
- **Cache Inteligente:** SQLite apenas para dados temporários
- **Navegação Contextual:** Telas específicas por setor do usuário
- **Feedback Visual:** Indicadores de conexão e estados de loading

### Tecnologias Principais:

- React Native 0.81.5
- Expo SDK 54
- React Navigation 7
- react-native-nfc-manager 3.17
- expo-sqlite 16.0.9
- axios 1.13.2
- NetInfo 11.4.1

### Arquitetura:

**MVC Pattern:**
- Models: Lógica de dados (SQLite + API)
- Views: Componentes React Native
- Controllers: Orquestração de autenticação

**Offline-First:**
- SQLite como cache temporário
- MySQL como fonte primária
- Fila de sincronização assíncrona

---

**Documentação gerada em:** 2 de dezembro de 2025
**Versão do App:** 1.0.0
**Desenvolvido com:** React Native + Expo
