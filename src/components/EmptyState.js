import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function EmptyState({ onPickFiles }) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>📂</Text>
      </View>
      <Text style={styles.title}>Visor de Documentos</Text>
      <Text style={styles.subtitle}>
        Sube archivos PDF, imágenes o documentos Word
      </Text>
      <Text style={styles.description}>
        Todos los archivos se mostrarán como páginas individuales.
        Desliza hacia la izquierda o derecha para navegar entre ellas.
      </Text>
      <TouchableOpacity style={styles.button} onPress={onPickFiles} activeOpacity={0.8}>
        <Text style={styles.buttonIcon}>+</Text>
        <Text style={styles.buttonText}>Agregar Archivos</Text>
      </TouchableOpacity>
      <View style={styles.featuresRow}>
        <View style={styles.feature}>
          <Text style={styles.featureIcon}>📄</Text>
          <Text style={styles.featureLabel}>PDF</Text>
        </View>
        <View style={styles.feature}>
          <Text style={styles.featureIcon}>🖼️</Text>
          <Text style={styles.featureLabel}>Imágenes</Text>
        </View>
        <View style={styles.feature}>
          <Text style={styles.featureIcon}>📝</Text>
          <Text style={styles.featureLabel}>Word</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: '#f8f9fa',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e8f0fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  description: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4a6cf7',
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 14,
    elevation: 4,
    shadowColor: '#4a6cf7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    marginBottom: 40,
  },
  buttonIcon: {
    fontSize: 22,
    color: 'white',
    fontWeight: '600',
    marginRight: 10,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '600',
    color: 'white',
  },
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  feature: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    minWidth: 78,
  },
  featureIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  featureLabel: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
});
