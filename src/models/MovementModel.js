/**
 * MovementModel - Model para gerenciar movimentações de estoque
 * Trabalha com SQLite local e sincroniza com MySQL quando possível
 */

import DatabaseModel from './DatabaseModel';
import ProductModel from './ProductModel';
import SyncService from '../services/SyncService';

class MovementModel {
  /**
   * Registra uma movimentação de estoque
   * Tenta gravar no MySQL primeiro; se offline, grava no SQLite
   */
  static async registerMovement(movimentacao) {
    try {
      const {
        id_produto,
        tipo, // 'ENTRADA' ou 'SAIDA'
        quantidade,
        origem // 'NFC', 'CODIGO_BARRAS', 'MANUAL'
      } = movimentacao;

      // Valida dados
      if (!id_produto || !tipo || !quantidade || quantidade <= 0) {
        return { success: false, error: 'Dados inválidos' };
      }

      // Busca produto atual
      const productResult = await ProductModel.getProductById(id_produto);
      if (!productResult.success || !productResult.data) {
        return { success: false, error: 'Produto não encontrado' };
      }

      const produto = productResult.data;
      let novaQuantidade = produto.quantidade_atual;

      // Calcula nova quantidade
      if (tipo === 'ENTRADA') {
        novaQuantidade += quantidade;
      } else if (tipo === 'SAIDA') {
        novaQuantidade -= quantidade;
        
        // Valida se há estoque suficiente
        if (novaQuantidade < 0) {
          return { success: false, error: 'Estoque insuficiente' };
        }
      } else {
        return { success: false, error: 'Tipo de movimentação inválido' };
      }

      // Verifica conexão e tenta gravar no MySQL primeiro
      const hasConnection = await SyncService.hasConnection();
      const serverAvailable = hasConnection ? await SyncService.testServerConnection() : false;

      if (serverAvailable) {
        // ONLINE: Grava direto no MySQL
        const mysqlResult = await this.saveToMySQL({
          id_produto,
          tipo,
          quantidade,
          origem: origem || 'MANUAL',
          timestamp_mobile: new Date().toISOString()
        });

        if (mysqlResult.success) {
        //   console.log(' Movimentação salva no MySQL (online)');
          
          // Atualiza quantidade local para manter cache sincronizado
          await ProductModel.updateQuantity(id_produto, novaQuantidade);

          return {
            success: true,
            data: {
              id_mysql: mysqlResult.data?.id,
              nova_quantidade: novaQuantidade,
              origem_gravacao: 'MYSQL'
            }
          };
        }
      }

      // OFFLINE: Grava no SQLite e adiciona à fila
    //   console.log('Offline - salvando no SQLite temporário');
      
      const insertResult = await DatabaseModel.executeQuery(
        `INSERT INTO movimentacoes_local 
         (id_produto, tipo, quantidade, origem, timestamp_mobile, sincronizado) 
         VALUES (?, ?, ?, ?, datetime('now'), 0)`,
        [id_produto, tipo, quantidade, origem || 'MANUAL']
      );

      if (!insertResult.success) {
        return insertResult;
      }

      // Atualiza quantidade do produto localmente
      await ProductModel.updateQuantity(id_produto, novaQuantidade);

      // Adiciona à fila de sincronização
      await SyncService.addToSyncQueue('MOVIMENTACAO', {
        id_produto,
        tipo,
        quantidade,
        origem: origem || 'MANUAL',
        timestamp_mobile: new Date().toISOString(),
        id_local: insertResult.result.lastInsertRowId
      });

      return {
        success: true,
        data: {
          id_local: insertResult.result.lastInsertRowId,
          nova_quantidade: novaQuantidade,
          origem_gravacao: 'SQLITE'
        }
      };

    } catch (error) {
    //   console.error('Erro ao registrar movimentação:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Salva movimentação diretamente no MySQL
   */
  static async saveToMySQL(movimentacao) {
    try {
      const axios = require('axios').default;
      const API_CONFIG = require('../config/api.config').default;

      const response = await axios.post(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.MOVEMENTS_SYNC}`,
        movimentacao,
        { timeout: API_CONFIG.TIMEOUT }
      );

      if (response.status === 200 || response.status === 201) {
        return { success: true, data: response.data };
      }

      return { success: false, error: 'Erro ao salvar no MySQL' };
    } catch (error) {
    //   console.log('Erro ao salvar no MySQL:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Busca todas as movimentações
   */
  static async getAllMovements() {
    try {
      const result = await DatabaseModel.fetchQuery(
        `SELECT m.*, p.descricao as produto_descricao, p.codigo_interno 
         FROM movimentacoes_local m 
         LEFT JOIN produtos_local p ON m.id_produto = p.id_produto 
         ORDER BY m.timestamp_mobile DESC`
      );

      return result;
    } catch (error) {
    //   console.error('Erro ao buscar movimentações:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Busca movimentações de um produto específico
   */
  static async getMovementsByProduct(idProduto) {
    try {
      const result = await DatabaseModel.fetchQuery(
        `SELECT m.*, p.descricao as produto_descricao, p.codigo_interno 
         FROM movimentacoes_local m 
         LEFT JOIN produtos_local p ON m.id_produto = p.id_produto 
         WHERE m.id_produto = ? 
         ORDER BY m.timestamp_mobile DESC`,
        [idProduto]
      );

      return result;
    } catch (error) {
    //   console.error('Erro ao buscar movimentações do produto:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Busca movimentações pendentes de sincronização
   */
  static async getPendingMovements() {
    try {
      const result = await DatabaseModel.fetchQuery(
        `SELECT m.*, p.descricao as produto_descricao 
         FROM movimentacoes_local m 
         LEFT JOIN produtos_local p ON m.id_produto = p.id_produto 
         WHERE m.sincronizado = 0 
         ORDER BY m.timestamp_mobile ASC`
      );

      return result;
    } catch (error) {
    //   console.error('Erro ao buscar movimentações pendentes:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Marca movimentação como sincronizada
   */
  static async markAsSynchronized(idLocal) {
    try {
      const result = await DatabaseModel.executeQuery(
        'UPDATE movimentacoes_local SET sincronizado = 1 WHERE id_local = ?',
        [idLocal]
      );

      return result;
    } catch (error) {
    //   console.error('Erro ao marcar movimentação como sincronizada:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Busca resumo de movimentações (total de entradas e saídas)
   */
  static async getMovementsSummary() {
    try {
      const result = await DatabaseModel.fetchQuery(
        `SELECT 
           tipo,
           COUNT(*) as total_movimentacoes,
           SUM(quantidade) as total_quantidade
         FROM movimentacoes_local 
         GROUP BY tipo`
      );

      return result;
    } catch (error) {
    //   console.error('Erro ao buscar resumo de movimentações:', error);
      return { success: false, error: error.message };
    }
  }
}

export default MovementModel;
