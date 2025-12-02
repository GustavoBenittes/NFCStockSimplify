/**
 * SyncService - Serviço de sincronização entre SQLite e MySQL
 * Gerencia o envio e recebimento de dados quando há conexão
 */

import axios from 'axios';
import NetInfo from '@react-native-community/netinfo';
import API_CONFIG from '../config/api.config.js';
import DatabaseModel from '../models/DatabaseModel';

class SyncService {
  static isSyncing = false;
  static syncInterval = null;

  /**
   * Verifica se há conexão com internet
   */
  static async hasConnection() {
    const state = await NetInfo.fetch();
    return state.isConnected;
  }

  /**
   * Tenta conexão com o servidor MySQL
   */
  static async testServerConnection() {
    try {
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SYNC_STATUS}`,
        { timeout: API_CONFIG.TIMEOUT }
      );
      return response.status === 200;
    } catch (error) {
      // console.log('Servidor MySQL não disponível:', error.message);
      return false;
    }
  }

  /**
   * Adiciona operação à fila de sincronização
   */
  static async addToSyncQueue(tipoOperacao, payload) {
    try {
      const query = `
        INSERT INTO fila_sincronizacao 
        (tipo_operacao, payload_json, status, ultima_tentativa) 
        VALUES (?, ?, 'PENDENTE', datetime('now'))
      `;
      
      const result = await DatabaseModel.executeQuery(query, [
        tipoOperacao,
        JSON.stringify(payload)
      ]);

      if (result.success) {
        // console.log(` Operação ${tipoOperacao} adicionada à fila de sincronização`);
        
        // Tenta sincronizar imediatamente se houver conexão
        const hasConnection = await this.hasConnection();
        if (hasConnection) {
          await this.syncPendingOperations();
        }
      }

      return result;
    } catch (error) {
      // console.error('Erro ao adicionar à fila:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sincroniza operações pendentes na fila
   */
  static async syncPendingOperations() {
    if (this.isSyncing) {
      // console.log('Sincronização já em andamento...');
      return { success: false, message: 'Sincronização em andamento' };
    }

    try {
      this.isSyncing = true;

      // Verifica conexão
      const hasConnection = await this.hasConnection();
      if (!hasConnection) {
        // console.log(' Sem conexão - sincronização adiada');
        return { success: false, message: 'Sem conexão' };
      }

      // Verifica servidor
      const serverAvailable = await this.testServerConnection();
      if (!serverAvailable) {
        // console.log('Servidor não disponível - sincronização adiada');
        return { success: false, message: 'Servidor não disponível' };
      }

      // Busca operações pendentes
      const result = await DatabaseModel.fetchQuery(
        `SELECT * FROM fila_sincronizacao WHERE status = 'PENDENTE' ORDER BY id_fila ASC LIMIT 10`
      );

      if (!result.success || result.data.length === 0) {
        // console.log(' Nenhuma operação pendente para sincronizar');
        return { success: true, message: 'Nada para sincronizar' };
      }

      // console.log(`Sincronizando ${result.data.length} operações pendentes...`);

      let successCount = 0;
      let errorCount = 0;

      // Processa cada operação
      for (const operation of result.data) {
        const syncResult = await this.syncOperation(operation);
        
        if (syncResult.success) {
          successCount++;
          
          // Remove da fila após sucesso
          await DatabaseModel.executeQuery(
            'DELETE FROM fila_sincronizacao WHERE id_fila = ?',
            [operation.id_fila]
          );

          // Remove do SQLite após sincronização bem-sucedida
          const payload = JSON.parse(operation.payload_json);
          if (operation.tipo_operacao === 'MOVIMENTACAO' && payload.id_local) {
            await DatabaseModel.executeQuery(
              'DELETE FROM movimentacoes_local WHERE id_local = ?',
              [payload.id_local]
            );
            // console.log(` Movimentação ${payload.id_local} removida do SQLite após sync`);
          }
        } else {
          errorCount++;
          
          // Atualiza tentativas
          await DatabaseModel.executeQuery(
            `UPDATE fila_sincronizacao 
             SET tentativas = tentativas + 1, 
                 ultima_tentativa = datetime('now'),
                 status = CASE WHEN tentativas >= 5 THEN 'ERRO' ELSE 'PENDENTE' END
             WHERE id_fila = ?`,
            [operation.id_fila]
          );
        }
      }

      // console.log(` Sincronização concluída: ${successCount} sucesso, ${errorCount} erros`);

      return {
        success: true,
        message: `${successCount} operações sincronizadas`,
        successCount,
        errorCount
      };

    } catch (error) {
      // console.error('Erro na sincronização:', error);
      return { success: false, error: error.message };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sincroniza uma operação específica
   */
  static async syncOperation(operation) {
    try {
      const payload = JSON.parse(operation.payload_json);
      let endpoint = '';

      // Define endpoint baseado no tipo de operação
      switch (operation.tipo_operacao) {
        case 'MOVIMENTACAO':
          endpoint = API_CONFIG.ENDPOINTS.MOVEMENTS_SYNC;
          break;
        case 'PRODUTO':
          endpoint = API_CONFIG.ENDPOINTS.PRODUCTS;
          break;
        default:
          // console.warn(`Tipo de operação desconhecido: ${operation.tipo_operacao}`);
          return { success: false, message: 'Tipo de operação inválido' };
      }

      // Envia para servidor
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}${endpoint}`,
        payload,
        { timeout: API_CONFIG.TIMEOUT }
      );

      if (response.status === 200 || response.status === 201) {
        // console.log(` Operação ${operation.id_fila} sincronizada com sucesso`);
        return { success: true };
      }

      return { success: false, message: 'Resposta inesperada do servidor' };

    } catch (error) {
      // console.error(`Erro ao sincronizar operação ${operation.id_fila}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Baixa dados do servidor MySQL para SQLite (Pull)
   */
  static async pullDataFromServer() {
    try {
      const hasConnection = await this.hasConnection();
      if (!hasConnection) {
        return { success: false, message: 'Sem conexão' };
      }

      const serverAvailable = await this.testServerConnection();
      if (!serverAvailable) {
        return { success: false, message: 'Servidor não disponível' };
      }

      // console.log('Baixando dados do servidor...');

      // Busca produtos do servidor
      const productsResponse = await axios.get(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRODUCTS}`,
        { timeout: API_CONFIG.TIMEOUT }
      );

      if (productsResponse.data && productsResponse.data.length > 0) {
        // Atualiza produtos locais
        for (const product of productsResponse.data) {
          await DatabaseModel.executeQuery(
            `INSERT OR REPLACE INTO produtos_local 
             (id_produto, codigo_interno, descricao, categoria, quantidade_atual, atualizado_em) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              product.id_produto,
              product.codigo_interno,
              product.descricao,
              product.categoria || '',
              product.quantidade_atual || 0,
              product.atualizado_em || new Date().toISOString()
            ]
          );
        }

        // console.log(` ${productsResponse.data.length} produtos sincronizados do servidor`);
      }

      return { success: true, message: 'Dados baixados com sucesso' };

    } catch (error) {
      // console.error('Erro ao baixar dados do servidor:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Inicia sincronização automática periódica
   */
  static startAutoSync(intervalMinutes = 5) {
    if (this.syncInterval) {
      // console.log('Sincronização automática já está ativa');
      return;
    }

    // console.log(`Sincronização automática iniciada (a cada ${intervalMinutes} minutos)`);

    // Sincroniza imediatamente
    this.syncPendingOperations();

    // Configura intervalo
    this.syncInterval = setInterval(() => {
      this.syncPendingOperations();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Para sincronização automática
   */
  static stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      // console.log('Sincronização automática parada');
    }
  }

  /**
   * Força sincronização completa (Push + Pull)
   */
  static async forceFullSync() {
    // console.log('Iniciando sincronização completa...');
    
    // Push: envia dados pendentes
    await this.syncPendingOperations();
    
    // Pull: baixa dados do servidor
    await this.pullDataFromServer();
    
    // console.log(' Sincronização completa finalizada');
  }
}

export default SyncService;
