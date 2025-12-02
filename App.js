/**
 * App.js - Ponto de entrada da aplicação
 * NFCStockSimplify - Sistema de gerenciamento de estoque com NFC
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import DatabaseModel from './src/models/DatabaseModel';
import SyncService from './src/services/SyncService';

export default function App() {
  useEffect(() => {
    // Inicializa banco de dados SQLite ao carregar app
    const initializeApp = async () => {
      // console.log('Inicializando aplicação...');
      
      // Inicializa banco de dados
      await DatabaseModel.initDatabase();
      
      // Inicia sincronização automática (a cada 5 minutos)
      SyncService.startAutoSync(5);
      
      // console.log(' Aplicação inicializada com sucesso');
    };

    initializeApp();

    // Cleanup ao desmontar
    return () => {
      SyncService.stopAutoSync();
    };
  }, []);

  return (
    <>
      <AppNavigator />
      <StatusBar style="auto" />
    </>
  );
}
