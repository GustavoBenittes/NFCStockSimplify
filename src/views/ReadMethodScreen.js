/**
 * ReadMethodScreen - Tela de Seleção de Método de Leitura (Setor LO)
 * Padrão MVC: View
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import AuthController from '../controllers/AuthController';
import globalStyles, { Colors } from '../styles/globalStyles';
import ConnectionStatus from '../components/ConnectionStatus';

const ReadMethodScreen = ({ navigation, route }) => {
  const { user } = route.params || {};

  const handleLogout = () => {
    AuthController.logout(() => {
      navigation.replace('Login');
    });
  };

  const handleNFCMethod = () => {
    // Navegar para tela de leitura NFC
    navigation.navigate('NFCReader', { user });
  };

  const handleBarcodeMethod = () => {
    // Navegar para tela de leitura de código de barras
    navigation.navigate('BarcodeReader', { user });
  };

  return (
    <View style={globalStyles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View>
            <Text style={styles.headerTitle}>Método de Leitura</Text>
            <Text style={styles.headerSubtitle}>Bem-vindo, {user?.name || 'Usuário'}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <ConnectionStatus />
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Sair</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={globalStyles.centerContainer}>
        <View style={globalStyles.card}>
          <Text style={styles.title}>Selecione o Método de Leitura</Text>
          <Text style={styles.subtitle}>
            Escolha como deseja realizar a leitura do produto
          </Text>

          <View style={styles.infoCard}>
            <Text style={styles.infoText}>Setor: {user?.setor || 'LO'}</Text>
            <Text style={styles.infoText}>Email: {user?.email || 'N/A'}</Text>
          </View>

          <TouchableOpacity
            style={[styles.methodButton, styles.nfcButton]}
            onPress={handleNFCMethod}
          >
            <Text style={styles.methodButtonText}>NFC</Text>
            <Text style={styles.methodButtonSubtext}>
              Aproxime o dispositivo da tag NFC
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.methodButton, styles.barcodeButton]}
            onPress={handleBarcodeMethod}
          >
            <Text style={styles.methodButtonText}>Código de Barras</Text>
            <Text style={styles.methodButtonSubtext}>
              Escaneie o código de barras do produto
            </Text>
          </TouchableOpacity>
        </View>
      </View>
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: Colors.backgroundSecondary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  methodButton: {
    padding: 24,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 2,
  },
  nfcButton: {
    backgroundColor: Colors.primary + '15',
    borderColor: Colors.primary,
  },
  barcodeButton: {
    backgroundColor: Colors.secondary + '15',
    borderColor: Colors.secondary,
  },
  methodIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  methodButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  methodButtonSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});

export default ReadMethodScreen;
