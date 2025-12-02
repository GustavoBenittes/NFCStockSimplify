/**
 * DatabaseModel - Gerenciamento do banco de dados SQLite local
 * Padrão MVC: Model
 */

import { Platform } from 'react-native';

// Importa SQLite apenas em plataformas mobile
let SQLite = null;
if (Platform.OS !== 'web') {
  SQLite = require('expo-sqlite');
}

class DatabaseModel {
  static db = null;

  /**
   * Inicializa o banco de dados SQLite
   */
  static async initDatabase() {
    try {
      // Web não usa SQLite - usa localStorage ou mock
      if (Platform.OS === 'web') {
        // console.log('Plataforma Web - SQLite desabilitado (usar AsyncStorage ou API)');
        return { success: true, message: 'Web - sem SQLite local' };
      }

      if (!SQLite) {
        // console.error('SQLite não disponível nesta plataforma');
        return { success: false, message: 'SQLite não disponível' };
      }

      this.db = await SQLite.openDatabaseAsync('nfcstocksimplify.db');
      
      await this.createTables();
    //   console.log(' Banco de dados SQLite inicializado com sucesso');
      
      return { success: true, message: 'Banco inicializado' };
    } catch (error) {
    //   console.error('Erro ao inicializar banco de dados:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Cria as tabelas do SQLite conforme schema
   */
  static async createTables() {
    try {
      // Ignora em plataformas sem SQLite
      if (Platform.OS === 'web' || !this.db) {
        return;
      }
      // Tabela: usuarios_local
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

      // Tabela: produtos_local
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

      // Tabela: movimentacoes_local
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

      // Tabela: fila_sincronizacao
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

      // Tabela: logs_erros (para o LogService)
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS logs_erros (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp TEXT NOT NULL,
          nivel TEXT NOT NULL,
          mensagem TEXT NOT NULL,
          contexto TEXT,
          plataforma TEXT
        );
      `);

    //   console.log(' Tabelas SQLite criadas com sucesso');
    } catch (error) {
    //   console.error('Erro ao criar tabelas:', error);
      throw error;
    }
  }

  /**
   * Executa uma query SQL
   */
  static async executeQuery(query, params = []) {
    try {
      if (Platform.OS === 'web') {
        // console.warn('executeQuery chamado na web - operação ignorada');
        return { success: false, error: 'SQLite não disponível na web' };
      }

      if (!this.db) {
        await this.initDatabase();
      }
      
      if (!this.db) {
        return { success: false, error: 'Banco não inicializado' };
      }

      const result = await this.db.runAsync(query, params);
      return { success: true, result };
    } catch (error) {
    //   console.error('Erro ao executar query:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Busca dados com query SQL
   */
  static async fetchQuery(query, params = []) {
    try {
      if (Platform.OS === 'web') {
        // console.warn('fetchQuery chamado na web - retornando vazio');
        return { success: true, data: [] };
      }

      if (!this.db) {
        await this.initDatabase();
      }
      
      if (!this.db) {
        return { success: true, data: [] };
      }

      const result = await this.db.getAllAsync(query, params);
      return { success: true, data: result };
    } catch (error) {
    //   console.error('Erro ao buscar dados:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Limpa todas as tabelas (use com cuidado!)
   */
  static async clearAllTables() {
    try {
      if (Platform.OS === 'web' || !this.db) {
        // console.warn('clearAllTables - SQLite não disponível');
        return { success: false, error: 'SQLite não disponível' };
      }

      await this.db.execAsync(`DELETE FROM usuarios_local;`);
      await this.db.execAsync(`DELETE FROM produtos_local;`);
      await this.db.execAsync(`DELETE FROM movimentacoes_local;`);
      await this.db.execAsync(`DELETE FROM fila_sincronizacao;`);
      
    //   console.log(' Todas as tabelas foram limpas');
      return { success: true };
    } catch (error) {
    //   console.error('Erro ao limpar tabelas:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Fecha a conexão com o banco de dados
   */
  static async closeDatabase() {
    try {
      if (this.db) {
        await this.db.closeAsync();
        this.db = null;
        // console.log(' Banco de dados fechado');
      }
    } catch (error) {
    //   console.error('Erro ao fechar banco:', error);
    }
  }
}

export default DatabaseModel;
