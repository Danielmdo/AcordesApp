import * as FileSystem from 'expo-file-system';
import mammoth from 'mammoth';

let fileCounter = 0;

// Shared cache for PDF base64 data — prevents duplicating large binary data per page
const pdfBase64Cache = {};

/**
 * Process multiple files and return an array of page objects.
 */
export async function processFiles(files) {
  const allPages = [];

  for (const file of files) {
    const pages = await processFile(file);
    allPages.push(...pages);
  }

  return allPages;
}

/**
 * Retrieve cached PDF base64 data by fileId.
 */
export function getPDFBase64(fileId) {
  return pdfBase64Cache[fileId] || null;
}

/**
 * Clear the PDF base64 cache to free memory.
 * Call this when closing a session to prevent memory leaks.
 */
export function clearPDFCache() {
  Object.keys(pdfBase64Cache).forEach(key => delete pdfBase64Cache[key]);
  fileCounter = 0;
}

async function processFile(file) {
  try {
    const fileId = `file_${++fileCounter}`;
    const fileName = file?.name || (file?.uri ? file.uri.split('/').pop() : '') || 'unknown';
    const type = getFileType(fileName, file?.mimeType);

    switch (type) {
      case 'pdf':
        return processPDF(file, fileId, fileName);
      case 'image':
        return processImage(file, fileId, fileName);
      case 'docx':
        return processDocx(file, fileId, fileName);
      default:
        return [];
    }
  } catch (e) {
    console.error('processFile unexpected error:', e);
    return [];
  }
}

function getFileType(fileName, mimeType) {
  const name = fileName.toLowerCase();
  if (mimeType?.includes('pdf') || name.endsWith('.pdf')) return 'pdf';
  if (mimeType?.includes('image') || /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(name)) return 'image';
  if (mimeType?.includes('word') || mimeType?.includes('officedocument') || name.endsWith('.docx') || name.endsWith('.doc')) return 'docx';
  return 'unknown';
}

// Safe base64 decode that works without native atob (Hermes compatible)
function base64ToBytes(base64) {
  try {
    if (typeof atob === 'function') {
      const binaryStr = atob(base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      return bytes;
    }
  } catch (e) {
    // atob failed, fall through to manual decoder
  }
  // Manual base64 decode (works without atob)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = {};
  for (let i = 0; i < chars.length; i++) lookup[chars[i]] = i;
  lookup['='] = 0;
  lookup['-'] = 62; // base64url
  lookup['_'] = 63;
  
  // Remove whitespace
  const clean = base64.replace(/[^A-Za-z0-9+\/=]/g, '');
  const len = clean.length;
  const bytes = [];
  for (let i = 0; i < len; i += 4) {
    const c1 = lookup[clean[i]];
    const c2 = lookup[clean[i + 1]];
    const c3 = lookup[clean[i + 2]];
    const c4 = lookup[clean[i + 3]];
    bytes.push((c1 << 2) | (c2 >> 4));
    if (clean[i + 2] !== '=') bytes.push(((c2 & 0xf) << 4) | (c3 >> 2));
    if (clean[i + 3] !== '=') bytes.push(((c3 & 3) << 6) | c4);
  }
  return new Uint8Array(bytes);
}

/**
 * Extract page count from PDF by parsing the raw text header.
 * Tries multiple methods for broader compatibility.
 */
function extractPDFPageCount(base64) {
  try {
    const chunk = base64.substring(0, Math.min(base64.length, 80000));
    const binaryBytes = base64ToBytes(chunk);
    let binaryStr = '';
    for (let j = 0; j < binaryBytes.length; j += 16384) {
      binaryStr += String.fromCharCode.apply(null, binaryBytes.subarray(j, j + 16384));
    }

    // Method 1: Count /Type /Page entries (individual page objects, not the tree node /Type /Pages)
    const pageEntries = binaryStr.match(/\/Type\s*\/Page(?:[^s]|$)/g);
    if (pageEntries && pageEntries.length > 0) {
      return pageEntries.length;
    }

    // Method 2: Parse /Count from the /Pages tree dictionary
    const countMatch = binaryStr.match(/\/Type\s*\/Pages[\s\S]*?\/Count\s+(\d+)/);
    if (countMatch) {
      const count = parseInt(countMatch[1], 10);
      if (count > 0 && count < 10000) return count;
    }
  } catch (e) {
    console.warn('Could not parse PDF page count from header:', e.message);
  }
  return null;
}

async function processPDF(file, fileId, fileName) {
  try {
    const base64 = await FileSystem.readAsStringAsync(file.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Store base64 in shared cache (stored once, referenced by all pages of this PDF)
    pdfBase64Cache[fileId] = base64;

    // Try to extract page count from PDF header
    let totalPages = extractPDFPageCount(base64);
    if (!totalPages || totalPages < 1) {
      totalPages = 1;
    }

    // Create one page entry per PDF page — each references the shared cache via fileId
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push({
        id: `${fileId}_page_${i}`,
        fileId,
        fileName,
        fileType: 'pdf',
        pageNumber: i,
        totalPages: totalPages,
        uri: file.uri,
        originalUri: file.uri,
      });
    }

    return pages;
  } catch (error) {
    console.error('Error processing PDF:', error);
    return [];
  }
}

async function processImage(file, fileId, fileName) {
  return [{
    id: `${fileId}_page_1`,
    fileId,
    fileName,
    fileType: 'image',
    pageNumber: 1,
    totalPages: 1,
    uri: file.uri,
    originalUri: file.uri,
  }];
}

async function processDocx(file, fileId, fileName) {
  try {
    const base64 = await FileSystem.readAsStringAsync(file.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert base64 to ArrayBuffer for mammoth (safe for Hermes without atob)
    const rawBytes = base64ToBytes(base64);

    const result = await mammoth.convertToHtml({
      arrayBuffer: rawBytes.buffer,
    });

    const html = result.value;

    // Split HTML into logical pages
    const chunks = splitDocxIntoPages(html);

    return chunks.map((chunk, index) => ({
      id: `${fileId}_page_${index + 1}`,
      fileId,
      fileName,
      fileType: 'docx',
      pageNumber: index + 1,
      totalPages: chunks.length,
      uri: file.uri,
      originalUri: file.uri,
      content: chunk,
    }));
  } catch (error) {
    console.error('Error processing DOCX:', error);
    return [{
      id: `${fileId}_page_1`,
      fileId,
      fileName,
      fileType: 'docx',
      pageNumber: 1,
      totalPages: 1,
      uri: file.uri,
      originalUri: file.uri,
      content: '<p>Error al procesar el documento Word.</p>',
    }];
  }
}

/**
 * Split DOCX HTML into logical pages.
 */
function splitDocxIntoPages(html) {
  // Try to split by <hr> or manual page breaks
  const pageBreakRegex = /<hr\b[^>]*>/gi;
  const hasBreaks = pageBreakRegex.test(html);

  if (hasBreaks) {
    pageBreakRegex.lastIndex = 0;
    return html.split(pageBreakRegex).filter(p => p.trim().length > 0);
  }

  // Split by paragraphs, grouping into pages
  const paragraphs = html.match(/<(p|h[1-6]|div|table|ul|ol|blockquote)[^>]*>[\s\S]*?<\/\1>/gi);
  if (!paragraphs || paragraphs.length === 0) {
    return [html];
  }

  // Aim for ~2-5 paragraphs per page
  const paragraphsPerPage = Math.max(2, Math.min(5, Math.ceil(paragraphs.length / 3)));
  const pages = [];

  for (let i = 0; i < paragraphs.length; i += paragraphsPerPage) {
    const chunk = paragraphs.slice(i, i + paragraphsPerPage).join('\n');
    pages.push(chunk);
  }

  return pages.length > 0 ? pages : [html];
}

let pdfJSLocalPath = null;
const PDFJS_CACHE_FILE = `${FileSystem.cacheDirectory}pdfjs/pdf.min.js`;

/**
 * Get the local file path for PDF.js.
 * Downloads and caches PDF.js on first use.
 */
export async function getPDFJSLocalPath() {
  if (pdfJSLocalPath) return pdfJSLocalPath;
  try {
    const info = await FileSystem.getInfoAsync(PDFJS_CACHE_FILE);
    if (info.exists) {
      pdfJSLocalPath = PDFJS_CACHE_FILE;
      return pdfJSLocalPath;
    }
    // Download PDF.js to local cache
    const dir = PDFJS_CACHE_FILE.substring(0, PDFJS_CACHE_FILE.lastIndexOf('/'));
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    const result = await FileSystem.downloadAsync(
      'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',
      PDFJS_CACHE_FILE
    );
    pdfJSLocalPath = result.uri;
    return pdfJSLocalPath;
  } catch (e) {
    console.warn('Could not download PDF.js locally, will try CDN fallback:', e.message);
    return null;
  }
}

/**
 * Create PDF.js HTML for rendering a specific PDF page.
 * Uses canvas to render the PDF page at high quality.
 * @param {string} base64 - Base64-encoded PDF data
 * @param {number} pageNumber - Page number to render (1-indexed)
 * @param {string|null} localScriptPath - Local file:// path to pdf.min.js, or null to use CDN
 */
export function createPDFViewerHTML(base64, pageNumber, localScriptPath) {
  const scriptTag = localScriptPath
    ? `<script src="${localScriptPath}"></script>`
    : '<script src="https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js"></script>';
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  ${scriptTag}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { 
      width: 100%; 
      min-height: 100%; 
      display: flex; 
      justify-content: center; 
      align-items: center; 
      background: #f5f5f5;
      font-family: -apple-system, sans-serif;
    }
    #pdfContainer {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
      padding: 8px 0;
    }
    canvas {
      max-width: 100%;
      height: auto;
      box-shadow: 0 2px 12px rgba(0,0,0,0.12);
      border-radius: 4px;
      background: white;
    }
    #loading, #error {
      padding: 30px;
      font-size: 15px;
      text-align: center;
    }
    #loading { color: #666; }
    #error { color: #e74c3c; display: none; }
  </style>
</head>
<body>
  <div id="pdfContainer">
    <div id="loading">Cargando página...</div>
    <canvas id="pdfCanvas"></canvas>
    <div id="error">Error al cargar esta página</div>
  </div>
  <script>
    (function() {
      var loadingEl = document.getElementById('loading');
      var canvas = document.getElementById('pdfCanvas');
      var ctx = canvas.getContext('2d');
      var errorEl = document.getElementById('error');

      // Disable worker to avoid CORB issues (process on main thread)
      pdfjsLib.GlobalWorkerOptions.workerSrc = '';

      // Convert base64 to Uint8Array
      var pdfData = atob('${base64}');
      var rawLength = pdfData.length;
      var array = new Uint8Array(rawLength);
      for (var i = 0; i < rawLength; i++) {
        array[i] = pdfData.charCodeAt(i);
      }

      pdfjsLib.getDocument({ data: array }).promise
        .then(function(pdf) {
          return pdf.getPage(${pageNumber});
        })
        .then(function(page) {
          var viewport = page.getViewport({ scale: 1.5 });
          var dpr = window.devicePixelRatio || 1;

          canvas.width = viewport.width * dpr;
          canvas.height = viewport.height * dpr;
          canvas.style.width = viewport.width + 'px';
          canvas.style.height = viewport.height + 'px';

          ctx.scale(dpr, dpr);

          return page.render({
            canvasContext: ctx,
            viewport: viewport
          }).promise;
        })
        .then(function() {
          loadingEl.style.display = 'none';
        })
        .catch(function(err) {
          loadingEl.style.display = 'none';
          errorEl.style.display = 'block';
          errorEl.textContent = 'Error: ' + err.message;
        });
    })();
  </script>
</body>
</html>`;
}

/**
 * Create HTML for a DOCX page with nice typography
 */
export function createDocxPageHTML(content) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { 
      width: 100%; 
      min-height: 100%;
      background: white;
    }
    body {
      font-family: -apple-system, 'Georgia', 'Times New Roman', serif;
      color: #222;
      line-height: 1.7;
      padding: 28px 24px;
      font-size: 15px;
    }
    p { margin-bottom: 14px; }
    h1, h2, h3, h4, h5, h6 { 
      margin-top: 20px; 
      margin-bottom: 10px; 
      font-weight: 600;
      line-height: 1.3;
      color: #111;
    }
    h1 { font-size: 22px; }
    h2 { font-size: 19px; }
    h3 { font-size: 17px; }
    img { max-width: 100%; height: auto; border-radius: 4px; }
    ul, ol { padding-left: 24px; margin-bottom: 14px; }
    li { margin-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
    td, th { border: 1px solid #ddd; padding: 8px 10px; text-align: left; font-size: 14px; }
    th { background: #f8f9fa; font-weight: 600; }
    blockquote { 
      border-left: 4px solid #4a6cf7; 
      margin: 14px 0; 
      padding: 10px 16px; 
      background: #f8f9fa;
      border-radius: 0 4px 4px 0;
      color: #555;
    }
  </style>
</head>
<body>
  ${content}
</body>
</html>`;
}

export function getFileIcon(type) {
  switch (type) {
    case 'pdf': return '📄';
    case 'image': return '🖼️';
    case 'docx': return '📝';
    default: return '📁';
  }
}
