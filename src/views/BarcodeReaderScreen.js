/**
 * BarcodeReaderScreen - Tela de leitura de código de barras/QR Code
 * Solicita permissão de câmera e realiza leitura contínua
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import MovementModel from '../models/MovementModel';
import ProductModel from '../models/ProductModel';
import AuthController from '../controllers/AuthController';
import globalStyles, { Colors } from '../styles/globalStyles';
import ConnectionStatus from '../components/ConnectionStatus';

const { width, height } = Dimensions.get('window');
const SQUARE_SIZE = width * 0.7;

const BarcodeReaderScreen = ({ navigation, route }) => {
  const { user } = route.params || {};
  
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [isScanning, setIsScanning] = useState(true);
  const [lastCodeRead, setLastCodeRead] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);

  useEffect(() => {
    requestCameraPermission();
  }, []);

  /**
   * Solicita permissão de câmera
   */
  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');

    if (status !== 'granted') {
      Alert.alert(
        'Permissão Negada',
        'É necessário permitir o acesso à câmera para escanear códigos.',
        [
          { text: 'Cancelar', onPress: () => navigation.goBack() },
          { text: 'Tentar Novamente', onPress: requestCameraPermission },
        ]
      );
    }
  };

  /**
   * Callback quando código é escaneado
   */
  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned || !isScanning) return;

    setScanned(true);
    // console.log(`📷 Código escaneado: ${data} (${type})`);

    const codeData = {
      type,
      data,
      timestamp: new Date().toISOString(),
    };

    setLastCodeRead(codeData);
    setScanHistory(prev => [codeData, ...prev.slice(0, 9)]);

    // Busca produto pelo código
    const productResult = await ProductModel.getProductByCode(data);

    if (productResult.success && productResult.data) {
      // Produto encontrado - registra movimentação
      showMovementDialog(productResult.data, codeData);
    } else {
      // Produto não encontrado
      Alert.alert(
        'Produto Não Encontrado',
        `Código: ${data}\nTipo: ${type}\n\nEste produto não está cadastrado no sistema.`,
        [
          { text: 'OK', onPress: () => setScanned(false) },
          { text: 'Escanear Outro', onPress: () => setScanned(false) }
        ]
      );
    }
  };

  /**
   * Exibe dialog para escolher tipo de movimentação
   */
  const showMovementDialog = (product, codeData) => {
    Alert.alert(
      'Produto Encontrado',
      `${product.descricao}\nEstoque: ${product.quantidade_atual} un.\n\nSelecione a operação:`,
      [
        { text: 'Cancelar', style: 'cancel', onPress: () => setScanned(false) },
        { 
          text: 'ENTRADA', 
          onPress: () => showQuantityDialog(product, 'ENTRADA', codeData) 
        },
        { 
          text: 'SAÍDA', 
          onPress: () => showQuantityDialog(product, 'SAIDA', codeData) 
        },
      ]
    );
  };

  /**
   * Exibe dialog para informar quantidade
   */
  const showQuantityDialog = (product, tipo, codeData) => {
    Alert.prompt(
      `${tipo} de Produto`,
      `${product.descricao}\n\nQuantidade:`,
      [
        { text: 'Cancelar', style: 'cancel', onPress: () => setScanned(false) },
        { 
          text: 'Confirmar', 
          onPress: (quantity) => registerMovement(product, tipo, quantity, codeData) 
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
  const registerMovement = async (product, tipo, quantity, codeData) => {
    const qtd = parseInt(quantity);

    if (!qtd || qtd <= 0) {
      Alert.alert('Erro', 'Quantidade inválida', [
        { text: 'OK', onPress: () => setScanned(false) }
      ]);
      return;
    }

    const result = await MovementModel.registerMovement({
      id_produto: product.id_produto,
      tipo,
      quantidade: qtd,
      origem: 'CODIGO_BARRAS',
    });

    if (result.success) {
      Alert.alert(
        'Sucesso!',
        `${tipo}: ${qtd} un.\nNovo estoque: ${result.data.nova_quantidade} un.`,
        [
          { text: 'OK', onPress: () => setScanned(false) },
          { text: 'Escanear Outro', onPress: () => setScanned(false) }
        ]
      );
    } else {
      Alert.alert('Erro', result.error || 'Erro ao registrar movimentação', [
        { text: 'OK', onPress: () => setScanned(false) }
      ]);
    }
  };

  /**
   * Alterna modo de escaneamento
   */
  const toggleScanning = () => {
    setIsScanning(!isScanning);
    if (isScanning) {
      setScanned(false);
    }
  };

  /**
   * Logout
   */
  const handleLogout = () => {
    AuthController.logout(() => {
      navigation.replace('Login');
    });
  };

  if (hasPermission === null) {
    return (
      <View style={globalStyles.container}>
        <View style={globalStyles.centerContainer}>
          <Text style={styles.messageText}>Solicitando permissão de câmera...</Text>
        </View>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={globalStyles.container}>
        <View style={globalStyles.centerContainer}>
          <Text style={styles.messageText}>Sem permissão para acessar a câmera</Text>
          <TouchableOpacity 
            style={globalStyles.button} 
            onPress={requestCameraPermission}
          >
            <Text style={globalStyles.buttonText}>Solicitar Permissão</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[globalStyles.button, { marginTop: 12, backgroundColor: '#666' }]} 
            onPress={() => navigation.goBack()}
          >
            <Text style={globalStyles.buttonText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={globalStyles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Scanner</Text>
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

      {/* Camera View */}
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={isScanning && !scanned ? handleBarCodeScanned : undefined}
        />
        
        {/* Overlay com quadrado de leitura */}
        <View style={styles.overlay}>
          {/* Área escura superior */}
          <View style={styles.overlayTop} />
          
          {/* Linha do meio com quadrado */}
          <View style={styles.overlayMiddle}>
            <View style={styles.overlaySide} />
            <View style={styles.scanSquare}>
              {/* Cantos do quadrado */}
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />
            </View>
            <View style={styles.overlaySide} />
          </View>
          
          {/* Área escura inferior */}
          <View style={styles.overlayBottom}>
            <Text style={styles.instructionText}>
              {isScanning 
                ? 'Posicione o código dentro do quadrado'
                : 'Scanner pausado'}
            </Text>
          </View>
        </View>
      </View>

      {/* Controles e Informações */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[
            styles.scanButton,
            !isScanning && styles.scanButtonPaused,
          ]}
          onPress={toggleScanning}
        >
          <Text style={styles.scanButtonText}>
            {isScanning ? 'Pausar Scanner' : 'Retomar Scanner'}
          </Text>
        </TouchableOpacity>

        {/* Última leitura */}
        {lastCodeRead && (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Última Leitura:</Text>
            <Text style={styles.infoText}>Código: {lastCodeRead.data}</Text>
            <Text style={styles.infoText}>Tipo: {lastCodeRead.type}</Text>
            <Text style={styles.infoText}>
              Horário: {new Date(lastCodeRead.timestamp).toLocaleTimeString('pt-BR')}
            </Text>
          </View>
        )}

        {/* Histórico */}
        {scanHistory.length > 1 && (
          <View style={styles.historyCard}>
            <Text style={styles.infoTitle}>Últimos {scanHistory.length - 1} códigos</Text>
            <ScrollView style={styles.historyScroll} nestedScrollEnabled>
              {scanHistory.slice(1, 5).map((item, index) => (
                <Text key={index} style={styles.historyText}>
                  {index + 1}. {item.data.substring(0, 20)}... ({item.type})
                </Text>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: Colors.secondary,
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
    color: Colors.white,
    fontWeight: '600',
  },
  messageText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  overlayMiddle: {
    flexDirection: 'row',
    height: SQUARE_SIZE,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  scanSquare: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FF9800',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#FF9800',
  },
  cornerTopLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 6,
    borderLeftWidth: 6,
  },
  cornerTopRight: {
    top: -2,
    right: -2,
    borderTopWidth: 6,
    borderRightWidth: 6,
  },
  cornerBottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 6,
    borderLeftWidth: 6,
  },
  cornerBottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 6,
    borderRightWidth: 6,
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
    textAlign: 'center',
  },
  bottomContainer: {
    backgroundColor: Colors.backgroundSecondary,
    padding: 16,
    maxHeight: height * 0.35,
  },
  scanButton: {
    backgroundColor: Colors.secondary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  scanButtonPaused: {
    backgroundColor: Colors.textSecondary,
  },
  scanButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  historyCard: {
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 8,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  historyScroll: {
    maxHeight: 80,
  },
  historyText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
});

export default BarcodeReaderScreen;
