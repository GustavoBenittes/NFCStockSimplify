/**
 * AppNavigator - Configuração de navegação do app
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../views/LoginScreen';
import ReportScreen from '../views/ReportScreen';
import ReadMethodScreen from '../views/ReadMethodScreen';
import NFCReaderScreen from '../views/NFCReaderScreen';
import BarcodeReaderScreen from '../views/BarcodeReaderScreen';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Report" component={ReportScreen} />
        <Stack.Screen name="ReadMethod" component={ReadMethodScreen} />
        <Stack.Screen name="NFCReader" component={NFCReaderScreen} />
        <Stack.Screen name="BarcodeReader" component={BarcodeReaderScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
