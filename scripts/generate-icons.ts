import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(width: number, height: number, bgColor: [number, number, number, number], fgColor: [number, number, number, number]): Buffer {
  // Simple PNG generator with uncompressed or zlib IDAT
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function chunk(type: string, data: Buffer): Buffer {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const body = Buffer.concat([typeBuf, data]);
    
    // Calculate CRC32
    let c = 0xffffffff;
    for (let i = 0; i < body.length; i++) {
      c ^= body[i];
      for (let k = 0; k < 8; k++) {
        c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
      }
    }
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE((c ^ 0xffffffff) >>> 0, 0);
    return Buffer.concat([len, body, crc]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = chunk('IHDR', ihdr);

  // Raw bitmap rows: filter byte (0) + 4 bytes per pixel
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  const cx = width / 2;
  const cy = height / 2;
  const rOuter = width * 0.42;
  const rInner = width * 0.28;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // None filter
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Draw stylized emblem
      if (dist <= rOuter && dist >= rInner) {
        // Cyan glow ring
        rawData[pxOffset] = fgColor[0];
        rawData[pxOffset + 1] = fgColor[1];
        rawData[pxOffset + 2] = fgColor[2];
        rawData[pxOffset + 3] = fgColor[3];
      } else if (dist < rInner && Math.abs(dx) < rInner * 0.6 && Math.abs(dy) < rInner * 0.6) {
        // Gold core
        rawData[pxOffset] = 255;
        rawData[pxOffset + 1] = 215;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 255;
      } else {
        // Deep background
        rawData[pxOffset] = bgColor[0];
        rawData[pxOffset + 1] = bgColor[1];
        rawData[pxOffset + 2] = bgColor[2];
        rawData[pxOffset + 3] = bgColor[3];
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = chunk('IDAT', compressedData);
  const iendChunk = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate Icons
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPNG(192, 192, [7, 13, 30, 255], [0, 210, 255, 255]));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPNG(512, 512, [7, 13, 30, 255], [0, 210, 255, 255]));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPNG(512, 512, [7, 13, 30, 255], [0, 210, 255, 255]));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPNG(180, 180, [7, 13, 30, 255], [0, 210, 255, 255]));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), createPNG(64, 64, [7, 13, 30, 255], [0, 210, 255, 255]));

// SVG Icon
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="100" fill="#070D1E"/>
  <circle cx="256" cy="256" r="190" stroke="#00D2FF" stroke-width="24" fill="none" opacity="0.9"/>
  <circle cx="256" cy="256" r="120" fill="#0D2246" stroke="#FFD700" stroke-width="12"/>
  <path d="M256 160 L290 230 L365 240 L310 290 L325 365 L256 325 L187 365 L202 290 L147 240 L222 230 Z" fill="#FFD700"/>
  <text x="256" y="440" font-family="system-ui, sans-serif" font-weight="900" font-size="44" fill="#00D2FF" text-anchor="middle" letter-spacing="4">WINRIDER.AI</text>
</svg>`;
fs.writeFileSync(path.join(publicDir, 'icon.svg'), svg);

console.log('PWA assets generated successfully in public/');
