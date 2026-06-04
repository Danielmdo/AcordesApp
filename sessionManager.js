// Session Manager - uses localStorage for persistence
// All functions stored in window.App namespace to avoid global conflicts

window.App = window.App || {};

let sessions = [];
let sessionCounter = 0;
const fileDataStore = {};

function loadSessions() {
  try {
    const raw = localStorage.getItem('acordesapp_sessions');
    sessions = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(sessions)) sessions = [];
    sessions.forEach(s => {
      const num = parseInt((s.id || '').replace('session_', ''), 10);
      if (num > sessionCounter) sessionCounter = num;
    });
  } catch (e) {
    console.warn('Error loading sessions:', e);
    sessions = [];
  }
}

function saveSessions() {
  try {
    localStorage.setItem('acordesapp_sessions', JSON.stringify(sessions));
  } catch (e) {
    console.error('Error saving sessions:', e);
  }
}

// Store file references (File objects persist in memory)
function getFileStore(sessionId) {
  if (!fileDataStore[sessionId]) {
    fileDataStore[sessionId] = [];
  }
  return fileDataStore[sessionId];
}

// --- Public API ---
window.App.getSessions = function() {
  return [...sessions];
};

window.App.createSession = function(name) {
  const now = new Date().toISOString();
  const session = {
    id: `session_${++sessionCounter}`,
    name: name.trim() || `Sesión ${sessionCounter}`,
    createdAt: now,
    updatedAt: now,
    fileCount: 0,
    pageCount: 0,
  };
  sessions.push(session);
  fileDataStore[session.id] = [];
  saveSessions();
  return session;
};

window.App.deleteSession = function(sessionId) {
  sessions = sessions.filter(s => s.id !== sessionId);
  delete fileDataStore[sessionId];
  saveSessions();
};

window.App.getSession = function(sessionId) {
  return sessions.find(s => s.id === sessionId) || null;
};

window.App.getSessionFiles = function(sessionId) {
  return [...getFileStore(sessionId)];
};

window.App.setSessionFiles = function(sessionId, files) {
  const session = getSession(sessionId);
  if (!session) return;
  fileDataStore[sessionId] = files;
  session.fileCount = files.length;
  session.updatedAt = new Date().toISOString();
  saveSessions();
};

window.App.updateSessionPages = function(sessionId, pageCount) {
  const session = getSession(sessionId);
  if (!session) return;
  session.pageCount = pageCount;
  saveSessions();
};

// Keep local reference for internal use
const getSession = window.App.getSession;
const createSession = window.App.createSession;
const deleteSession = window.App.deleteSession;

// Initialize
loadSessions();
