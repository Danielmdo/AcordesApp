import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Text,
  TouchableOpacity,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import PagePager from '../components/PagePager';
import EmptyState from '../components/EmptyState';
import { processFiles } from '../utils/fileProcessor';
import { addFilesToSession, getSession, validateSessionFiles } from '../utils/sessionManager';

export default function SessionViewerScreen({ session, onGoBack, onSessionUpdated }) {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sessionData, setSessionData] = useState(session);

  // Load existing files when entering the viewer
  useEffect(() => {
    if (session.files && session.files.length > 0) {
      // Validate which files are still accessible on disk
      validateSessionFiles(session.id).then((validFiles) => {
        if (validFiles.length > 0) {
          reprocessSessionFiles(validFiles);
        } else {
          setSessionData((prev) => ({ ...prev, files: [], fileCount: 0, pageCount: 0 }));
        }
      });
    }
  }, []);

  const reprocessSessionFiles = useCallback(async (files) => {
    if (!files || files.length === 0) return;
    setLoading(true);
    try {
      const newPages = await processFiles(files);
      setPages(newPages);
      // Update session page count
      const updated = await getSession(session.id);
      if (updated) {
        updated.pageCount = newPages.length;
        updated.fileCount = files.length;
        setSessionData(updated);
      }
    } catch (e) {
      console.error('Error reprocessing session files:', e);
    } finally {
      setLoading(false);
    }
  }, [session.id]);

  const handlePickFiles = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'image/*',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const selectedFiles = result.assets || result.output || [];
      if (selectedFiles.length === 0) return;

      setLoading(true);

      // Save files to session and get permanent URIs
      const updatedSession = await addFilesToSession(session.id, selectedFiles);

      // Process the permanent copies instead of temp URIs for consistency
      const lastFiles = updatedSession.files.slice(-selectedFiles.length);
      const newPages = await processFiles(lastFiles);

      setPages((prev) => [...prev, ...newPages]);

      // Update session page count
      if (updatedSession) {
        updatedSession.pageCount = pages.length + newPages.length;
        setSessionData(updatedSession);
        if (onSessionUpdated) onSessionUpdated(updatedSession);
      }
    } catch (error) {
      console.error('Error picking files:', error);
      Alert.alert('Error', 'Ocurrió un error al seleccionar los archivos.');
    } finally {
      setLoading(false);
    }
  }, [session.id, pages.length, onSessionUpdated]);

  const handleAddFiles = useCallback(() => {
    handlePickFiles();
  }, [handlePickFiles]);

  const handleBack = useCallback(() => {
    if (onGoBack) onGoBack();
  }, [onGoBack]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4a6cf7" />
        <Text style={styles.loadingText}>Procesando archivos...</Text>
      </View>
    );
  }

  if (pages.length === 0) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle} numberOfLines={1}>{sessionData.name}</Text>
            <Text style={styles.headerSubtitle}>Sin archivos aún</Text>
          </View>
        </View>
        <EmptyState onPickFiles={handlePickFiles} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PagePager
        pages={pages}
        onAddFiles={handleAddFiles}
        onBack={handleBack}
        sessionName={sessionData.name}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#aab',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 54,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#1a1a2e',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  backArrow: {
    fontSize: 28,
    color: 'white',
    fontWeight: '300',
    marginTop: -2,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#aab',
    marginTop: 2,
  },
});
