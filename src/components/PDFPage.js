import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';
import { createPDFViewerHTML, getPDFBase64, getPDFJSCode } from '../utils/fileProcessor';


export default function PDFPage({ fileId, pageNumber }) {
  const [htmlUri, setHtmlUri] = useState(null);
  const [error, setError] = useState(null);
  const [pdfjsReady, setPdfjsReady] = useState(false);
  const base64 = getPDFBase64(fileId);

  // Download and cache PDF.js code on mount
  useEffect(() => {
    (async () => {
      await getPDFJSCode();
      setPdfjsReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!pdfjsReady) return;
    if (!base64) {
      setError('No se pudieron cargar los datos del PDF');
      return;
    }
    (async () => {
      try {
        // Get PDF.js source code and inline it directly in the HTML
        // This avoids file:// script loading restrictions in Android WebView
        const code = await getPDFJSCode();
        const html = createPDFViewerHTML(base64, pageNumber, code);
        const path = `${FileSystem.cacheDirectory}pdf_${fileId}_p${pageNumber}.html`;
        await FileSystem.writeAsStringAsync(path, html);
        setHtmlUri(path);
      } catch (e) {
        console.error('PDF page setup error:', e);
        setError('Error al preparar la página');
      }
    })();
  }, [pdfjsReady, fileId, pageNumber, base64]);

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  if (!htmlUri) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4a6cf7" />
        <Text style={styles.loadingText}>Preparando página...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: htmlUri }}
        style={styles.webview}
        scrollEnabled={true}
        showsVerticalScrollIndicator={true}
        bounces={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        originWhitelist={['*']}
        startInLoadingState={true}
        setBuiltInZoomControls={true}
        setDisplayZoomControls={false}
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
  },
  loadingContainer: {
    flex: 1,
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

