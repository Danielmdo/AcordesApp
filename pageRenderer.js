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
  const img = document.createElement('img');
  img.className = 'page-image';
  img.src = page.url;
  img.alt = page.fileName;
  img.draggable = false;
  container.appendChild(img);
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
}

function renderDocxPage(container, page) {
  const div = document.createElement('div');
  div.className = 'page-docx';
  div.innerHTML = page.content;
  container.appendChild(div);
}

function renderPDFOnDemand(page) {
  if (page._rendered || !page._container) return;
  page._rendered = true;
  
  if (page.pdfDoc) {
    renderPDFPage(page.pdfDoc, page._container, page.pageNumber);
  }
}
