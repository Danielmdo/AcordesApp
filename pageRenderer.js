// Page Renderer - renders individual pages in the pager

function createPageElement(page) {
  const div = document.createElement('div');
  div.className = 'page';
  div.dataset.pageId = page.id;

  switch (page.fileType) {
    case 'image':
      renderImagePage(div, page);
      break;
    case 'pdf':
      renderPDFPageWrapper(div, page);
      break;
    case 'docx':
      renderDocxPage(div, page);
      break;
    default:
      div.innerHTML = '<div style="color:#999;padding:20px;">Tipo no soportado</div>';
  }

  return div;
}

function renderImagePage(container, page) {
  const wrapper = document.createElement('div');
  wrapper.className = 'page-image-wrapper';
  const img = document.createElement('img');
  img.className = 'page-image';
  img.src = page.url;
  img.alt = page.fileName;
  img.draggable = false;
  wrapper.appendChild(img);
  container.appendChild(wrapper);
  setupDoubleTapZoom(wrapper, '.page-image', 2.5);
}

function renderPDFPageWrapper(container, page) {
  const wrapper = document.createElement('div');
  wrapper.className = 'page-pdf-container';
  wrapper.id = `pdf-container-${page.id}`;
  container.appendChild(wrapper);

  // Defer rendering to when the page is visible
  page._container = wrapper;
  page._rendered = false;

  // Show loading
  wrapper.innerHTML = '<div style="padding:30px;color:#666;">Cargando página...</div>';

  // Double-tap zoom on the PDF canvas
  setupDoubleTapZoom(wrapper, 'canvas', 2.5);
}

function renderDocxPage(container, page) {
  const div = document.createElement('div');
  div.className = 'page-docx';
  div.innerHTML = page.content;
  container.appendChild(div);
  setupDoubleTapZoom(div, null, 1.8);
}

function renderPDFOnDemand(page) {
  if (page._rendered || !page._container) return;
  page._rendered = true;

  if (page.pdfDoc) {
    renderPDFPage(page.pdfDoc, page._container, page.pageNumber);
  }
}

// Zoom + pan system: double-tap/double-click to zoom, then drag to pan
function setupDoubleTapZoom(container, targetSelector, zoomScale) {
  var state = { zoomed: false, tx: 0, ty: 0, lastTap: 0 };
  var dragging = false, dragStartX = 0, dragStartY = 0, startTx = 0, startTy = 0;

  function applyTransform() {
    var el = targetSelector ? container.querySelector(targetSelector) : container;
    if (!el) return;
    if (state.zoomed) {
      el.style.transform = 'translate(' + state.tx + 'px, ' + state.ty + 'px) scale(' + zoomScale + ')';
      el.style.transformOrigin = '0 0';
    } else {
      el.style.transform = '';
    }
  }

  function toggleZoom(clientX, clientY) {
    state.zoomed = !state.zoomed;
    if (state.zoomed) {
      var rect = container.getBoundingClientRect();
      var cx = rect.width / 2;
      var cy = rect.height / 2;
      state.tx = cx - (clientX - rect.left) * zoomScale;
      state.ty = cy - (clientY - rect.top) * zoomScale;
    } else {
      state.tx = 0;
      state.ty = 0;
    }
    applyTransform();
  }

  function startDrag(clientX, clientY) {
    if (!state.zoomed) return;
    dragging = true;
    dragStartX = clientX;
    dragStartY = clientY;
    startTx = state.tx;
    startTy = state.ty;
  }

  function moveDrag(clientX, clientY) {
    if (!dragging) return;
    state.tx = startTx + (clientX - dragStartX);
    state.ty = startTy + (clientY - dragStartY);
    applyTransform();
  }

  function endDrag() {
    dragging = false;
  }

  // Touch events
  container.addEventListener('touchstart', function(e) {
    if (e.touches.length > 1) return;
    startDrag(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  container.addEventListener('touchmove', function(e) {
    if (e.touches.length > 1) return;
    moveDrag(e.touches[0].clientX, e.touches[0].clientY);
    if (state.zoomed) e.preventDefault();
  }, { passive: false });
  container.addEventListener('touchend', function(e) {
    if (e.changedTouches.length > 1) { endDrag(); return; }
    if (dragging) {
      var dx = Math.abs(e.changedTouches[0].clientX - dragStartX);
      var dy = Math.abs(e.changedTouches[0].clientY - dragStartY);
      if (dx < 10 && dy < 10) {
        // It was a tap, not a drag
        var now = Date.now();
        if (now - state.lastTap < 300) {
          e.preventDefault();
          toggleZoom(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
          state.lastTap = 0;
        } else {
          state.lastTap = now;
        }
      }
    }
    endDrag();
  }, { passive: false });

  // Mouse events
  container.addEventListener('mousedown', function(e) {
    if (e.button !== 0) return;
    startDrag(e.clientX, e.clientY);
  });
  document.addEventListener('mousemove', function(e) {
    moveDrag(e.clientX, e.clientY);
  });
  document.addEventListener('mouseup', function() {
    endDrag();
  });
  container.addEventListener('dblclick', function(e) {
    toggleZoom(e.clientX, e.clientY);
  });
}
