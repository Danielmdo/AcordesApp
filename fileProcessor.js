// File Processing for web - PDF, Images, DOCX

let fileCounter = 0;

function getFileType(file) {
  const name = file.name.toLowerCase();
  const type = file.type || '';
  if (type.includes('pdf') || name.endsWith('.pdf')) return 'pdf';
  if (type.includes('image') || /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(name)) return 'image';
  if (type.includes('word') || type.includes('officedocument') || name.endsWith('.docx') || name.endsWith('.doc')) return 'docx';
  return 'unknown';
}

async function processFiles(files) {
  const allPages = [];

  for (const file of files) {
    const pages = await processFile(file);
    allPages.push(...pages);
  }

  return allPages;
}

async function processFile(file) {
  const fileId = `file_${++fileCounter}`;
  const type = getFileType(file);

  switch (type) {
    case 'pdf': return processPDF(file, fileId);
    case 'image': return processImage(file, fileId);
    case 'docx': return processDocx(file, fileId);
    default: return [];
  }
}

async function processPDF(file, fileId) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;

    // Create an array of page renderers
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push({
        id: `${fileId}_page_${i}`,
        fileId,
        fileName: file.name,
        fileType: 'pdf',
        pageNumber: i,
        totalPages,
        pdfDoc: pdf,
        renderPage: (container, pageNum) => renderPDFPage(pdf, container, pageNum),
      });
    }

    // Store PDF doc reference
    pdfDocs[fileId] = pdf;
    return pages;
  } catch (e) {
    console.error('Error processing PDF:', e);
    return [];
  }
}

const pdfDocs = {};

async function renderPDFPage(pdf, container, pageNumber) {
  try {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.5 });
    const dpr = window.devicePixelRatio || 1;

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width * dpr;
    canvas.height = viewport.height * dpr;
    canvas.style.width = viewport.width + 'px';
    canvas.style.height = viewport.height + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    container.innerHTML = '';
    container.appendChild(canvas);

    await page.render({ canvasContext: ctx, viewport }).promise;
  } catch (e) {
    container.innerHTML = '<div style="padding:30px;color:#e74c3c;">Error al cargar esta página</div>';
  }
}

async function processImage(file, fileId) {
  const url = URL.createObjectURL(file);
  return [{
    id: `${fileId}_page_1`,
    fileId,
    fileName: file.name,
    fileType: 'image',
    pageNumber: 1,
    totalPages: 1,
    url,
  }];
}

async function processDocx(file, fileId) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const html = result.value;

    // Split HTML into pages
    const chunks = splitDocxIntoPages(html);

    return chunks.map((chunk, index) => ({
      id: `${fileId}_page_${index + 1}`,
      fileId,
      fileName: file.name,
      fileType: 'docx',
      pageNumber: index + 1,
      totalPages: chunks.length,
      content: chunk,
    }));
  } catch (e) {
    console.error('Error processing DOCX:', e);
    return [{
      id: `${fileId}_page_1`,
      fileId,
      fileName: file.name,
      fileType: 'docx',
      pageNumber: 1,
      totalPages: 1,
      content: '<p>Error al procesar el documento Word.</p>',
    }];
  }
}

function splitDocxIntoPages(html) {
  // Try page breaks first
  const hasHr = /<hr\b[^>]*>/i.test(html);
  if (hasHr) {
    return html.split(/<hr\b[^>]*>/i).filter(p => p.trim().length > 0);
  }

  // Split by elements
  const blockMatch = html.match(/<(p|h[1-6]|div|table|ul|ol|blockquote)[^>]*>[\s\S]*?<\/\1>/gi);
  if (!blockMatch || blockMatch.length === 0) return [html];

  const perPage = Math.max(2, Math.min(5, Math.ceil(blockMatch.length / 3)));
  const pages = [];
  for (let i = 0; i < blockMatch.length; i += perPage) {
    pages.push(blockMatch.slice(i, i + perPage).join('\n'));
  }
  return pages.length > 0 ? pages : [html];
}
