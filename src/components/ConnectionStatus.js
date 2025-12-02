/**
 * ConnectionStatus - Componente para exibir status de conexão
 * Exibe bolinha verde (online) ou vermelha (offline)
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import SyncService from '../services/SyncService';
import LogService from '../services/LogService';
import { Colors } from '../styles/globalStyles';

const ConnectionStatus = () => {
  const [isConnected, setIsConnected] = useState(true);
  const [wasPreviouslyOffline, setWasPreviouslyOffline] = useState(false);

  useEffect(() => {
    // Inscreve-se para receber atualizações de conexão
    const unsubscribe = NetInfo.addEventListener(state => {
      const newConnectionState = state.isConnected;
      
      // Se estava offline e agora está online, sincroniza
      if (!isConnected && newConnectionState && wasPreviouslyOffline) {
        LogService.info('Conexão restabelecida! Iniciando sincronização...');
        SyncService.syncPendingOperations();
      }
      
      setIsConnected(newConnectionState);
      
      // Marca que já esteve offline pelo menos uma vez
      if (!newConnectionState) {
        setWasPreviouslyOffline(true);
      }
    });

    // Cleanup: cancela inscrição quando componente é desmontado
    return () => unsubscribe();
  }, [isConnected, wasPreviouslyOffline]);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.indicator,
          { backgroundColor: isConnected ? Colors.success : Colors.error }
        ]}
      />
      <Text style={styles.text}>
        {isConnected ? 'Online' : 'Offline'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  indicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  text: {
    fontSize: 12,
    color: Colors.white,
    fontWeight: '600',
  },
});

export default ConnectionStatus;
