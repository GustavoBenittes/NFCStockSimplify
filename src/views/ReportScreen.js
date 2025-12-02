/**
 * ReportScreen - Tela de Relatórios (Setor ADM)
 * Padrão MVC: View
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  Dimensions,
} from 'react-native';
import AuthController from '../controllers/AuthController';
import ConnectionStatus from '../components/ConnectionStatus';
import { Colors } from '../styles/globalStyles';

const { width } = Dimensions.get('window');

const ReportScreen = ({ navigation, route }) => {
  const { user } = route.params || {};
  const [selectedReport, setSelectedReport] = useState(null);

  const handleLogout = () => {
    AuthController.logout(() => {
      navigation.replace('Login');
    });
  };

  const reports = [
    {
      id: 1,
      icon: '',
      title: 'Estoque Geral',
      subtitle: 'Visualizar todo o inventário',
      color: '#4CAF50',
      route: 'StockReport'
    },
    {
      id: 2,
      icon: '',
      title: 'Movimentações',
      subtitle: 'Histórico de entradas e saídas',
      color: '#2196F3',
      route: 'MovementsReport'
    },
    {
      id: 3,
      icon: '',
      title: 'Usuários',
      subtitle: 'Gerenciar usuários do sistema',
      color: '#FF9800',
      route: 'UsersReport'
    },
    {
      id: 4,
      icon: '',
      title: 'Alertas de Estoque',
      subtitle: 'Produtos com estoque baixo',
      color: '#F44336',
      route: 'AlertsReport'
    },
    {
      id: 5,
      icon: '',
      title: 'Relatório Mensal',
      subtitle: 'Análise do mês atual',
      color: '#9C27B0',
      route: 'MonthlyReport'
    },
    {
      id: 6,
      icon: '',
      title: 'Sincronização',
      subtitle: 'Status e logs de sync',
      color: '#607D8B',
      route: 'SyncReport'
    },
  ];

  const handleReportPress = (report) => {
    setSelectedReport(report.id);
    // navigation.navigate(report.route, { user });
    setTimeout(() => setSelectedReport(null), 200);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1976D2" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Dashboard</Text>
            <Text style={styles.headerSubtitle}>Painel Administrativo</Text>
          </View>
          <View style={styles.headerActions}>
            <ConnectionStatus />
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Info Card */}
        <View style={styles.userCard}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>
              {(user?.name || 'Admin').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>Bem-vindo, {user?.name || 'Administrador'}</Text>
            <Text style={styles.userEmail}>{user?.email || 'admin@sistema.com'}</Text>
            <View style={styles.userBadge}>
              <Text style={styles.userBadgeText}>{user?.setor || 'ADM'}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Sair</Text>
          </TouchableOpacity>
        </View>
        {/* Stats Cards */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Estatísticas Rápidas</Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
            <Text style={styles.statValue}>1,234</Text>
            <Text style={styles.statLabel}>Produtos</Text>
            <View style={[styles.statIcon, { backgroundColor: '#2196F3' }]}>
            </View>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#F3E5F5' }]}>
            <Text style={styles.statValue}>567</Text>
            <Text style={styles.statLabel}>Movimentações</Text>
            <View style={[styles.statIcon, { backgroundColor: '#9C27B0' }]}>
            </View>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
            <Text style={styles.statValue}>42</Text>
            <Text style={styles.statLabel}>Pendências</Text>
            <View style={[styles.statIcon, { backgroundColor: '#FF9800' }]}>
            </View>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#FFF3E0' }]}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Usuários</Text>
            <View style={[styles.statIcon, { backgroundColor: '#4CAF50' }]}>
            </View>
          </View>
        </View>

        {/* Section Title */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Relatórios Disponíveis</Text>
          <Text style={styles.sectionSubtitle}>Selecione um relatório para visualizar</Text>
        </View>

        {/* Reports Grid */}
        <View style={styles.reportsGrid}>
          {reports.map((report) => (
            <TouchableOpacity
              key={report.id}
              style={[
                styles.reportCard,
                selectedReport === report.id && styles.reportCardPressed
              ]}
              onPress={() => handleReportPress(report)}
              activeOpacity={0.7}
            >

              <View style={styles.reportContent}>
                <Text style={styles.reportTitle}>{report.title}</Text>
                <Text style={styles.reportSubtitle}>{report.subtitle}</Text>
              </View>
              <View style={[styles.reportAccent, { backgroundColor: report.color }]} />
            </TouchableOpacity>
          ))}
        </View>

        

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  // Header Styles
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    elevation: 4,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  backButtonText: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  headerCenter: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Content Styles
  content: {
    flex: 1,
  },
  // User Card
  userCard: {
    backgroundColor: Colors.background,
    margin: 16,
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.white,
  },
  userInfo: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  userBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.secondary + '20',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  userBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.secondary,
  },
  logoutButton: {
    backgroundColor: Colors.error,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: 13,
  },
  // Section Header
  sectionHeader: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  // Reports Grid
  reportsGrid: {
    paddingHorizontal: 16,
  },
  reportCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reportCardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.8,
  },
  reportIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportIcon: {
    fontSize: 28,
  },
  reportContent: {
    flex: 1,
    marginLeft: 16,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  reportSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  reportAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  // Stats Container
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  statCard: {
    width: (width - 48) / 2,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  statIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statIconText: {
    fontSize: 18,
  },
  bottomPadding: {
    height: 20,
  },
});

export default ReportScreen;
