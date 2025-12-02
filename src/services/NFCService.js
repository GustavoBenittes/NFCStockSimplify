/**
 * NFCService - Serviço para gerenciar operações NFC
 * Verifica disponibilidade, lê tags e gerencia sessões
 */

import { Platform } from 'react-native';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';

class NFCService {
  static isInitialized = false;
  static isReading = false;

  /**
   * Inicializa o módulo NFC
   */
  static async init() {
    try {
      if (Platform.OS === 'web') {
        // console.log('NFC não disponível na web');
        return { success: false, message: 'NFC não disponível na web' };
      }

      if (this.isInitialized) {
        // console.log('NFC já inicializado');
        return { success: true, message: 'NFC já inicializado' };
      }

      // console.log('Iniciando NfcManager...');
      
      // Tenta inicializar o NFC Manager
      // Em algumas versões, start() pode retornar null, mas ainda assim funcionar
      try {
        await NfcManager.start();
        // console.log('NfcManager.start() executado');
      } catch (startError) {
        // console.log('Erro no start(), tentando verificar suporte direto:', startError?.message);
        
        // Tenta verificar se NFC está disponível mesmo com erro no start
        try {
          const isSupported = await NfcManager.isSupported();
          // console.log('isSupported:', isSupported);
          
          if (!isSupported) {
            return { 
              success: false, 
              message: 'Dispositivo não suporta NFC'
            };
          }
        } catch (e) {
          // console.log('Erro ao verificar suporte:', e?.message);
        }
      }
      
      this.isInitialized = true;
      // console.log('NFC inicializado com sucesso');
      
      return { success: true, message: 'NFC inicializado' };
    } catch (error) {
      // console.error('Erro ao inicializar NFC:', error);
      // console.error('Tipo de erro:', error?.name);
      // console.error('Mensagem:', error?.message);
      
      // Reset flag em caso de erro
      this.isInitialized = false;
      
      return { 
        success: false, 
        message: `Erro ao inicializar NFC: ${error?.message || 'Desconhecido'}`,
        error: error?.message 
      };
    }
  }

  /**
   * Verifica se o dispositivo suporta NFC
   */
  static async isSupported() {
    try {
      if (Platform.OS === 'web') {
        return { supported: false, message: 'NFC não disponível na web' };
      }

      const supported = await NfcManager.isSupported();
      return { 
        supported, 
        message: supported ? 'NFC disponível' : 'NFC não suportado neste dispositivo' 
      };
    } catch (error) {
    //   console.error('Erro ao verificar suporte NFC:', error);
      return { supported: false, message: 'Erro ao verificar NFC', error };
    }
  }

  /**
   * Verifica se o NFC está habilitado
   */
  static async isEnabled() {
    try {
      if (Platform.OS === 'web') {
        return { enabled: false, message: 'NFC não disponível na web' };
      }

      await this.init();
      const enabled = await NfcManager.isEnabled();
      
      return { 
        enabled, 
        message: enabled ? 'NFC está habilitado' : 'NFC está desabilitado' 
      };
    } catch (error) {
    //   console.error('Erro ao verificar status NFC:', error);
      return { enabled: false, message: 'Erro ao verificar status', error };
    }
  }

  /**
   * Lê tag NFC uma única vez (para login)
   * @returns {Promise<object>} - Retorna valor da tag ou erro
   */
  static async readNFCTag() {
    try {
      if (Platform.OS === 'web') {
        return { success: false, message: 'NFC não disponível na web' };
      }

      // console.log('Iniciando leitura NFC...');
      
      // Tenta inicializar se ainda não foi
      if (!this.isInitialized) {
        try {
          // console.log('Executando NfcManager.start()...');
          await NfcManager.start();
          this.isInitialized = true;
          // console.log('NfcManager iniciado');
        } catch (startError) {
          // console.log('Start falhou, continuando mesmo assim:', startError?.message);
          // Continua mesmo com erro - alguns dispositivos não precisam do start()
          this.isInitialized = true;
        }
      }

      // console.log('Aguardando aproximação do crachá NFC...');

      // Método alternativo: usar registerTagEvent
      return new Promise((resolve, reject) => {
        let resolved = false;
        
        const handleTag = (tag) => {
          if (resolved) return;
          resolved = true;
          
          // console.log('Tag detectada via evento:', JSON.stringify(tag, null, 2));
          
          // Remove listener
          NfcManager.unregisterTagEvent().catch(() => {});
          
          // Processa tag para extrair dados
          const processedData = this.parseNfcTag(tag);
          // console.log('Dados processados da tag:', processedData);
          
          // Verifica se há dados JSON (user_id e token)
          if (processedData.jsonData) {
            // console.log('JSON encontrado na tag:', processedData.jsonData);
            resolve({
              success: true,
              tagValue: tag.id,
              userData: processedData.jsonData,
              tag: tag
            });
          } else if (tag && tag.id) {
            // Se não tem JSON, retorna apenas o ID
            // console.log('Tag NFC ID:', tag.id);
            resolve({
              success: true,
              tagValue: tag.id,
              tag: tag
            });
          } else {
            resolve({
              success: false,
              message: 'Tag NFC sem dados válidos'
            });
          }
        };

        // Registra listener de tags
        NfcManager.registerTagEvent(handleTag)
          .then(() => {
            // console.log('Listener de tags NFC registrado');
            
            // Timeout de 30 segundos
            setTimeout(() => {
              if (!resolved) {
                resolved = true;
                NfcManager.unregisterTagEvent().catch(() => {});
                resolve({
                  success: false,
                  message: 'Timeout: nenhum crachá detectado em 30 segundos'
                });
              }
            }, 30000);
          })
          .catch((error) => {
            // console.log('Erro ao registrar listener:', error?.message);
            if (!resolved) {
              resolved = true;
              resolve({
                success: false,
                message: 'Erro ao iniciar leitura NFC: ' + (error?.message || 'Desconhecido')
              });
            }
          });
      });

    } catch (error) {
      // console.log('Erro ao ler tag NFC:', error);
      // console.log('Erro name:', error?.name);
      // console.log('Erro message:', error?.message);
      
      return {
        success: false,
        message: error?.message || 'Erro ao ler NFC. Verifique se o NFC está habilitado.',
        error
      };
    }
  }

  /**
   * Inicia leitura de tag NFC (modo contínuo)
   * @param {function} onTagDiscovered - Callback quando tag é detectada
   * @param {function} onError - Callback de erro
   */
  static async startReading(onTagDiscovered, onError) {
    try {
      if (this.isReading) {
        // console.log('Leitura NFC já está em andamento');
        return { success: false, message: 'Leitura já iniciada' };
      }

      await this.init();

      this.isReading = true;
    //   console.log('🔍 Aguardando aproximação de tag NFC...');

      // Registra tecnologia NDEF (padrão para tags NFC)
      await NfcManager.requestTechnology(NfcTech.Ndef, {
        alertMessage: 'Aproxime o dispositivo da tag NFC',
      });

      // Lê a tag
      const tag = await NfcManager.getTag();
      
      if (tag) {
        // console.log(' Tag NFC detectada:', tag);
        
        // Processa dados da tag
        const nfcData = this.parseNfcTag(tag);
        
        if (onTagDiscovered) {
          onTagDiscovered(nfcData);
        }

        return { success: true, data: nfcData };
      } else {
        const message = 'Nenhuma tag detectada';
        if (onError) onError(message);
        return { success: false, message };
      }

    } catch (error) {
    //   console.error('Erro na leitura NFC:', error);
      this.isReading = false;
      
      if (onError) {
        onError(error.message || 'Erro ao ler tag NFC');
      }
      
      return { success: false, message: error.message, error };
    } finally {
      // Cancela a tecnologia após leitura
      try {
        await NfcManager.cancelTechnologyRequest();
        this.isReading = false;
      } catch (e) {
        // console.log('Erro ao cancelar tecnologia NFC');
      }
    }
  }

  /**
   * Para a leitura de NFC
   */
  static async stopReading() {
    try {
      if (this.isReading) {
        await NfcManager.cancelTechnologyRequest();
        this.isReading = false;
        // console.log('Leitura NFC parada');
        return { success: true, message: 'Leitura parada' };
      }
      return { success: true, message: 'Nenhuma leitura ativa' };
    } catch (error) {
    //   console.error('Erro ao parar leitura:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Processa e extrai dados da tag NFC
   */
  static parseNfcTag(tag) {
    try {
      let textContent = '';
      let jsonData = null;
      
      // console.log('Processando tag NFC...');
      // console.log('ndefMessage presente:', !!tag.ndefMessage);
      
      // Tenta decodificar NDEF se disponível
      if (tag.ndefMessage && tag.ndefMessage.length > 0) {
        const ndefRecords = tag.ndefMessage;
        // console.log('Número de records NDEF:', ndefRecords.length);
        
        for (let i = 0; i < ndefRecords.length; i++) {
          const record = ndefRecords[i];
          // console.log(`Record ${i}:`, record);
          
          if (record.payload) {
            try {
              // Tenta decodificar como texto
              const text = Ndef.text.decodePayload(record.payload);
              // console.log(`Texto decodificado do record ${i}:`, text);
              textContent += text + ' ';
              
              // Tenta parsear como JSON
              try {
                const parsed = JSON.parse(text);
                // console.log('JSON parseado com sucesso:', parsed);
                
                // Verifica se tem user_id e token
                if (parsed.user_id && parsed.token) {
                  jsonData = {
                    email: parsed.user_id,
                    password: parsed.token
                  };
                  // console.log('Credenciais extraídas:', jsonData);
                }
              } catch (jsonError) {
                // console.log('Não é um JSON válido:', text);
              }
            } catch (decodeError) {
              // console.log(`Erro ao decodificar record ${i}:`, decodeError.message);
              
              // Tenta decodificar manualmente os bytes
              try {
                const bytes = record.payload;
                // console.log('Payload bytes:', bytes);
                
                // Converte bytes para string (pulando os primeiros 3 bytes que são metadados NDEF)
                let rawText = '';
                const startIndex = bytes[0] === 0x02 ? 3 : 0; // Se começa com 0x02, pula 3 bytes
                
                for (let j = startIndex; j < bytes.length; j++) {
                  if (bytes[j] !== 0) { // Ignora bytes nulos
                    rawText += String.fromCharCode(bytes[j]);
                  }
                }
                
                // console.log('Texto bruto extraído:', rawText);
                textContent += rawText + ' ';
                
                // Tenta parsear como JSON
                try {
                  const parsed = JSON.parse(rawText);
                  // console.log('JSON parseado (método manual):', parsed);
                  
                  if (parsed.user_id && parsed.token) {
                    jsonData = {
                      email: parsed.user_id,
                      password: parsed.token
                    };
                    // console.log('Credenciais extraídas (manual):', jsonData);
                  }
                } catch (e) {
                  // console.log('Texto bruto não é JSON');
                }
              } catch (manualError) {
                // console.log('Erro na decodificação manual:', manualError.message);
              }
            }
          }
        }
      } else {
        // console.log('Tag sem mensagem NDEF');
      }

      return {
        id: tag.id || 'unknown',
        techTypes: tag.techTypes || [],
        type: tag.type || 'unknown',
        ndefMessage: tag.ndefMessage || [],
        textContent: textContent.trim(),
        jsonData: jsonData,
        rawData: tag,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      // console.error('Erro ao processar tag NFC:', error);
      return {
        id: tag.id || 'unknown',
        techTypes: tag.techTypes || [],
        type: tag.type || 'unknown',
        textContent: '',
        jsonData: null,
        rawData: tag,
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  /**
   * Abre configurações de NFC do dispositivo
   */
  static async openNfcSettings() {
    try {
      await NfcManager.goToNfcSetting();
      return { success: true, message: 'Configurações NFC abertas' };
    } catch (error) {
      // console.error('Erro ao abrir configurações NFC:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Limpa recursos e cancela operações NFC
   */
  static async cleanup() {
    try {
      if (this.isReading) {
        await this.stopReading();
      }
      
      if (this.isInitialized) {
        await NfcManager.cancelTechnologyRequest();
        this.isInitialized = false;
      }
      
    //   console.log('NFC cleanup realizado');
      return { success: true };
    } catch (error) {
    //   console.error('Erro no cleanup NFC:', error);
      return { success: false, error };
    }
  }
}

export default NFCService;
