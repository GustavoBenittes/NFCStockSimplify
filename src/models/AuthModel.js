/**
 * AuthModel - Model para gerenciar dados e validações de autenticação
 * Padrão MVC: Model
 */

class AuthModel {
  /**
   * Valida o formato do email
   * @param {string} email - Email a ser validado
   * @returns {boolean} - Retorna true se o email é válido
   */
  static validateEmail(email) {
    if (!email || email.trim() === '') {
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Valida a senha
   * @param {string} password - Senha a ser validada
   * @returns {boolean} - Retorna true se a senha é válida
   */
  static validatePassword(password) {
    if (!password || password.trim() === '') {
      return false;
    }
    
    // Mínimo de 6 caracteres
    return password.length >= 6;
  }

  /**
   * Valida as credenciais completas
   * @param {string} email - Email do usuário
   * @param {string} password - Senha do usuário
   * @returns {object} - Retorna objeto com status e mensagem
   */
  static validateCredentials(email, password) {
    if (!this.validateEmail(email)) {
      return {
        isValid: false,
        message: 'Email inválido'
      };
    }

    if (!this.validatePassword(password)) {
      return {
        isValid: false,
        message: 'Senha deve ter no mínimo 6 caracteres'
      };
    }

    return {
      isValid: true,
      message: 'Credenciais válidas'
    };
  }

  /**
   * Autentica usuário via tag NFC (offline-first)
   * @param {string} nfcTagValue - Valor da tag NFC do crachá
   * @returns {Promise<object>} - Retorna promessa com resultado da autenticação
   */
  static async authenticateByNFC(nfcTagValue) {
    try {
      if (!nfcTagValue || nfcTagValue.trim() === '') {
        return {
          success: false,
          message: 'Tag NFC inválida'
        };
      }

      // Importa dinamicamente para evitar ciclos
      const NetInfo = require('@react-native-community/netinfo').default;
      const axios = require('axios').default;
      const API_CONFIG = require('../config/api.config').default;
      const UserModel = require('./UserModel').default;

      // Verifica conexão
      const netState = await NetInfo.fetch();
      const isOnline = netState.isConnected;

      if (isOnline) {
        // ONLINE: Tenta autenticar via API
        try {
          // console.log('Autenticação NFC via API...');
          
          const response = await axios.get(
            `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.NFC_TAG_BY_VALUE.replace(':valor', nfcTagValue)}`,
            { timeout: API_CONFIG.TIMEOUT }
          );

          if (response.data && response.data.success) {
            const userData = response.data.data?.user || response.data.user;
            const token = response.data.data?.token || response.data.token;
            
            if (!userData) {
              return {
                success: false,
                message: 'Crachá NFC não encontrado'
              };
            }

            // Salva usuário no cache local com tag NFC
            await UserModel.saveUser({
              id_usuario: userData.id,
              nome: userData.nome,
              email: userData.email,
              perfil: userData.perfil || 'USER',
              setor: userData.setor || '',
              nfc_tag: nfcTagValue,
              senha_hash: null
            });

            // console.log('Login NFC via API concluído');

            return {
              success: true,
              user: {
                id: userData.id,
                email: userData.email,
                name: userData.nome,
                setor: userData.setor,
                perfil: userData.perfil
              },
              token: token,
              source: 'MYSQL'
            };
          }
        } catch (apiError) {
          // console.log('Erro na API, tentando cache local:', apiError.message);
        }
      }

      // OFFLINE ou API falhou: Busca no cache local
      // console.log('Buscando crachá NFC no cache local...');
      const localUser = await UserModel.getUserByNFCTag(nfcTagValue);

      if (localUser.success && localUser.data) {
        const user = localUser.data;
        
        // console.log('Login NFC via cache local concluído');

        return {
          success: true,
          user: {
            id: user.id_usuario,
            email: user.email,
            name: user.nome,
            setor: user.setor,
            perfil: user.perfil
          },
          token: null,
          source: 'SQLITE'
        };
      }

      return {
        success: false,
        message: 'Crachá NFC não cadastrado'
      };

    } catch (error) {
      // console.log('Erro na autenticação NFC:', error);
      return {
        success: false,
        message: 'Erro ao autenticar com NFC: ' + error.message
      };
    }
  }

  /**
   * Autentica usuário via API MySQL ou cache local (offline)
   * @param {string} email - Email do usuário
   * @param {string} password - Senha do usuário
   * @returns {Promise<object>} - Retorna promessa com resultado da autenticação
   */
  static async authenticate(email, password) {
    try {
      // Valida credenciais antes
      const validation = this.validateCredentials(email, password);
      if (!validation.isValid) {
        return {
          success: false,
          message: validation.message
        };
      }

      // Importa dinamicamente para evitar ciclos
      const NetInfo = require('@react-native-community/netinfo').default;
      const axios = require('axios').default;
      const API_CONFIG = require('../config/api.config').default;
      const UserModel = require('./UserModel').default;

      // Verifica conexão
      const netState = await NetInfo.fetch();
      const isOnline = netState.isConnected;

      if (isOnline) {
        // ONLINE: Tenta autenticar via API
        try {
          // console.log('Tentando autenticação via API...');
          
          const response = await axios.post(
            `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LOGIN}`,
            { email, senha: password },
            { timeout: API_CONFIG.TIMEOUT }
          );

          // console.log('Resposta da API:', response.data);

          if (response.data && response.data.success) {
            // A API retorna: { success: true, data: { user: {...}, token: "..." } }
            const userData = response.data.data?.user || response.data.user;
            const token = response.data.data?.token || response.data.token;
            
            if (!userData) {
              // console.log('Dados do usuário não encontrados na resposta');
              return {
                success: false,
                message: 'Erro ao processar dados do usuário'
              };
            }

            // Salva usuário no cache local
            await UserModel.saveUser({
              id_usuario: userData.id,
              nome: userData.nome,
              email: userData.email,
              perfil: userData.perfil || 'USER',
              setor: userData.setor
            });

            // console.log('Autenticação MySQL bem-sucedida');

            return {
              success: true,
              user: {
                id: userData.id,
                email: userData.email,
                name: userData.nome,
                setor: userData.setor,
                perfil: userData.perfil || 'USER'
              },
              token: token,
              message: 'Login realizado com sucesso!',
              source: 'MYSQL'
            };
          }

          return {
            success: false,
            message: response.data?.message || response.data?.error || 'Email ou senha inválidos'
          };
        } catch (apiError) {
          // console.log('Erro na API:', apiError.response?.data || apiError.message);
          // console.log('Tentando cache local...');
          // Se API falhar, tenta local
        }
      }

      // OFFLINE ou API falhou: Tenta autenticação via cache local
      // console.log('Tentando autenticação offline...');
      const userResult = await UserModel.getUserByEmail(email);

      if (userResult.success && userResult.data) {
        const localUser = userResult.data;

        // Verifica senha (simples comparação - em produção use hash)
        if (localUser.senha_hash === password || !localUser.senha_hash) {
          // console.log('Autenticação offline bem-sucedida');

          return {
            success: true,
            user: {
              id: localUser.id_usuario,
              email: localUser.email,
              name: localUser.nome,
              setor: localUser.setor,
              perfil: localUser.perfil
            },
            message: 'Login offline realizado com sucesso!',
            source: 'SQLITE'
          };
        }

        return {
          success: false,
          message: 'Senha incorreta'
        };
      }

      return {
        success: false,
        message: 'Usuário não encontrado. Conecte-se à internet para primeiro acesso.'
      };
    } catch (error) {
      // console.error('Erro na autenticação:', error);
      return {
        success: false,
        message: 'Erro ao realizar login. Tente novamente.'
      };
    }
  }
}

export default AuthModel;
