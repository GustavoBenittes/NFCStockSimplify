/**
 * LogService.js
 * Serviço centralizado para gerenciamento de logs do aplicativo
 * Registra erros, avisos e informações para debug e monitoramento
 */

import { Platform } from 'react-native';
import DatabaseModel from '../models/DatabaseModel';

class LogService {
  static LOG_LEVELS = {
    INFO: 'INFO',
    WARNING: 'WARNING',
    ERROR: 'ERROR',
    DEBUG: 'DEBUG',
  };

  static isEnabled = __DEV__; // Apenas em desenvolvimento por padrão
  static persistLogs = true; // Salvar logs no SQLite

  /**
   * Registra um log de informação
   */
  static info(message, context = null) {
    this._log(this.LOG_LEVELS.INFO, message, context);
  }

  /**
   * Registra um aviso
   */
  static warning(message, context = null) {
    this._log(this.LOG_LEVELS.WARNING, message, context);
  }

  /**
   * Registra um erro
   */
  static error(message, error = null, context = null) {
    const errorData = error ? {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
      ...context
    } : context;

    this._log(this.LOG_LEVELS.ERROR, message, errorData);
  }

  /**
   * Registra um log de debug
   */
  static debug(message, context = null) {
    if (__DEV__) {
      this._log(this.LOG_LEVELS.DEBUG, message, context);
    }
  }

  /**
   * Método interno para processar logs
   */
  static _log(level, message, context = null) {
    if (!this.isEnabled) return;

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      context: context ? JSON.stringify(context, null, 2) : null,
      platform: Platform.OS,
    };

    // Console output com cores/formato apropriado
    this._consoleOutput(logEntry);

    // Persiste no banco de dados SQLite
    if (this.persistLogs && level === this.LOG_LEVELS.ERROR) {
      this._persistLog(logEntry);
    }
  }

  /**
   * Exibe log no console com formatação
   */
  static _consoleOutput(logEntry) {
    const prefix = `[${logEntry.timestamp}] [${logEntry.level}]`;
    const fullMessage = `${prefix} ${logEntry.message}`;

    switch (logEntry.level) {
      case this.LOG_LEVELS.ERROR:
        console.error(fullMessage, logEntry.context || '');
        break;
      case this.LOG_LEVELS.WARNING:
        console.warn(fullMessage, logEntry.context || '');
        break;
      case this.LOG_LEVELS.INFO:
        console.log(fullMessage, logEntry.context || '');
        break;
      case this.LOG_LEVELS.DEBUG:
        console.log(fullMessage, logEntry.context || '');
        break;
      default:
        console.log(fullMessage, logEntry.context || '');
    }
  }

  /**
   * Salva log no banco SQLite
   */
  static async _persistLog(logEntry) {
    try {
      if (Platform.OS === 'web') return;

      await DatabaseModel.executeQuery(
        `INSERT INTO logs_erros 
         (timestamp, nivel, mensagem, contexto, plataforma) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          logEntry.timestamp,
          logEntry.level,
          logEntry.message,
          logEntry.context,
          logEntry.platform,
        ]
      );
    } catch (error) {
      // Não fazer nada se falhar ao salvar log (evitar loop infinito)
      console.error('Erro ao persistir log:', error.message);
    }
  }

  /**
   * Busca logs salvos no banco
   */
  static async getLogs(limit = 100, level = null) {
    try {
      if (Platform.OS === 'web') {
        return { success: false, data: [], message: 'SQLite não disponível na web' };
      }

      let query = 'SELECT * FROM logs_erros';
      const params = [];

      if (level) {
        query += ' WHERE nivel = ?';
        params.push(level);
      }

      query += ' ORDER BY id DESC LIMIT ?';
      params.push(limit);

      const result = await DatabaseModel.fetchQuery(query, params);
      return result;
    } catch (error) {
      console.error('Erro ao buscar logs:', error);
      return { success: false, data: [], error: error.message };
    }
  }

  /**
   * Limpa logs antigos (mais de X dias)
   */
  static async clearOldLogs(daysToKeep = 7) {
    try {
      if (Platform.OS === 'web') return { success: false };

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await DatabaseModel.executeQuery(
        `DELETE FROM logs_erros WHERE timestamp < ?`,
        [cutoffDate.toISOString()]
      );

      this.info(`Logs antigos removidos (${result.changes || 0} registros)`);
      return { success: true, removed: result.changes };
    } catch (error) {
      this.error('Erro ao limpar logs antigos', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Limpa todos os logs
   */
  static async clearAllLogs() {
    try {
      if (Platform.OS === 'web') return { success: false };

      const result = await DatabaseModel.executeQuery('DELETE FROM logs_erros');
      this.info('Todos os logs foram removidos');
      return { success: true, removed: result.changes };
    } catch (error) {
      console.error('Erro ao limpar todos os logs:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Exporta logs em formato JSON
   */
  static async exportLogs() {
    try {
      const result = await this.getLogs(1000);
      if (result.success) {
        return {
          success: true,
          logs: result.data,
          exportedAt: new Date().toISOString(),
          totalLogs: result.data.length,
        };
      }
      return { success: false, error: 'Falha ao buscar logs' };
    } catch (error) {
      this.error('Erro ao exportar logs', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Ativa/desativa logs
   */
  static setEnabled(enabled) {
    this.isEnabled = enabled;
    this.info(`Logs ${enabled ? 'ativados' : 'desativados'}`);
  }

  /**
   * Ativa/desativa persistência
   */
  static setPersistLogs(persist) {
    this.persistLogs = persist;
    this.info(`Persistência de logs ${persist ? 'ativada' : 'desativada'}`);
  }

  /**
   * Retorna estatísticas de logs
   */
  static async getLogStats() {
    try {
      if (Platform.OS === 'web') {
        return { success: false, message: 'SQLite não disponível' };
      }

      const totalResult = await DatabaseModel.fetchQuery(
        'SELECT COUNT(*) as total FROM logs_erros'
      );

      const errorResult = await DatabaseModel.fetchQuery(
        `SELECT COUNT(*) as total FROM logs_erros WHERE nivel = ?`,
        [this.LOG_LEVELS.ERROR]
      );

      const warningResult = await DatabaseModel.fetchQuery(
        `SELECT COUNT(*) as total FROM logs_erros WHERE nivel = ?`,
        [this.LOG_LEVELS.WARNING]
      );

      return {
        success: true,
        stats: {
          total: totalResult.data[0]?.total || 0,
          errors: errorResult.data[0]?.total || 0,
          warnings: warningResult.data[0]?.total || 0,
        },
      };
    } catch (error) {
      this.error('Erro ao buscar estatísticas de logs', error);
      return { success: false, error: error.message };
    }
  }
}

export default LogService;
