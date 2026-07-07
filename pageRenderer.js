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

// Shared double-tap/double-click zoom toggle
function setupDoubleTapZoom(container, targetSelector, zoomScale) {
  var lastTap = 0, zoomed = false;
  function toggleZoom() {
    zoomed = !zoomed;
    if (targetSelector) {
      var el = container.querySelector(targetSelector);
      if (!el) return;
      if (zoomed) { el.style.transform = 'scale(' + zoomScale + ')'; el.style.transformOrigin = 'center center'; }
      else { el.style.transform = ''; }
    } else {
      if (zoomed) { container.style.transform = 'scale(' + zoomScale + ')'; container.style.transformOrigin = 'top left'; }
      else { container.style.transform = ''; }
    }
  }
  container.addEventListener('touchend', function(e) {
    if (e.changedTouches.length > 1) return;
    var now = Date.now();
    if (now - lastTap < 300) { e.preventDefault(); toggleZoom(); lastTap = 0; }
    else { lastTap = now; }
  }, { passive: false });
  container.addEventListener('dblclick', function() { toggleZoom(); });
}
