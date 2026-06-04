import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Animated,
} from 'react-native';
import PagerView from 'react-native-pager-view';
import PDFPage from './PDFPage';
import ImagePage from './ImagePage';
import DocxPage from './DocxPage';

export default function PagePager({ pages, onAddFiles, onBack, sessionName }) {
  const pagerRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const currentPage = pages[currentIndex];

  const handlePageSelected = useCallback((e) => {
    const index = e.nativeEvent.position;
    setCurrentIndex(index);
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0.3, duration: 50, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim]);

  const renderPage = useCallback((page) => {
    switch (page.fileType) {
      case 'image':
        return (
          <View key={page.id} style={styles.pageContainer}>
            <ImagePage uri={page.uri} />
          </View>
        );
      case 'pdf':
        return (
          <View key={page.id} style={styles.pageContainer}>
            <PDFPage
              fileId={page.fileId}
              pageNumber={page.pageNumber}
            />
          </View>
        );
      case 'docx':
        return (
          <View key={page.id} style={styles.pageContainer}>
            <DocxPage content={page.content} />
          </View>
        );
      default:
        return (
          <View key={page.id} style={styles.pageContainer}>
            <View style={styles.unsupportedContainer}>
              <Text style={styles.unsupportedText}>Tipo de archivo no soportado</Text>
            </View>
          </View>
        );
    }
  }, []);

  if (!pages || pages.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerTopRow}>
            {onBack && (
              <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
                <Text style={styles.backArrow}>‹</Text>
              </TouchableOpacity>
            )}
            <View style={styles.headerTextContainer}>
              {sessionName ? (
                <Text style={styles.headerSessionName} numberOfLines={1}>{sessionName}</Text>
              ) : null}
              <Text style={styles.headerTitle} numberOfLines={1}>
                {currentPage?.fileName || 'Documento'}
              </Text>
            </View>
          </View>
          <Text style={[styles.headerSubtitle, onBack ? styles.headerSubtitleWithBack : null]}>
            Página {currentPage?.pageNumber || '-'}
            {currentPage?.totalPages ? ` de ${currentPage.totalPages}` : ''}
            {pages.length > 1 ? ` · ${currentIndex + 1} de ${pages.length} total` : ''}
          </Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={onAddFiles} activeOpacity={0.7}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBar}>
          {pages.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                index === currentIndex && styles.progressDotActive,
                index < currentIndex && styles.progressDotSeen,
              ]}
            />
          ))}
        </View>
      </View>

      {/* Pager */}
      <Animated.View style={[styles.pagerWrapper, { opacity: fadeAnim }]}>
        <PagerView
          ref={pagerRef}
          style={styles.pager}
          initialPage={0}
          onPageSelected={handlePageSelected}
          orientation="horizontal"
          overScrollMode="never"
        >
          {pages.map((page) => renderPage(page))}
        </PagerView>
      </Animated.View>

      {/* Navigation arrows */}
      {currentIndex > 0 && (
        <TouchableOpacity
          style={[styles.navArrow, styles.navArrowLeft]}
          onPress={() => pagerRef.current?.setPage(currentIndex - 1)}
          activeOpacity={0.7}
        >
          <Text style={styles.navArrowText}>‹</Text>
        </TouchableOpacity>
      )}
      {currentIndex < pages.length - 1 && (
        <TouchableOpacity
          style={[styles.navArrow, styles.navArrowRight]}
          onPress={() => pagerRef.current?.setPage(currentIndex + 1)}
          activeOpacity={0.7}
        >
          <Text style={styles.navArrowText}>›</Text>
        </TouchableOpacity>
      )}

      {/* Page type indicator */}
      <View style={styles.typeIndicator}>
        <Text style={styles.typeIndicatorText}>
          {currentPage?.fileType === 'pdf' ? '📄 PDF' :
           currentPage?.fileType === 'image' ? '🖼️ Imagen' :
           currentPage?.fileType === 'docx' ? '📝 Word' : '📁'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 8,
    backgroundColor: '#1a1a2e',
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  backArrow: {
    fontSize: 24,
    color: 'white',
    fontWeight: '300',
    marginTop: -2,
  },
  headerSessionName: {
    fontSize: 12,
    color: '#4a6cf7',
    fontWeight: '600',
    marginBottom: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#aab',
    marginTop: 3,
  },
  headerSubtitleWithBack: {
    marginLeft: 46,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4a6cf7',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#4a6cf7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  addButtonText: {
    fontSize: 24,
    color: 'white',
    fontWeight: '600',
    marginTop: -2,
  },
  progressBarContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#1a1a2e',
  },
  progressBar: {
    flexDirection: 'row',
    gap: 4,
  },
  progressDot: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  progressDotActive: {
    backgroundColor: '#4a6cf7',
    height: 4,
  },
  progressDotSeen: {
    backgroundColor: 'rgba(74,108,247,0.5)',
  },
  pagerWrapper: {
    flex: 1,
  },
  pager: {
    flex: 1,
  },
  pageContainer: {
    flex: 1,
  },
  navArrow: {
    position: 'absolute',
    top: '50%',
    width: 48,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  navArrowLeft: {
    left: 0,
  },
  navArrowRight: {
    right: 0,
  },
  navArrowText: {
    fontSize: 48,
    color: 'rgba(255,255,255,0.35)',
    fontWeight: '300',
  },
  typeIndicator: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
  },
  typeIndicatorText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
  },
  unsupportedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  unsupportedText: {
    fontSize: 16,
    color: '#999',
  },
});
