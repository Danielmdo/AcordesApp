// Simple PNG icon generator - run with: node generate-icons.js
// Uses only Node.js built-in modules (zlib for PNG compression)

const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function createPNG(width, height, r, g, b) {
  // Create RGBA pixel data (simple icon with rounded rect appearance)
  const pixels = Buffer.alloc(width * height * 4, 255);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const corner = Math.min(width, height) * 0.15;
      const cx = width / 2;
      const cy = height / 2;
      const dx = Math.abs(x - cx);
      const dy = Math.abs(y - cy);
      
      // Check if inside the rounded rect (background)
      const inXRounded = dx < (width/2 - corner) || 
        Math.sqrt(Math.pow(dx - (width/2 - corner), 2) + Math.pow(Math.max(0, dy - (height/2 - corner)), 2)) <= corner;
      const inYRounded = dy < (height/2 - corner) ||
        Math.sqrt(Math.pow(Math.max(0, dx - (width/2 - corner)), 2) + Math.pow(dy - (height/2 - corner), 2)) <= corner;
      
      const insideBg = dx <= width/2 - corner || dy <= height/2 - corner ||
        Math.sqrt(Math.pow(Math.max(0, dx - (width/2 - corner)), 2) + Math.pow(Math.max(0, dy - (height/2 - corner)), 2)) <= corner;
      
      if (insideBg) {
        // Background color (#1a1a2e)
        pixels[idx] = 26;
        pixels[idx + 1] = 26;
        pixels[idx + 2] = 46;
        pixels[idx + 3] = 255;
        
        // Document shape (white rectangle)
        const docLeft = width * 0.2;
        const docTop = height * 0.14;
        const docW = width * 0.55;
        const docH = height * 0.72;
        const docCorner = 4;
        
        const inDocX = x >= docLeft && x <= docLeft + docW;
        const inDocY = y >= docTop && y <= docTop + docH;
        
        if (inDocX && inDocY) {
          // Check rounded corners for document
          const dLeft = x - docLeft;
          const dTop = y - docTop;
          const dRight = docLeft + docW - x;
          const dBottom = docTop + docH - y;
          
          const inDocCorner = 
            (dLeft >= docCorner || dTop >= docCorner) &&
            (dLeft >= docCorner || dBottom >= docCorner) &&
            (dRight >= docCorner || dTop >= docCorner) &&
            (dRight >= docCorner || dBottom >= docCorner) ||
            (dLeft < docCorner && dTop < docCorner && Math.sqrt(Math.pow(docCorner - dLeft, 2) + Math.pow(docCorner - dTop, 2)) <= docCorner) ||
            (dLeft < docCorner && dBottom < docCorner && Math.sqrt(Math.pow(docCorner - dLeft, 2) + Math.pow(docCorner - dBottom, 2)) <= docCorner) ||
            (dRight < docCorner && dTop < docCorner && Math.sqrt(Math.pow(docCorner - dRight, 2) + Math.pow(docCorner - dTop, 2)) <= docCorner) ||
            (dRight < docCorner && dBottom < docCorner && Math.sqrt(Math.pow(docCorner - dRight, 2) + Math.pow(docCorner - dBottom, 2)) <= docCorner);
          
          if (inDocCorner) {
            pixels[idx] = 255;
            pixels[idx + 1] = 255;
            pixels[idx + 2] = 255;
            pixels[idx + 3] = 243;
            
            // Blue accent lines
            const lineY1 = height * 0.30;
            const lineY2 = height * 0.55;
            const lineH = Math.max(2, height * 0.025);
            
            if (Math.abs(y - lineY1) < lineH/2 && x > docLeft + width * 0.08 && x < docLeft + docW - width * 0.08) {
              pixels[idx] = 74;
              pixels[idx + 1] = 108;
              pixels[idx + 2] = 247;
              pixels[idx + 3] = 255;
            }
            if (Math.abs(y - lineY2) < lineH/2 && x > docLeft + width * 0.08 && x < docLeft + docW - width * 0.08) {
              pixels[idx] = 74;
              pixels[idx + 1] = 108;
              pixels[idx + 2] = 247;
              pixels[idx + 3] = 255;
            }
            
            // Gray lines
            const grayLines = [0.36, 0.40, 0.44, 0.60, 0.64, 0.68];
            for (const ly of grayLines) {
              const gy = height * ly;
              if (Math.abs(y - gy) < lineH/2 && x > docLeft + width * 0.08 && x < docLeft + docW - width * 0.08) {
                pixels[idx] = 220;
                pixels[idx + 1] = 220;
                pixels[idx + 2] = 220;
                pixels[idx + 3] = 255;
              }
            }
          } else {
            // Outside document corners - show background
            pixels[idx] = 26;
            pixels[idx + 1] = 26;
            pixels[idx + 2] = 46;
            pixels[idx + 3] = 255;
          }
        }
      }
    }
  }

  // Create PNG file
  return createPNGBuffer(pixels, width, height);
}

function createPNGBuffer(pixels, width, height) {
  // Convert to filtered rows (filter byte + RGBA pixels)
  const rawData = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    rawData[y * (1 + width * 4)] = 0; // filter: None
    pixels.copy(rawData, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
  }

  // Compress with zlib
  const compressed = zlib.deflateSync(rawData);

  // Build PNG
  const chunks = [];

  // PNG Signature
  chunks.push(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  chunks.push(createChunk('IHDR', ihdr));

  // IDAT
  chunks.push(createChunk('IDAT', compressed));

  // IEND
  chunks.push(createChunk('IEND', Buffer.alloc(0)));

  return Buffer.concat(chunks);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  
  const typeBuffer = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuffer, data]);
  
  const crc = crc32(crcData);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);

  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function crc32(data) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Generate icons
const sizes = [192, 512];
for (const size of sizes) {
  const png = createPNG(size, size, 26, 26, 46);
  const outputPath = path.join(__dirname, 'icons', `icon-${size}.png`);
  fs.writeFileSync(outputPath, png);
  console.log(`✅ Generated ${outputPath} (${png.length} bytes)`);
}
