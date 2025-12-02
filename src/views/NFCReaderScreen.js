/**
 * NFCReaderScreen - Tela de leitura NFC
 * Verifica disponibilidade e realiza leitura contínua
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import NFCService from '../services/NFCService';
import MovementModel from '../models/MovementModel';
import ProductModel from '../models/ProductModel';
import AuthController from '../controllers/AuthController';
import globalStyles, { Colors } from '../styles/globalStyles';
import ConnectionStatus from '../components/ConnectionStatus';

const NFCReaderScreen = ({ navigation, route }) => {
  const { user } = route.params || {};
  
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcEnabled, setNfcEnabled] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [lastTagRead, setLastTagRead] = useState(null);
  const [readHistory, setReadHistory] = useState([]);

  useEffect(() => {
    checkNfcAvailability();

    // Cleanup ao desmontar
    return () => {
      NFCService.cleanup();
    };
  }, []);

  /**
   * Verifica disponibilidade do NFC
   */
  const checkNfcAvailability = async () => {
    setIsChecking(true);

    // Verifica suporte
    const supportResult = await NFCService.isSupported();
    setNfcSupported(supportResult.supported);

    if (!supportResult.supported) {
      Alert.alert(
        'NFC Não Disponível',
        'Este dispositivo não possui suporte para NFC.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      setIsChecking(false);
      return;
    }

    // Verifica se está habilitado
    const enabledResult = await NFCService.isEnabled();
    setNfcEnabled(enabledResult.enabled);

    if (!enabledResult.enabled) {
      Alert.alert(
        'NFC Desabilitado',
        'O NFC está desabilitado. Deseja abrir as configurações?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Abrir Configurações', 
            onPress: () => NFCService.openNfcSettings() 
          },
        ]
      );
    }

    setIsChecking(false);
  };

  /**
   * Inicia leitura contínua de NFC
   */
  const startNfcReading = async () => {
    if (!nfcEnabled) {
      Alert.alert('NFC Desabilitado', 'Por favor, habilite o NFC para continuar.');
      return;
    }

    setIsReading(true);
    
    const result = await NFCService.startReading(
      handleTagDiscovered,
      handleReadError
    );

    if (!result.success) {
      setIsReading(false);
    }
  };

  /**
   * Para leitura de NFC
   */
  const stopNfcReading = async () => {
    await NFCService.stopReading();
    setIsReading(false);
  };

  /**
   * Callback quando tag é descoberta
   */
  const handleTagDiscovered = async (nfcData) => {
    // console.log('Tag NFC lida:', nfcData);
    
    setLastTagRead(nfcData);
    setReadHistory(prev => [nfcData, ...prev.slice(0, 9)]); // Mantém últimas 10 leituras

    // Para a leitura atual
    setIsReading(false);

    let codigoProduto = null;

    // Verifica se tem conteúdo JSON na tag
    if (nfcData.textContent && nfcData.textContent.trim() !== '') {
      // console.log('Conteúdo de texto encontrado:', nfcData.textContent);
      
      try {
        const jsonData = JSON.parse(nfcData.textContent);
        // console.log('JSON parseado:', jsonData);
        
        // Verifica se tem o campo 'produto'
        if (jsonData.produto) {
          codigoProduto = jsonData.produto;
          // console.log('Código do produto extraído do JSON:', codigoProduto);
        }
      } catch (e) {
        // console.log('Conteúdo não é JSON válido, usando ID da tag');
      }
    }

    // Se não encontrou no JSON, usa o ID da tag
    if (!codigoProduto) {
      codigoProduto = nfcData.id;
      // console.log('Usando ID da tag como código:', codigoProduto);
    }

    // Busca produto pelo código
    const productResult = await ProductModel.getProductByCode(codigoProduto);

    if (productResult.success && productResult.data) {
      // Produto encontrado - registra movimentação
      showMovementDialog(productResult.data, nfcData);
    } else {
      // Produto não encontrado
      Alert.alert(
        'Produto Não Encontrado',
        `Código: ${codigoProduto}\n\nEste produto não está cadastrado no sistema.`,
        [
          { text: 'OK' },
          { text: 'Ler Novamente', onPress: startNfcReading }
        ]
      );
    }
  };

  /**
   * Exibe dialog para escolher tipo de movimentação
   */
  const showMovementDialog = (product, nfcData) => {
    Alert.alert(
      'Produto Encontrado',
      `${product.descricao}\nEstoque: ${product.quantidade_atual} un.\n\nSelecione a operação:`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'ENTRADA', 
          onPress: () => showQuantityDialog(product, 'ENTRADA', nfcData) 
        },
        { 
          text: 'SAÍDA', 
          onPress: () => showQuantityDialog(product, 'SAIDA', nfcData) 
        },
      ]
    );
  };

  /**
   * Exibe dialog para informar quantidade
   */
  const showQuantityDialog = (product, tipo, nfcData) => {
    Alert.prompt(
      `${tipo} de Produto`,
      `${product.descricao}\n\nQuantidade:`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Confirmar', 
          onPress: (quantity) => registerMovement(product, tipo, quantity, nfcData) 
        },
      ],
      'plain-text',
      '',
      'numeric'
    );
  };

  /**
   * Registra movimentação no banco
   */
  const registerMovement = async (product, tipo, quantity, nfcData) => {
    const qtd = parseInt(quantity);

    if (!qtd || qtd <= 0) {
      Alert.alert('Erro', 'Quantidade inválida');
      return;
    }

    const result = await MovementModel.registerMovement({
      id_produto: product.id_produto,
      tipo,
      quantidade: qtd,
      origem: 'NFC',
    });

    if (result.success) {
      Alert.alert(
        'Sucesso!',
        `${tipo}: ${qtd} un.\nNovo estoque: ${result.data.nova_quantidade} un.`,
        [
          { text: 'OK' },
          { text: 'Ler Outra Tag', onPress: startNfcReading }
        ]
      );
    } else {
      Alert.alert('Erro', result.error || 'Erro ao registrar movimentação');
    }
  };

  /**
   * Callback de erro na leitura
   */
  const handleReadError = (error) => {
    // console.error('Erro na leitura NFC:', error);
    Alert.alert('Erro', error);
    setIsReading(false);
  };

  /**
   * Logout
   */
  const handleLogout = () => {
    AuthController.logout(() => {
      navigation.replace('Login');
    });
  };

  if (isChecking) {
    return (
      <View style={globalStyles.container}>
        <View style={globalStyles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.checkingText}>Verificando disponibilidade NFC...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={globalStyles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Leitura NFC</Text>
            <Text style={styles.headerSubtitle}>{user?.name || 'Usuário'}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <ConnectionStatus />
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Sair</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Status NFC */}
        <View style={globalStyles.card}>
          <Text style={styles.sectionTitle}> Status NFC</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Suporte:</Text>
            <Text style={[styles.statusValue, nfcSupported && styles.statusSuccess]}>
              {nfcSupported ? ' Disponível' : 'Não disponível'}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Estado:</Text>
            <Text style={[styles.statusValue, nfcEnabled && styles.statusSuccess]}>
              {nfcEnabled ? ' Habilitado' : 'Desabilitado'}
            </Text>
          </View>
        </View>

        {/* Botões de Controle */}
        <View style={globalStyles.card}>
          <TouchableOpacity
            style={[
              styles.readButton,
              isReading && styles.readButtonActive,
              (!nfcSupported || !nfcEnabled) && styles.readButtonDisabled,
            ]}
            onPress={isReading ? stopNfcReading : startNfcReading}
            disabled={!nfcSupported || !nfcEnabled}
          >
            <Text style={styles.readButtonIcon}>
              {isReading ? 'STOP' : 'NFC'}
            </Text>
            <Text style={styles.readButtonText}>
              {isReading ? 'Parar Leitura' : 'Iniciar Leitura'}
            </Text>
            {isReading && (
              <ActivityIndicator color="#ffffff" style={styles.buttonLoader} />
            )}
          </TouchableOpacity>

          {isReading && (
            <Text style={styles.waitingText}>
              Aproxime o dispositivo de uma tag NFC...
            </Text>
          )}
        </View>

        {/* Última Leitura */}
        {lastTagRead && (
          <View style={globalStyles.card}>
            <Text style={styles.sectionTitle}>Última Leitura</Text>
            <View style={styles.tagInfo}>
              <Text style={styles.tagLabel}>ID:</Text>
              <Text style={styles.tagValue}>{lastTagRead.id}</Text>
            </View>
            <View style={styles.tagInfo}>
              <Text style={styles.tagLabel}>Tipo:</Text>
              <Text style={styles.tagValue}>{lastTagRead.type}</Text>
            </View>
            {lastTagRead.textContent && (
              <View style={styles.tagInfo}>
                <Text style={styles.tagLabel}>Conteúdo:</Text>
                <Text style={styles.tagValue}>{lastTagRead.textContent}</Text>
              </View>
            )}
            <View style={styles.tagInfo}>
              <Text style={styles.tagLabel}>Horário:</Text>
              <Text style={styles.tagValue}>
                {new Date(lastTagRead.timestamp).toLocaleString('pt-BR')}
              </Text>
            </View>
          </View>
        )}

        {/* Histórico */}
        {readHistory.length > 0 && (
          <View style={globalStyles.card}>
            <Text style={styles.sectionTitle}>Histórico ({readHistory.length})</Text>
            {readHistory.map((tag, index) => (
              <View key={index} style={styles.historyItem}>
                <Text style={styles.historyText}>
                  {index + 1}. {tag.id} - {new Date(tag.timestamp).toLocaleTimeString('pt-BR')}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: Colors.primary,
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
    padding: 8,
  },
  backButtonText: {
    fontSize: 28,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 12,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  checkingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 16,
    color: '#666',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
  },
  statusSuccess: {
    color: '#34C759',
  },
  readButton: {
    backgroundColor: '#2196F3',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  readButtonActive: {
    backgroundColor: '#FF9800',
  },
  readButtonDisabled: {
    backgroundColor: '#ccc',
  },
  readButtonIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  readButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  buttonLoader: {
    marginTop: 8,
  },
  waitingText: {
    fontSize: 16,
    color: '#FF9800',
    textAlign: 'center',
    fontWeight: '600',
  },
  tagInfo: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  tagLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    width: 100,
  },
  tagValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  historyItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  historyText: {
    fontSize: 14,
    color: '#666',
  },
});

export default NFCReaderScreen;
