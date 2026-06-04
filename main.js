// Main Application Logic

// --- State ---
let currentSessionId = null;
let currentPages = [];
let currentIndex = 0;
let isDragging = false;
let dragStartX = 0;
let dragOffset = 0;

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  // Configure PDF.js
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  // Session name input handler
  document.getElementById('sessionNameInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleCreateSession();
  });

  // File input handler
  document.getElementById('fileInput').addEventListener('change', handleFileSelected);

  // Touch/mouse handlers for pager
  const pager = document.getElementById('pager');
  pager.addEventListener('touchstart', handleDragStart, { passive: true });
  pager.addEventListener('touchmove', handleDragMove, { passive: false });
  pager.addEventListener('touchend', handleDragEnd, { passive: true });
  pager.addEventListener('mousedown', handleMouseDragStart);
  document.addEventListener('mousemove', handleMouseDragMove);
  document.addEventListener('mouseup', handleMouseDragEnd);

  // Render session list
  renderSessionList();
});

// --- Session List ---
function renderSessionList() {
  const sessions = window.App.getSessions();
  const list = document.getElementById('sessionList');
  const empty = document.getElementById('emptyState');

  if (sessions.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'flex';
    return;
  }

  empty.style.display = 'none';

  const colors = ['#4a6cf7', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];
  list.innerHTML = sessions.map((s, i) => `
    <div class="session-card" onclick="openSession('${s.id}')" oncontextmenu="event.preventDefault(); deleteSessionConfirm('${s.id}')">
      <div class="session-card-icon" style="background:${colors[i % colors.length]}20;">
        📁
      </div>
      <div class="session-card-info">
        <div class="session-card-name">${escapeHtml(s.name)}</div>
        <div class="session-card-meta">
          ${s.fileCount > 0 ? `${s.fileCount} archivo${s.fileCount !== 1 ? 's' : ''} · ${s.pageCount} página${s.pageCount !== 1 ? 's' : ''}` : 'Sin archivos'}
        </div>
        <div class="session-card-date">${new Date(s.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
      </div>
      <div class="session-card-arrow">›</div>
    </div>
  `).join('');
}

// --- Create / Delete Sessions ---
function showCreateModal() {
  document.getElementById('createModal').classList.add('active');
  document.getElementById('sessionNameInput').value = '';
  setTimeout(() => document.getElementById('sessionNameInput').focus(), 100);
}

function hideCreateModal() {
  document.getElementById('createModal').classList.remove('active');
}

function handleCreateSession() {
  const input = document.getElementById('sessionNameInput');
  const name = input.value.trim();
  if (!name) {
    input.style.borderColor = '#e74c3c';
    setTimeout(() => input.style.borderColor = '', 1000);
    return;
  }
  window.App.createSession(name);
  hideCreateModal();
  renderSessionList();
}

function deleteSessionConfirm(sessionId) {
  const session = window.App.getSession(sessionId);
  if (!session) return;
  if (confirm(`¿Eliminar "${session.name}"? Los archivos de esta sesión se perderán.`)) {
    window.App.deleteSession(sessionId);
    renderSessionList();
  }
}

// --- Session Viewer ---
function openSession(sessionId) {
  currentSessionId = sessionId;
  currentIndex = 0;
  currentPages = [];

  const session = window.App.getSession(sessionId);
  if (!session) return;

  // Switch screens
  document.getElementById('sessionListScreen').classList.remove('active');
  document.getElementById('sessionViewerScreen').classList.add('active');

  // Update header
  document.getElementById('viewerSessionName').textContent = session.name;

  // Load stored files
  const files = window.App.getSessionFiles(sessionId);
  if (files && files.length > 0) {
    processAndShowFiles(sessionId, files);
  } else {
    showEmptyViewer();
  }
}

function goBackToSessions() {
  currentSessionId = null;
  currentPages = [];
  currentIndex = 0;

  // Free object URLs
  currentPages.forEach(p => {
    if (p.url) URL.revokeObjectURL(p.url);
  });

  document.getElementById('sessionViewerScreen').classList.remove('active');
  document.getElementById('sessionListScreen').classList.add('active');
  renderSessionList();
}

function showEmptyViewer() {
  document.getElementById('emptyViewer').classList.add('active');
  document.getElementById('pager').innerHTML = '';
  document.getElementById('progressBar').innerHTML = '';
  document.getElementById('pageIndicator').textContent = '';
  document.getElementById('navLeft').classList.remove('active');
  document.getElementById('navRight').classList.remove('active');
  document.getElementById('viewerFileName').textContent = 'Sin archivos';
}

// --- File Picking ---
function pickFiles() {
  document.getElementById('fileInput').click();
}

async function handleFileSelected(e) {
  const files = e.target.files;
  if (!files || files.length === 0) return;

  e.target.value = '';
  await processAndShowFiles(currentSessionId, Array.from(files));
}

async function processAndShowFiles(sessionId, files) {
  showLoading('Procesando archivos...');

  try {
    const newPages = await processFiles(files);
    currentPages = currentPages.concat(newPages);

    // Store files in session
    const existing = window.App.getSessionFiles(sessionId);
    window.App.setSessionFiles(sessionId, existing.concat(files));

    // Update page count
    window.App.updateSessionPages(sessionId, currentPages.length);

    // Reset to first page
    currentIndex = 0;
    renderPager();
    showToast(`✓ ${newPages.length} página${newPages.length !== 1 ? 's' : ''} agregada${newPages.length !== 1 ? 's' : ''}`);
  } catch (e) {
    console.error('Error processing files:', e);
    showToast('Error al procesar archivos');
  } finally {
    hideLoading();
  }
}

// --- Pager ---
function renderPager() {
  document.getElementById('emptyViewer').classList.remove('active');

  if (currentPages.length === 0) {
    showEmptyViewer();
    return;
  }

  const pager = document.getElementById('pager');
  pager.innerHTML = '';

  currentPages.forEach(page => {
    pager.appendChild(createPageElement(page));
  });

  updatePagerPosition();
  updateProgressBar();
  updateNavigation();
  updateFileInfo();

  // Render visible PDF pages
  renderVisiblePDFs();
}

function updatePagerPosition() {
  const pager = document.getElementById('pager');
  const offset = -currentIndex * 100;
  pager.style.transform = `translateX(${offset}%)`;
}

function updateProgressBar() {
  const bar = document.getElementById('progressBar');
  bar.innerHTML = currentPages.map((_, i) => {
    let cls = 'progress-dot';
    if (i === currentIndex) cls += ' active';
    else if (i < currentIndex) cls += ' seen';
    return `<div class="${cls}"></div>`;
  }).join('');
}

function updateNavigation() {
  document.getElementById('navLeft').classList.toggle('active', currentIndex > 0);
  document.getElementById('navRight').classList.toggle('active', currentIndex < currentPages.length - 1);

  const page = currentPages[currentIndex];
  if (page) {
    document.getElementById('pageIndicator').textContent =
      `${page.fileName} · Pág ${page.pageNumber} de ${page.totalPages} · ${currentIndex + 1} de ${currentPages.length}`;
  }
}

function updateFileInfo() {
  const page = currentPages[currentIndex];
  if (page) {
    document.getElementById('viewerFileName').textContent = page.fileName;
  }
}

function navigatePage(direction) {
  const newIndex = currentIndex + direction;
  if (newIndex < 0 || newIndex >= currentPages.length) return;

  currentIndex = newIndex;
  updatePagerPosition();
  updateProgressBar();
  updateNavigation();
  updateFileInfo();
  renderVisiblePDFs();
}

function renderVisiblePDFs() {
  // Render current, prev, and next PDF pages for smooth experience
  const indices = [currentIndex];
  if (currentIndex > 0) indices.push(currentIndex - 1);
  if (currentIndex < currentPages.length - 1) indices.push(currentIndex + 1);

  indices.forEach(i => {
    const page = currentPages[i];
    if (page && page.fileType === 'pdf') {
      renderPDFOnDemand(page);
    }
  });
}

// --- Drag to swipe ---
function handleDragStart(e) {
  isDragging = true;
  dragStartX = e.touches[0].clientX;
  dragOffset = 0;
  document.getElementById('pager').classList.add('dragging');
}

function handleDragMove(e) {
  if (!isDragging) return;
  e.preventDefault();

  const currentX = e.touches[0].clientX;
  dragOffset = currentX - dragStartX;

  const pager = document.getElementById('pager');
  const baseOffset = -currentIndex * 100;
  const dragPercent = (dragOffset / window.innerWidth) * 100;
  pager.style.transform = `translateX(${baseOffset + dragPercent}%)`;
}

function handleDragEnd(e) {
  if (!isDragging) return;
  isDragging = false;
  document.getElementById('pager').classList.remove('dragging');

  const threshold = window.innerWidth * 0.2;
  if (dragOffset < -threshold && currentIndex < currentPages.length - 1) {
    currentIndex++;
  } else if (dragOffset > threshold && currentIndex > 0) {
    currentIndex--;
  }

  updatePagerPosition();
  updateProgressBar();
  updateNavigation();
  updateFileInfo();
  renderVisiblePDFs();
  dragOffset = 0;
}

// --- Mouse drag support ---
function handleMouseDragStart(e) {
  if (e.button !== 0) return;
  isDragging = true;
  dragStartX = e.clientX;
  dragOffset = 0;
  document.getElementById('pager').classList.add('dragging');
}

function handleMouseDragMove(e) {
  if (!isDragging) return;
  const currentX = e.clientX;
  dragOffset = currentX - dragStartX;

  const pager = document.getElementById('pager');
  const baseOffset = -currentIndex * 100;
  const dragPercent = (dragOffset / window.innerWidth) * 100;
  pager.style.transform = `translateX(${baseOffset + dragPercent}%)`;
}

function handleMouseDragEnd(e) {
  if (!isDragging) return;
  handleDragEnd(e);
}

// --- Loading ---
function showLoading(text) {
  document.getElementById('loadingText').textContent = text || 'Procesando...';
  document.getElementById('loadingOverlay').classList.add('active');
}

function hideLoading() {
  document.getElementById('loadingOverlay').classList.remove('active');
}

// --- Toast ---
function showToast(message, duration = 2500) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('active');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('active'), duration);
}

// --- Utils ---
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Register service worker for PWA offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('Service Worker registration failed:', err);
    });
  });
}

// Handle back gesture on iOS
window.addEventListener('popstate', () => {
  if (currentSessionId) {
    goBackToSessions();
  }
});

// Long-press detection for iOS (delete session)
let longPressTimer = null;
let longPressTriggered = false;

document.addEventListener('touchstart', (e) => {
  const card = e.target.closest('.session-card');
  if (!card) return;
  
  longPressTriggered = false;
  const sessionId = card.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
  if (!sessionId) return;
  
  longPressTimer = setTimeout(() => {
    longPressTriggered = true;
    deleteSessionConfirm(sessionId);
  }, 600);
}, { passive: true });

document.addEventListener('touchend', () => {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
}, { passive: true });

document.addEventListener('touchmove', () => {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
}, { passive: true });
