/**
 * UserModel - Model para gerenciar usuários locais
 * Trabalha com SQLite local e sincroniza com MySQL quando possível
 */

import DatabaseModel from './DatabaseModel';

class UserModel {
  /**
   * Busca todos os usuários locais
   */
  static async getAllUsers() {
    try {
      const result = await DatabaseModel.fetchQuery(
        'SELECT * FROM usuarios_local ORDER BY nome ASC'
      );

      return result;
    } catch (error) {
    //   console.error('Erro ao buscar usuários:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Busca usuário por ID
   */
  static async getUserById(idUsuario) {
    try {
      const result = await DatabaseModel.fetchQuery(
        'SELECT * FROM usuarios_local WHERE id_usuario = ?',
        [idUsuario]
      );

      return {
        success: true,
        data: result.data && result.data.length > 0 ? result.data[0] : null
      };
    } catch (error) {
    //   console.error('Erro ao buscar usuário:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Salva usuário local após autenticação
   */
  static async saveUser(usuario) {
    try {
      const query = `
        INSERT OR REPLACE INTO usuarios_local 
        (id_usuario, nome, email, senha_hash, perfil, setor, nfc_tag, atualizado_em) 
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `;

      const result = await DatabaseModel.executeQuery(query, [
        usuario.id_usuario,
        usuario.nome,
        usuario.email || '',
        usuario.senha_hash || null,
        usuario.perfil,
        usuario.setor || '',
        usuario.nfc_tag || null
      ]);

      if (result.success) {
        // console.log(`Usuário ${usuario.nome} salvo localmente`);
      }

      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Busca usuário por tag NFC
   */
  static async getUserByNFCTag(nfcTag) {
    try {
      const result = await DatabaseModel.fetchQuery(
        'SELECT * FROM usuarios_local WHERE nfc_tag = ? AND ativo = 1',
        [nfcTag]
      );

      return {
        success: true,
        data: result.data && result.data.length > 0 ? result.data[0] : null
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Busca usuário por email
   */
  static async getUserByEmail(email) {
    try {
      const result = await DatabaseModel.fetchQuery(
        'SELECT * FROM usuarios_local WHERE email = ?',
        [email]
      );

      return {
        success: true,
        data: result.data && result.data.length > 0 ? result.data[0] : null
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Busca usuários por perfil
   */
  static async getUsersByProfile(perfil) {
    try {
      const result = await DatabaseModel.fetchQuery(
        'SELECT * FROM usuarios_local WHERE perfil = ? ORDER BY nome ASC',
        [perfil]
      );

      return result;
    } catch (error) {
    //   console.error('Erro ao buscar usuários por perfil:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove usuário local
   */
  static async deleteUser(idUsuario) {
    try {
      const result = await DatabaseModel.executeQuery(
        'DELETE FROM usuarios_local WHERE id_usuario = ?',
        [idUsuario]
      );

      return result;
    } catch (error) {
    //   console.error('Erro ao deletar usuário:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Conta total de usuários
   */
  static async countUsers() {
    try {
      const result = await DatabaseModel.fetchQuery(
        'SELECT COUNT(*) as total FROM usuarios_local'
      );

      return {
        success: true,
        total: result.data && result.data.length > 0 ? result.data[0].total : 0
      };
    } catch (error) {
    //   console.error('Erro ao contar usuários:', error);
      return { success: false, error: error.message };
    }
  }
}

export default UserModel;
