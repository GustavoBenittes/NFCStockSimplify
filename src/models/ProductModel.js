/**
 * ProductModel - Model para gerenciar produtos
 * Trabalha com SQLite local e sincroniza com MySQL quando possível
 */

import DatabaseModel from './DatabaseModel';
import SyncService from '../services/SyncService';

class ProductModel {
  /**
   * Busca todos os produtos locais
   */
  static async getAllProducts() {
    try {
      const result = await DatabaseModel.fetchQuery(
        'SELECT * FROM produtos_local ORDER BY descricao ASC'
      );

      return result;
    } catch (error) {
    //   console.error('Erro ao buscar produtos:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Busca produto por ID
   */
  static async getProductById(idProduto) {
    try {
      const result = await DatabaseModel.fetchQuery(
        'SELECT * FROM produtos_local WHERE id_produto = ?',
        [idProduto]
      );

      return {
        success: true,
        data: result.data && result.data.length > 0 ? result.data[0] : null
      };
    } catch (error) {
    //   console.error('Erro ao buscar produto:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Busca produto por código interno
   */
  static async getProductByCode(codigoInterno) {
    try {
      const result = await DatabaseModel.fetchQuery(
        'SELECT * FROM produtos_local WHERE codigo_interno = ?',
        [codigoInterno]
      );

      return {
        success: true,
        data: result.data && result.data.length > 0 ? result.data[0] : null
      };
    } catch (error) {
    //   console.error('Erro ao buscar produto por código:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Adiciona ou atualiza produto local
   */
  static async saveProduct(produto) {
    try {
      const query = `
        INSERT OR REPLACE INTO produtos_local 
        (id_produto, codigo_interno, descricao, categoria, quantidade_atual, atualizado_em) 
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `;

      const result = await DatabaseModel.executeQuery(query, [
        produto.id_produto || null,
        produto.codigo_interno,
        produto.descricao,
        produto.categoria || '',
        produto.quantidade_atual || 0
      ]);

      if (result.success) {
        // Adiciona à fila de sincronização
        await SyncService.addToSyncQueue('PRODUTO', produto);
      }

      return result;
    } catch (error) {
    //   console.error('Erro ao salvar produto:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Atualiza quantidade do produto
   */
  static async updateQuantity(idProduto, novaQuantidade) {
    try {
      const result = await DatabaseModel.executeQuery(
        `UPDATE produtos_local 
         SET quantidade_atual = ?, atualizado_em = datetime('now') 
         WHERE id_produto = ?`,
        [novaQuantidade, idProduto]
      );

      return result;
    } catch (error) {
    //   console.error('Erro ao atualizar quantidade:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Busca produtos por categoria
   */
  static async getProductsByCategory(categoria) {
    try {
      const result = await DatabaseModel.fetchQuery(
        'SELECT * FROM produtos_local WHERE categoria = ? ORDER BY descricao ASC',
        [categoria]
      );

      return result;
    } catch (error) {
    //   console.error('Erro ao buscar produtos por categoria:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Busca produtos com estoque baixo (menos de 10 unidades)
   */
  static async getLowStockProducts(limiteMinimo = 10) {
    try {
      const result = await DatabaseModel.fetchQuery(
        'SELECT * FROM produtos_local WHERE quantidade_atual < ? ORDER BY quantidade_atual ASC',
        [limiteMinimo]
      );

      return result;
    } catch (error) {
    //   console.error('Erro ao buscar produtos com estoque baixo:', error);
      return { success: false, error: error.message };
    }
  }
}

export default ProductModel;
