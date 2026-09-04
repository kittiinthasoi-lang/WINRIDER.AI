import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// This script generates PWA/web icons procedurally if no source logo is provided.
// If you place a high-resolution logo at `assets/icons/source/logo.png` or `assets/icons/source/logo.svg`
// and have `sharp` installed, the script will use sharp to generate properly sized PNG/ICO/ICNS files.

async function generateFromSource(sourcePath: string, publicDir: string) {
  try {
    // Try to load sharp dynamically (optional dependency)
    // Install with: npm i sharp
    // If sharp is not available the script will throw and we fall back.
    // sharp is used for high-quality resizing and to produce .ico/.icns
    // which require binary processing.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const sharp = require('sharp');

    const img = sharp(sourcePath).resize({ width: 1024, height: 1024, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } });

    // Ensure public dir
    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

    // Web sizes
    await img.clone().resize(512, 512).png().toFile(path.join(publicDir, 'pwa-512x512.png'));
    await img.clone().resize(192, 192).png().toFile(path.join(publicDir, 'pwa-192x192.png'));
    await img.clone().resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));

    // Favicon generation: produce a 64x64 PNG and a fallback .ico
    const faviconPng = path.join(publicDir, 'favicon-64.png');
    await img.clone().resize(64, 64).png().toFile(faviconPng);

    // Create ICO (multi-size) - sharp can output .ico in newer versions, otherwise use pngs
    try {
      await sharp([
        { input: await img.clone().resize(16, 16).png().toBuffer() },
        { input: await img.clone().resize(32, 32).png().toBuffer() },
        { input: await img.clone().resize(48, 48).png().toBuffer() },
        { input: await img.clone().resize(64, 64).png().toBuffer() }
      ]).toFile(path.join(publicDir, 'favicon.ico'));
    } catch (e) {
      // If sharp does not support multi-input ICO creation in this environment, fallback to single PNG renamed
      fs.copyFileSync(faviconPng, path.join(publicDir, 'favicon.ico'));
    }

    // Desktop icons
    const desktopDir = path.resolve(process.cwd(), 'assets', 'icons', 'desktop');
    if (!fs.existsSync(desktopDir)) fs.mkdirSync(desktopDir, { recursive: true });
    await img.clone().resize(512, 512).png().toFile(path.join(desktopDir, 'icon-512.png'));

    // Android / iOS assets - store in assets/icons/{android,ios}
    const androidDir = path.resolve(process.cwd(), 'assets', 'icons', 'android');
    if (!fs.existsSync(androidDir)) fs.mkdirSync(androidDir, { recursive: true });
    const sizes = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 } as Record<string, number>;
    for (const [k, v] of Object.entries(sizes)) {
      await img.clone().resize(v, v).png().toFile(path.join(androidDir, `ic_launcher-${k}.png`));
    }
    await img.clone().resize(512, 512).png().toFile(path.join(androidDir, `ic_launcher-playstore.png`));

    const iosDir = path.resolve(process.cwd(), 'assets', 'icons', 'ios', 'AppIcon.appiconset');
    if (!fs.existsSync(iosDir)) fs.mkdirSync(iosDir, { recursive: true });
    // Common iOS sizes
    const iosSizes = [20, 29, 40, 60, 76, 83.5, 1024];
    for (const s of iosSizes) {
      const sizePx = Math.round(s * 2); // we'll output high-res @2x by default
      await img.clone().resize(sizePx, sizePx).png().toFile(path.join(iosDir, `icon-${sizePx}x${sizePx}.png`));
    }

    console.log('Generated icons from source/logo using sharp');
    return true;
  } catch (err) {
    console.warn('Sharp-based generation failed or sharp is not installed. Falling back to procedural generator. Error:', err?.message || err);
    return false;
  }
}

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

async function main() {
  const publicDir = path.resolve(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  const sourceSvg = path.resolve(process.cwd(), 'assets', 'icons', 'source', 'logo.svg');
  const sourcePng = path.resolve(process.cwd(), 'assets', 'icons', 'source', 'logo.png');

  let usedSource = false;
  if (fs.existsSync(sourceSvg)) {
    usedSource = await generateFromSource(sourceSvg, publicDir);
  } else if (fs.existsSync(sourcePng)) {
    usedSource = await generateFromSource(sourcePng, publicDir);
  }

  if (!usedSource) {
    // Fallback: Procedural PWA assets (keeps previous behavior)
    fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPNG(192, 192, [7, 13, 30, 255], [0, 210, 255, 255]));
    fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPNG(512, 512, [7, 13, 30, 255], [0, 210, 255, 255]));
    fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPNG(512, 512, [7, 13, 30, 255], [0, 210, 255, 255]));
    fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPNG(180, 180, [7, 13, 30, 255], [0, 210, 255, 255]));
    fs.writeFileSync(path.join(publicDir, 'favicon.ico'), createPNG(64, 64, [7, 13, 30, 255], [0, 210, 255, 255]));

    // Also write a simple fallback SVG icon with the project name so the site updates immediately
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="84" fill="#070D1E"/>
  <g>
    <circle cx="256" cy="220" r="150" stroke="#00D2FF" stroke-width="18" fill="none" opacity="0.9"/>
    <circle cx="256" cy="220" r="90" fill="#0D2246" stroke="#FFD700" stroke-width="10"/>
    <text x="256" y="420" font-family="system-ui, sans-serif" font-weight="900" font-size="36" fill="#00D2FF" text-anchor="middle" letter-spacing="3">WINRIDER.AI</text>
  </g>
</svg>`;
    fs.writeFileSync(path.join(publicDir, 'icon.svg'), svg, 'utf8');

    console.log('Fallback procedural icons written to public/');
  } else {
    console.log('Icons generated from source and written to public/ and assets/icons/');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
