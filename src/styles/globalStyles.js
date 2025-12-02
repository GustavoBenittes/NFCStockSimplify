import { StyleSheet } from 'react-native';

// Paleta de Cores NFCStockSimplify
const Colors = {
  // Cores Principais
  primary: '#0056D2',           // Azul Institucional
  secondary: '#00C2CB',         // Ciano Vibrante
  
  // Cores de Texto
  textPrimary: '#2D3748',       // Cinza Escuro
  textSecondary: '#718096',     // Cinza Médio
  
  // Cores de Fundo
  background: '#FFFFFF',        // Branco Limpo
  backgroundSecondary: '#F7FAFC', // Cinza Muito Claro
  
  // Cores de Estado
  success: '#4CAF50',           // Verde
  warning: '#FFC107',           // Amarelo/Laranja
  error: '#F44336',             // Vermelho
  info: '#2196F3',              // Azul Info
  
  // Cores Auxiliares
  border: '#E2E8F0',            // Borda padrão
  white: '#FFFFFF',
  black: '#000000',
};

const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 32,
    textAlign: 'center',
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
    color: Colors.textPrimary,
  },
  inputError: {
    borderColor: Colors.error,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    marginTop: -12,
    marginBottom: 12,
    marginLeft: 4,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonSecondary: {
    backgroundColor: Colors.secondary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonOutline: {
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: Colors.border,
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextOutline: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  successText: {
    color: Colors.success,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
  warningText: {
    color: Colors.warning,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
  infoText: {
    color: Colors.info,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
});

export { Colors };
export default globalStyles;
