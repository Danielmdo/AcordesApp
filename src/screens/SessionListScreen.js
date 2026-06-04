import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert,
  StatusBar,
  Animated,
  RefreshControl,
} from 'react-native';
import { getSessions, createSession, deleteSession } from '../utils/sessionManager';

const COLORS = ['#4a6cf7', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];

export default function SessionListScreen({ onOpenSession }) {
  const [sessions, setSessions] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = useCallback(async () => {
    const data = await getSessions();
    setSessions([...data]);
    setLoaded(true);
  }, []);

  const handleCreate = useCallback(async () => {
    const name = newSessionName.trim();
    if (!name) {
      Alert.alert('Nombre requerido', 'Por favor ingresa un nombre para la sesión.');
      return;
    }
    await createSession(name);
    setNewSessionName('');
    setShowCreateModal(false);
    await loadSessions();
  }, [newSessionName, loadSessions]);

  const handleDelete = useCallback((session) => {
    Alert.alert(
      'Eliminar sesión',
      `¿Eliminar "${session.name}"? Los archivos de esta sesión se perderán.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deleteSession(session.id);
            await loadSessions();
          },
        },
      ]
    );
  }, [loadSessions]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSessions();
    setRefreshing(false);
  }, [loadSessions]);

  const renderSession = useCallback(({ item, index }) => {
    const color = COLORS[index % COLORS.length];
    const fileCount = item.fileCount || 0;
    const pageCount = item.pageCount || 0;

    return (
      <TouchableOpacity
        style={styles.sessionCard}
        onPress={() => onOpenSession(item)}
        onLongPress={() => handleDelete(item)}
        activeOpacity={0.85}
      >
        <View style={[styles.sessionIcon, { backgroundColor: color + '20' }]}>
          <Text style={styles.sessionEmoji}>📁</Text>
        </View>
        <View style={styles.sessionInfo}>
          <Text style={styles.sessionName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.sessionMeta}>
            {fileCount > 0
              ? `${fileCount} archivo${fileCount !== 1 ? 's' : ''} · ${pageCount} página${pageCount !== 1 ? 's' : ''}`
              : 'Sin archivos'}
          </Text>
          <Text style={styles.sessionDate}>
            {new Date(item.createdAt).toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        </View>
        <Text style={styles.sessionArrow}>›</Text>
      </TouchableOpacity>
    );
  }, [onOpenSession, handleDelete]);

  if (!loaded) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AcordesApp</Text>
        <Text style={styles.headerSubtitle}>Visor de Documentos</Text>
      </View>

      {sessions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Text style={styles.emptyIcon}>📂</Text>
          </View>
          <Text style={styles.emptyTitle}>No hay sesiones</Text>
          <Text style={styles.emptySubtitle}>
            Crea una sesión para comenzar a organizar tus documentos
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateModal(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.createButtonText}>+ Nueva Sesión</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          renderItem={renderSession}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#4a6cf7"
              colors={['#4a6cf7']}
            />
          }
          ListFooterComponent={
            <TouchableOpacity
              style={styles.addCard}
              onPress={() => setShowCreateModal(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.addCardIcon}>+</Text>
              <Text style={styles.addCardText}>Nueva Sesión</Text>
            </TouchableOpacity>
          }
        />
      )}

      {/* Create Session Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCreateModal(false)}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={() => {}}
          >
            <Text style={styles.modalTitle}>Nueva Sesión</Text>
            <Text style={styles.modalSubtitle}>
              Ingresa un nombre para la sesión de documentos
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ej: Documentos del proyecto"
              placeholderTextColor="#999"
              value={newSessionName}
              onChangeText={setNewSessionName}
              autoFocus
              maxLength={50}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setNewSessionName('');
                  setShowCreateModal(false);
                }}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalCreateBtn, !newSessionName.trim() && styles.modalCreateBtnDisabled]}
                onPress={handleCreate}
                disabled={!newSessionName.trim()}
              >
                <Text style={styles.modalCreateText}>Crear</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#1a1a2e',
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: 'white',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#aab',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  loadingText: {
    color: '#aab',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(74,108,247,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyIcon: {
    fontSize: 42,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: 'white',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#889',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  createButton: {
    backgroundColor: '#4a6cf7',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 14,
    elevation: 4,
    shadowColor: '#4a6cf7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  createButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: 'white',
  },
  list: {
    padding: 16,
    paddingTop: 8,
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#262640',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  sessionIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  sessionEmoji: {
    fontSize: 26,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionName: {
    fontSize: 17,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  sessionMeta: {
    fontSize: 13,
    color: '#889',
    marginBottom: 2,
  },
  sessionDate: {
    fontSize: 12,
    color: '#667',
  },
  sessionArrow: {
    fontSize: 24,
    color: '#556',
    marginLeft: 8,
  },
  addCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(74,108,247,0.12)',
    borderWidth: 2,
    borderColor: 'rgba(74,108,247,0.25)',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
  },
  addCardIcon: {
    fontSize: 22,
    color: '#4a6cf7',
    fontWeight: '700',
    marginRight: 8,
  },
  addCardText: {
    fontSize: 16,
    color: '#4a6cf7',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalContent: {
    backgroundColor: '#262640',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: 'white',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#889',
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: 'white',
    borderWidth: 1,
    borderColor: 'rgba(74,108,247,0.3)',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  modalCancelText: {
    fontSize: 15,
    color: '#aab',
    fontWeight: '500',
  },
  modalCreateBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#4a6cf7',
  },
  modalCreateBtnDisabled: {
    opacity: 0.4,
  },
  modalCreateText: {
    fontSize: 15,
    color: 'white',
    fontWeight: '600',
  },
});
