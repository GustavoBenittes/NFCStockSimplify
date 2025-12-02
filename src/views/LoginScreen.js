/**
 * LoginScreen - Tela de Login
 * Padrão MVC: View
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Image,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AuthController from '../controllers/AuthController';
import globalStyles, { Colors } from '../styles/globalStyles';
import ConnectionStatus from '../components/ConnectionStatus';
import NFCService from '../services/NFCService';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingNFC, setLoadingNFC] = useState(false);
  const [isReadingNFC, setIsReadingNFC] = useState(false);

  /**
   * Inicia leitura contínua de NFC para login
   */
  const startNFCReading = async () => {
    if (isReadingNFC) {
      // Se já está lendo, para a leitura
      await stopNFCReading();
      return;
    }

    // console.log('========================================');
    // console.log('INICIANDO LEITURA CONTÍNUA DE NFC');
    // console.log('========================================');

    setIsReadingNFC(true);
    setLoadingNFC(true);

    const result = await NFCService.startReading(
      handleNFCTagDiscovered,
      handleNFCReadError
    );

    if (!result.success) {
      // console.log('Erro ao iniciar leitura:', result.message);
      setIsReadingNFC(false);
      setLoadingNFC(false);
    }
  };

  /**
   * Para leitura de NFC
   */
  const stopNFCReading = async () => {
    // console.log('Parando leitura NFC...');
    await NFCService.stopReading();
    setIsReadingNFC(false);
    setLoadingNFC(false);
  };

  /**
   * Callback quando tag NFC é descoberta
   */
  const handleNFCTagDiscovered = async (nfcData) => {
    // console.log('Tag NFC detectada - processando autenticação...');
    // console.log('Dados da tag:', nfcData);

    // Para a leitura
    await stopNFCReading();
    
    // Verifica se tem conteúdo de texto na tag
    if (nfcData.textContent && nfcData.textContent.trim() !== '') {
      // console.log('Conteúdo de texto encontrado:', nfcData.textContent);
      
      // Tenta parsear como JSON
      try {
        const jsonData = JSON.parse(nfcData.textContent);
        // console.log('JSON parseado:', jsonData);
        
        // Verifica se tem user_id e token
        if (jsonData.user_id && jsonData.token) {
          // console.log('Credenciais encontradas - fazendo login...');
          
          // Faz login com as credenciais
          await AuthController.login(
            jsonData.user_id,
            jsonData.token,
            (user, message) => {
              setLoadingNFC(false);
              // Alert.alert('Sucesso', `Bem-vindo, ${user.name}!`);
              
              // Navega para tela correspondente
              if (user.setor === 'ADM') {
                navigation.replace('Report', { user });
              } else if (user.setor === 'LO') {
                navigation.replace('ReadMethod', { user });
              } else {
                // Alert.alert('Aviso', 'Setor não reconhecido');
              }
            },
            (error) => {
              setLoadingNFC(false);
              Alert.alert('Erro de Autenticação', error);
            }
          );
          return;
        }
      } catch (e) {
        // console.log('Conteúdo não é JSON válido');
      }
    }
    
    // Se não tem JSON válido, tenta autenticar pelo ID da tag
    // console.log('Autenticando pelo ID da tag:', nfcData.id);
    
    const AuthModel = require('../models/AuthModel').default;
    const authResult = await AuthModel.authenticateByNFC(nfcData.id);

    setLoadingNFC(false);

    if (authResult.success) {
      const user = authResult.user;
      // Alert.alert('Sucesso', `Bem-vindo, ${user.name}!`);

      if (user.setor === 'ADM') {
        navigation.replace('Report', { user });
      } else if (user.setor === 'LO') {
        navigation.replace('ReadMethod', { user });
      } else {
        // Alert.alert('Aviso', 'Setor não reconhecido');
      }
    } else {
      Alert.alert('Erro de Autenticação', authResult.message || 'Crachá não autorizado');
    }
  };

  /**
   * Callback de erro na leitura NFC
   */
  const handleNFCReadError = (error) => {
    // console.log('========================================');
    // console.log('ERRO NA LEITURA NFC:');
    // console.log('========================================');
    // console.log('Error:', error);
    // console.log('========================================');
    
    setIsReadingNFC(false);
    setLoadingNFC(false);
  };

  /**
   * Manipula login via NFC (chamado pelo botão)
   */
  const handleNFCLogin = async () => {
    await startNFCReading();
  };

  /**
   * Manipula mudança no campo de email
   */
  const handleEmailChange = (text) => {
    setEmail(text);
    if (text.trim() !== '') {
      const validation = AuthController.validateEmailInput(text);
      setEmailError(validation.message);
    } else {
      setEmailError('');
    }
  };

  /**
   * Manipula mudança no campo de senha
   */
  const handlePasswordChange = (text) => {
    setPassword(text);
    if (text.trim() !== '') {
      const validation = AuthController.validatePasswordInput(text);
      setPasswordError(validation.message);
    } else {
      setPasswordError('');
    }
  };

  /**
   * Manipula o submit do formulário de login
   */
  const handleLogin = async () => {
    setLoading(true);

    await AuthController.login(
      email,
      password,
      (user, message) => {
        setLoading(false);
        
        // Navega para tela correspondente baseado no setor
        if (user.setor === 'ADM') {
          navigation.replace('Report', { user });
        } else if (user.setor === 'LO') {
          navigation.replace('ReadMethod', { user });
        } else {
          // Fallback para setor desconhecido
          Alert.alert('Aviso', 'Setor não reconhecido');
        }
      },
      (error) => {
        setLoading(false);
        Alert.alert('Erro', error);
      }
    );
  };

  /**
   * Verifica se o formulário é válido
   */
  const isFormValid = () => {
    return (
      email.trim() !== '' &&
      password.trim() !== '' &&
      emailError === '' &&
      passwordError === ''
    );
  };

  return (
    <LinearGradient
      colors={['#0056D2', '#003D99', '#002766']}
      style={styles.gradient}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0056D2" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.connectionStatusContainer}>
          <ConnectionStatus />
        </View>
        <View style={styles.centerContainer}>
          <View style={styles.card}>
            {/* Logo */}
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/icon.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.title}>NFCStockSimplify</Text>
            <Text style={styles.subtitle}>Faça login para continuar</Text>

          <TextInput
            style={[
              globalStyles.input,
              emailError ? globalStyles.inputError : null,
            ]}
            placeholder="Email"
            placeholderTextColor="#999"
            value={email}
            onChangeText={handleEmailChange}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />
          {emailError ? (
            <Text style={globalStyles.errorText}>{emailError}</Text>
          ) : null}

          <TextInput
            style={[
              globalStyles.input,
              passwordError ? globalStyles.inputError : null,
            ]}
            placeholder="Senha"
            placeholderTextColor="#999"
            value={password}
            onChangeText={handlePasswordChange}
            secureTextEntry={true}
            autoCapitalize="none"
            editable={!loading}
          />
          {passwordError ? (
            <Text style={globalStyles.errorText}>{passwordError}</Text>
          ) : null}

          <TouchableOpacity
            style={[
              globalStyles.button,
              (!isFormValid() || loading) && globalStyles.buttonDisabled,
            ]}
            onPress={handleLogin}
            disabled={!isFormValid() || loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={globalStyles.buttonText}>Entrar</Text>
            )}
          </TouchableOpacity>

          {/* Separador OU */}
          <View style={styles.separatorContainer}>
            <View style={styles.separatorLine} />
            <Text style={styles.separatorText}>OU</Text>
            <View style={styles.separatorLine} />
          </View>

          {/* Botão Login NFC */}
          <TouchableOpacity
            style={[
              styles.nfcButton,
              loadingNFC && styles.nfcButtonDisabled,
            ]}
            onPress={handleNFCLogin}
            disabled={loadingNFC || loading}
          >
            {loadingNFC ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <>
                <Text style={styles.nfcButtonText}>Login com TAG</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 32,
    textAlign: 'center',
  },
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  separatorText: {
    marginHorizontal: 10,
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  nfcButton: {
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nfcButtonDisabled: {
    opacity: 0.5,
  },
  nfcIcon: {
    fontSize: 24,
  },
  nfcButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  connectionStatusContainer: {
    position: 'absolute',
    top: 40,
    right: 16,
    zIndex: 1000,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 120,
    height: 120,
  },
});

export default LoginScreen;
