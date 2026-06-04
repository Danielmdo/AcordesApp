import React from 'react';
import { View, StyleSheet, Dimensions, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { createPDFViewerHTML, getPDFBase64 } from '../utils/fileProcessor';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function PDFPage({ fileId, pageNumber }) {
  const base64 = getPDFBase64(fileId);

  if (!base64) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: No se pudieron cargar los datos del PDF</Text>
      </View>
    );
  }

  const html = createPDFViewerHTML(base64, pageNumber);

  return (
    <View style={styles.container}>
      <WebView
        source={{ html }}
        style={styles.webview}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        bounces={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        originWhitelist={['*']}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4a6cf7" />
            <Text style={styles.loadingText}>Cargando página...</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    marginHorizontal: 8,
    marginVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  webview: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    height: SCREEN_HEIGHT - 180,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorText: {
    fontSize: 15,
    color: '#e74c3c',
    textAlign: 'center',
  },
});
