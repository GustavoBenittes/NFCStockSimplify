/**
 * AuthController - Controller para gerenciar a lógica de autenticação
 * Padrão MVC: Controller
 */

import AuthModel from '../models/AuthModel';

class AuthController {
  /**
   * Realiza o login do usuário
   * @param {string} email - Email do usuário
   * @param {string} password - Senha do usuário
   * @param {function} onSuccess - Callback de sucesso
   * @param {function} onError - Callback de erro
   */
  static async login(email, password, onSuccess, onError) {
    try {
      // Valida as credenciais
      const validation = AuthModel.validateCredentials(email, password);
      
      if (!validation.isValid) {
        if (onError) {
          onError(validation.message);
        }
        return;
      }

      // Autentica o usuário
      const result = await AuthModel.authenticate(email, password);
      
      if (result.success) {
        if (onSuccess) {
          onSuccess(result.user, result.message);
        }
      } else {
        if (onError) {
          onError(result.message);
        }
      }
    } catch (error) {
      if (onError) {
        onError('Erro ao realizar login. Tente novamente.');
      }
    }
  }

  /**
   * Valida email em tempo real
   * @param {string} email - Email a ser validado
   * @returns {object} - Retorna objeto com status e mensagem
   */
  static validateEmailInput(email) {
    if (!email || email.trim() === '') {
      return {
        isValid: false,
        message: ''
      };
    }

    const isValid = AuthModel.validateEmail(email);
    return {
      isValid,
      message: isValid ? '' : 'Email inválido'
    };
  }

  /**
   * Valida senha em tempo real
   * @param {string} password - Senha a ser validada
   * @returns {object} - Retorna objeto com status e mensagem
   */
  static validatePasswordInput(password) {
    if (!password || password.trim() === '') {
      return {
        isValid: false,
        message: ''
      };
    }

    const isValid = AuthModel.validatePassword(password);
    return {
      isValid,
      message: isValid ? '' : 'Senha deve ter no mínimo 6 caracteres'
    };
  }

  /**
   * Realiza logout do usuário
   * @param {function} onSuccess - Callback de sucesso
   */
  static logout(onSuccess) {
    // Simulação de logout
    if (onSuccess) {
      onSuccess('Logout realizado com sucesso!');
    }
  }
}

export default AuthController;
