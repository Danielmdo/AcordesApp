import * as FileSystem from 'expo-file-system';

const SESSIONS_FILE = `${FileSystem.documentDirectory}sessions.json`;
const FILES_DIR = `${FileSystem.documentDirectory}session_files/`;

let sessionsCache = null;
let sessionCounter = 0;

/**
 * Initialize the files directory.
 */
async function ensureFilesDir() {
  const info = await FileSystem.getInfoAsync(FILES_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(FILES_DIR, { intermediates: true });
  }
}

/**
 * Copy a file to permanent storage and return the new URI.
 */
export async function copyFileToPermanentStorage(uri, fileName) {
  try {
    await ensureFilesDir();
    const safeName = (fileName || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
    const dest = `${FILES_DIR}${Date.now()}_${safeName}`;
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  } catch (e) {
    console.warn('Could not copy file to permanent storage, using original URI:', e.message);
    return uri;
  }
}

/**
 * Get all saved sessions.
 */
export async function getSessions() {
  if (sessionsCache) return sessionsCache;
  return await loadSessions();
}

async function loadSessions() {
  try {
    const info = await FileSystem.getInfoAsync(SESSIONS_FILE);
    if (!info.exists) {
      sessionsCache = [];
      return [];
    }
    const raw = await FileSystem.readAsStringAsync(SESSIONS_FILE);
    sessionsCache = JSON.parse(raw);

    if (!Array.isArray(sessionsCache)) {
      sessionsCache = [];
      return [];
    }

    // Set counter to highest existing session ID
    sessionsCache.forEach(s => {
      const num = parseInt(s.id?.replace('session_', '') || '0', 10);
      if (num > sessionCounter) sessionCounter = num;
    });
    return sessionsCache;
  } catch (e) {
    console.warn('Error loading sessions, starting fresh:', e.message);
    sessionsCache = [];
    return [];
  }
}

async function saveSessions() {
  try {
    const data = JSON.stringify(sessionsCache || []);
    await FileSystem.writeAsStringAsync(SESSIONS_FILE, data);
  } catch (e) {
    console.error('Error saving sessions:', e);
  }
}

/**
 * Create a new session.
 */
export async function createSession(name) {
  await ensureSessionsLoaded();
  const now = new Date().toISOString();
  const session = {
    id: `session_${++sessionCounter}`,
    name: name.trim() || `Sesión ${sessionCounter}`,
    createdAt: now,
    updatedAt: now,
    files: [],
    fileCount: 0,
    pageCount: 0,
  };
  sessionsCache.push(session);
  await saveSessions();
  return session;
}

/**
 * Delete a session.
 */
export async function deleteSession(sessionId) {
  await ensureSessionsLoaded();
  sessionsCache = sessionsCache.filter(s => s.id !== sessionId);
  await saveSessions();
}

/**
 * Update session name.
 */
export async function renameSession(sessionId, newName) {
  await ensureSessionsLoaded();
  const session = sessionsCache.find(s => s.id === sessionId);
  if (session) {
    session.name = newName.trim() || session.name;
    session.updatedAt = new Date().toISOString();
    await saveSessions();
  }
  return session;
}

/**
 * Add files to a session.
 * Files are copied to permanent storage before saving.
 */
export async function addFilesToSession(sessionId, files) {
  await ensureSessionsLoaded();
  const session = sessionsCache.find(s => s.id === sessionId);
  if (!session) return null;

  // Copy files to permanent storage
  const permanentFiles = [];
  for (const file of files) {
    const permanentUri = await copyFileToPermanentStorage(file.uri, file.name || 'file');
    permanentFiles.push({
      ...file,
      uri: permanentUri,
      originalUri: file.uri,
    });
  }

  session.files.push(...permanentFiles);
  session.fileCount = session.files.length;
  session.updatedAt = new Date().toISOString();
  await saveSessions();
  return session;
}

/**
 * Check if a session's files are accessible (exist on disk).
 */
export async function validateSessionFiles(sessionId) {
  await ensureSessionsLoaded();
  const session = sessionsCache.find(s => s.id === sessionId);
  if (!session) return [];

  const validFiles = [];
  for (const file of session.files) {
    try {
      const info = await FileSystem.getInfoAsync(file.uri);
      if (info.exists) {
        validFiles.push(file);
      }
    } catch (e) {
      // File not accessible, skip
    }
  }

  // Update session with only valid files
  session.files = validFiles;
  session.fileCount = validFiles.length;
  await saveSessions();
  return validFiles;
}

/**
 * Get a session by ID.
 */
export async function getSession(sessionId) {
  await ensureSessionsLoaded();
  return sessionsCache.find(s => s.id === sessionId) || null;
}

/**
 * Get files for a session.
 */
export async function getSessionFiles(sessionId) {
  await ensureSessionsLoaded();
  const session = sessionsCache.find(s => s.id === sessionId);
  return session?.files || [];
}

async function ensureSessionsLoaded() {
  if (!sessionsCache) {
    await loadSessions();
  }
}
