import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import SessionListScreen from './src/screens/SessionListScreen';
import SessionViewerScreen from './src/screens/SessionViewerScreen';
import { clearPDFCache } from './src/utils/fileProcessor';

export default function App() {
  const [currentSession, setCurrentSession] = useState(null);

  const handleOpenSession = useCallback((session) => {
    setCurrentSession(session);
  }, []);

  const handleGoBack = useCallback(() => {
    // Clear cached PDF data to free memory when leaving a session
    clearPDFCache();
    setCurrentSession(null);
  }, []);

  const handleSessionUpdated = useCallback((updatedSession) => {
    setCurrentSession(updatedSession);
  }, []);

  if (currentSession) {
    return (
      <View style={styles.container}>
        <SessionViewerScreen
          session={currentSession}
          onGoBack={handleGoBack}
          onSessionUpdated={handleSessionUpdated}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SessionListScreen onOpenSession={handleOpenSession} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
});
