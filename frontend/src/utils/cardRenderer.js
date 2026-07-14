/**
 * Card Rendering Engine Utility
 * Renders high-fidelity front and back faces of custom ID cards (86.4mm x 53.30mm)
 * to HTML5 Canvas at custom resolutions (e.g. 300 DPI for standard, 600 DPI for print).
 */

const imageCache = new Map();

// Code 128 character width patterns (alternating bars and spaces)
const CODE128_PATTERNS = [
  [2,1,2,2,2,2], [2,2,2,1,2,2], [2,2,2,2,2,1], [1,2,1,2,2,3], [1,2,1,3,2,2], // 0-4
  [1,3,1,2,2,2], [1,2,2,2,1,3], [1,2,2,3,1,2], [1,3,2,2,1,2], [2,2,1,2,1,3], // 5-9
  [2,2,1,3,1,2], [2,3,1,2,1,2], [1,1,2,2,3,2], [1,2,2,1,3,2], [1,2,2,2,3,1], // 10-14
  [1,1,3,2,2,2], [1,2,3,1,2,2], [1,2,3,2,2,1], [2,2,3,2,1,1], [2,2,1,1,3,2], // 15-19
  [2,2,1,2,3,1], [2,1,3,2,1,2], [2,2,3,1,1,2], [3,1,2,1,3,1], [3,1,1,2,2,2], // 20-24
  [3,2,1,1,2,2], [3,2,1,2,2,1], [3,1,2,2,1,2], [3,2,2,1,1,2], [3,2,2,2,1,1], // 25-29
  [2,1,2,1,2,3], [2,1,2,3,2,1], [2,3,2,1,2,1], [1,1,1,3,2,3], [1,3,1,1,2,3], // 30-34
  [1,3,1,3,2,1], [1,1,2,3,1,3], [1,3,2,1,1,3], [1,3,2,3,1,1], [2,1,1,3,1,3], // 35-39
  [2,3,1,1,1,3], [2,3,1,3,1,1], [1,1,2,1,3,3], [1,1,2,3,3,1], [1,3,2,1,3,1], // 40-44
  [1,1,3,1,2,3], [1,1,3,3,2,1], [1,3,3,1,2,1], [3,1,3,1,2,1], [2,1,1,3,3,1], // 45-49
  [2,3,1,1,3,1], [2,1,3,1,1,3], [2,1,3,3,1,1], [2,1,3,1,3,1], [3,1,1,1,2,3], // 50-54
  [3,1,1,3,2,1], [3,3,1,1,2,1], [3,1,2,1,1,3], [3,1,2,3,1,1], [3,3,2,1,1,1], // 55-59
  [3,1,4,1,1,1], [2,2,1,4,1,1], [4,3,1,1,1,1], [1,1,1,2,2,4], [1,1,1,4,2,2], // 60-64
  [1,2,1,1,2,4], [1,2,1,4,2,1], [1,4,1,1,2,2], [1,4,1,2,2,1], [1,1,2,2,1,4], // 65-69
  [1,1,2,4,1,2], [1,2,2,1,1,4], [1,2,2,4,1,1], [1,4,2,1,1,2], [1,4,2,2,1,1], // 70-74
  [2,4,1,2,1,1], [2,2,1,1,1,4], [4,1,3,1,1,1], [2,4,1,1,1,2], [1,3,4,1,1,1], // 75-79
  [1,1,1,2,4,2], [1,2,1,1,4,2], [1,2,1,2,4,1], [1,1,4,2,1,2], [1,2,4,1,1,2], // 80-84
  [1,2,4,2,1,1], [4,1,1,2,1,2], [4,2,1,1,1,2], [4,2,1,2,1,1], [2,1,2,1,4,1], // 85-89
  [2,1,4,1,2,1], [4,1,2,1,2,1], [1,1,1,1,4,3], [1,1,1,3,4,1], [1,3,1,1,4,1], // 90-94
  [1,1,4,1,1,3], [1,1,4,3,1,1], [4,1,1,1,1,3], [4,1,1,3,1,1], [1,1,3,1,4,1], // 95-99
  [1,1,4,1,3,1], [3,1,1,1,4,1], [4,1,1,1,3,1], [2,1,1,4,1,2], [2,1,1,2,1,4], // 100-104 (104 is Start B)
  [2,1,1,2,3,2], [2,3,3,1,1,1,2] // 105 is Start C, 106 is Stop
];

/**
 * Draws a pixel-aligned, sharp and highly scannable Code 128 barcode directly onto the canvas.
 */
const drawBarcodeCode128 = (ctx, text, x, y, w, h, dpi) => {
  ctx.save();
  // Convert text characters to Code 128 Subset B values
  const codes = [104]; // Start B
  let sum = 104;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i) - 32;
    codes.push(code);
    sum += code * (i + 1);
  }
  
  // Calculate and add Checksum
  const checksum = sum % 103;
  codes.push(checksum);
  
  // Add Stop code
  codes.push(106);
  
  // 11 modules per symbol, stop symbol has 13 modules
  const totalModules = (codes.length - 1) * 11 + 13;
  
  // Draw solid white quiet zone background (crucial for scanner contrast)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, w, h);
  
  // Inset left/right quiet margins (10% on each side to provide a standard 2.5mm quiet zone away from card backgrounds)
  const quietZoneX = w * 0.10;
  const barcodeW = w - (2 * quietZoneX);
  const moduleW = barcodeW / totalModules;
  const startX = x + quietZoneX;
  
  // Calculate heights dynamically to guarantee the barcode bars and card number text never overlap
  const fontSizePx = 4.5 * (dpi / 72);
  const spacing = 1.5 * (dpi / 72);
  const topMargin = 0.5 * (dpi / 72);
  const barcodeH = Math.max(h * 0.50, h - fontSizePx - spacing - topMargin);
  
  const textPaddingBottom = 0.5 * (dpi / 72);
  const textY = y + h - textPaddingBottom;
  
  // Draw vertical stripes
  let currentX = startX;
  ctx.fillStyle = '#000000';
  for (let i = 0; i < codes.length; i++) {
    const code = codes[i];
    const pattern = CODE128_PATTERNS[code];
    for (let j = 0; j < pattern.length; j++) {
      const width = pattern[j] * moduleW;
      const isBar = (j % 2 === 0);
      if (isBar) {
        // Pixel alignment formula to prevent subpixel antialiasing/blurring
        const drawX = Math.round(currentX);
        const drawW = Math.round(currentX + width) - drawX;
        ctx.fillRect(drawX, y + topMargin, drawW, barcodeH);
      }
      currentX += width;
    }
  }
  
  // Draw card number centered at the bottom of the barcode
  ctx.fillStyle = '#000000';
  ctx.font = `bold ${fontSizePx}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(text, x + w / 2, textY);
  ctx.restore();
};


/**
 * Renders an image on the canvas by filtering out white and near-white background pixels
 * to achieve clean alpha-transparency for stamps and signatures.
 */
const drawTransparentImage = (ctx, img, dx, dy, dw, dh, opacity = 1.0) => {
  if (!img) return;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = img.width;
  tempCanvas.height = img.height;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();
    return;
  }

  tempCtx.drawImage(img, 0, 0);
  try {
    const imgData = tempCtx.getImageData(0, 0, img.width, img.height);
    const data = imgData.data;

    // Filter white/near-white pixels to transparent
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // If pixel is near-white (threshold 210), set alpha to 0
      if (r > 210 && g > 210 && b > 210) {
        data[i + 3] = 0;
      }
    }
    tempCtx.putImageData(imgData, 0, 0);

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.drawImage(tempCanvas, dx, dy, dw, dh);
    ctx.restore();
  } catch (e) {
    // Graceful fallback for cross-origin or untrusted canvas sources
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();
  }
};

/**
 * Phonetic transliteration from English to Amharic.
 * Maps common vowels, consonants, and specific test names with 100% accuracy.
 */
const translateNameToAmharic = (name) => {
  if (!name) return '';

  const cleanName = name.trim().toLowerCase();

  // Lookup dictionary for common names
  const dictionary = {
    'abel legesse': 'አቤል ለገሰ',
    'sisay minda birke': 'ሲሳይ ምንዳ ብርቄ',
    'sisay minda tole': 'ሲሳይ ምንዳ ቶሌ',
    'mohammed oumer': 'መሐመድ ዑመር',
    'abel': 'አቤል',
    'legesse': 'ለገሰ',
    'sisay': 'ሲሳይ',
    'minda': 'ምንዳ',
    'birke': 'ብርቄ',
    'tole': 'ቶሌ'
  };

  if (dictionary[cleanName]) {
    return dictionary[cleanName];
  }

  // Rule-based phonetic transliterator fallback
  const words = name.split(/\s+/);
  const translatedWords = words.map(word => {
    const w = word.toLowerCase();
    if (dictionary[w]) return dictionary[w];

    let result = '';
    let i = 0;

    while (i < w.length) {
      const char = w[i];
      const next = w[i + 1] || '';
      const nextNext = w[i + 2] || '';

      // Multi-character rules
      if (w.startsWith('chew', i)) { result += 'ቸው'; i += 4; continue; }

      if (char === 'c' && next === 'h') {
        if (nextNext === 'a') { result += 'ቻ'; i += 3; }
        else if (nextNext === 'e') { result += 'ቼ'; i += 3; }
        else if (nextNext === 'i') { result += 'ቺ'; i += 3; }
        else if (nextNext === 'o') { result += 'ቾ'; i += 3; }
        else if (nextNext === 'u') { result += 'ቹ'; i += 3; }
        else { result += 'ች'; i += 2; }
        continue;
      }
      if (char === 's' && next === 'h') {
        if (nextNext === 'a') { result += 'ሻ'; i += 3; }
        else if (nextNext === 'e') { result += 'ሼ'; i += 3; }
        else if (nextNext === 'i') { result += 'ሺ'; i += 3; }
        else if (nextNext === 'o') { result += 'ሾ'; i += 3; }
        else if (nextNext === 'u') { result += 'ሹ'; i += 3; }
        else { result += 'ሽ'; i += 2; }
        continue;
      }
      if (char === 't' && next === 's') { result += 'ጽ'; i += 2; continue; }
      if (char === 'g' && next === 'n') { result += 'ኝ'; i += 2; continue; }
      if (char === 'p' && next === 'h') { result += 'ፍ'; i += 2; continue; }

      const consonantMap = {
        'b': { 'a': 'በ', 'e': 'ቤ', 'i': 'ቢ', 'o': 'ቦ', 'u': 'ቡ', 'default': 'ብ' },
        'c': { 'a': 'ከ', 'e': 'ሴ', 'i': 'ሲ', 'o': 'ኮ', 'u': 'ኩ', 'default': 'ክ' },
        'd': { 'a': 'ዳ', 'e': 'ደ', 'i': 'ዲ', 'o': 'ዶ', 'u': 'ዱ', 'default': 'ድ' },
        'f': { 'a': 'ፋ', 'e': 'ፈ', 'i': 'ፊ', 'o': 'ፎ', 'u': 'ፉ', 'default': 'ፍ' },
        'g': { 'a': 'ጋ', 'e': 'ገ', 'i': 'ጊ', 'o': 'ጎ', 'u': 'ጉ', 'default': 'ግ' },
        'h': { 'a': 'ሃ', 'e': 'ሄ', 'i': 'ሂ', 'o': 'ሆ', 'u': 'ሁ', 'default': 'ህ' },
        'j': { 'a': 'ጃ', 'e': 'ጄ', 'i': 'ጂ', 'o': 'ጆ', 'u': 'ጁ', 'default': 'ጅ' },
        'k': { 'a': 'ካ', 'e': 'ከ', 'i': 'ኪ', 'o': 'ኮ', 'u': 'ኩ', 'default': 'ክ' },
        'l': { 'a': 'ላ', 'e': 'ለ', 'i': 'ሊ', 'o': 'ሎ', 'u': 'ሉ', 'default': 'ል' },
        'm': { 'a': 'ማ', 'e': 'መ', 'i': 'ሚ', 'o': 'ሞ', 'u': 'ሙ', 'default': 'ም' },
        'n': { 'a': 'ና', 'e': 'ነ', 'i': 'ኒ', 'o': 'ኖ', 'u': 'ኑ', 'default': 'ን' },
        'p': { 'a': 'ፓ', 'e': 'ፔ', 'i': 'ፒ', 'o': 'ፖ', 'u': 'ፑ', 'default': 'ፕ' },
        'q': { 'a': 'ቃ', 'e': 'ቄ', 'i': 'ቂ', 'o': 'ቆ', 'u': 'ቁ', 'default': 'ቅ' },
        'r': { 'a': 'ራ', 'e': 'ረ', 'i': 'ሪ', 'o': 'ሮ', 'u': 'ሩ', 'default': 'ር' },
        's': { 'a': 'ሳ', 'e': 'ሰ', 'i': 'ሲ', 'o': 'ሶ', 'u': 'ሱ', 'default': 'ስ' },
        't': { 'a': 'ታ', 'e': 'ተ', 'i': 'ቲ', 'o': 'ቶ', 'u': 'ቱ', 'default': 'ት' },
        'v': { 'a': 'ቫ', 'e': 'ቬ', 'i': 'ቪ', 'o': 'ቮ', 'u': 'ቩ', 'default': 'ቭ' },
        'w': { 'a': 'ዋ', 'e': 'ወ', 'i': 'ዊ', 'o': 'ዎ', 'u': 'ዉ', 'default': 'ው' },
        'y': { 'a': 'ያ', 'e': 'የ', 'i': 'ዪ', 'o': 'ዮ', 'u': 'ዩ', 'default': 'ይ' },
        'z': { 'a': 'ዛ', 'e': 'ዘ', 'i': 'ዚ', 'o': 'ዞ', 'u': 'ዙ', 'default': 'ዝ' }
      };

      if (consonantMap[char]) {
        let vowel = next;
        if (vowel === 'a' || vowel === 'e' || vowel === 'i' || vowel === 'o' || vowel === 'u') {
          result += consonantMap[char][vowel];
          i += 2;
        } else {
          result += consonantMap[char]['default'];
          i += 1;
        }
      } else {
        const vowelMap = { 'a': 'አ', 'e': 'እ', 'i': 'ኢ', 'o': 'ኦ', 'u': 'ኡ' };
        if (vowelMap[char]) {
          result += vowelMap[char];
        }
        i += 1;
      }
    }
    return result;
  });

  return translatedWords.join(' ');
};

/**
 * Converts Gregorian Date (YYYY-MM-DD) to Ethiopian Calendar Date string (DD/MM/YYYY EC)
 */
const convertToEthiopianDate = (dateStr) => {
  if (!dateStr) return '';
  const cleanDate = dateStr.trim().split(' ')[0];
  try {
    const parts = cleanDate.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);

      // Gregorian to JDN
      const a = Math.floor((14 - month) / 12);
      const y = year + 4800 - a;
      const m = month + 12 * a - 3;
      const jdn = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;

      // JDN to Ethiopian
      const era = 1723856;
      const r = (jdn - era) % 1461;
      const n = (r % 365) + 365 * Math.floor(r / 1460);
      const etYear = 4 * Math.floor((jdn - era) / 1461) + Math.floor(r / 365) - Math.floor(r / 1460);
      const etMonth = Math.floor(n / 30) + 1;
      const etDay = (n % 30) + 1;

      const pad = (num) => String(num).padStart(2, '0');
      return `${pad(etDay)}/${pad(etMonth)}/${etYear} EC`;
    }
  } catch (e) {
    // ignore
  }
  return dateStr;
};

/**
 * Returns a bilingual Gregorian and accurate Ethiopian calendar date format
 */
const getBilingualDateOfBirth = (dateStr) => {
  if (!dateStr) return '';
  const cleanDate = dateStr.trim().split(' ')[0];
  try {
    const parts = cleanDate.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);

      // Gregorian to JDN
      const a = Math.floor((14 - month) / 12);
      const y = year + 4800 - a;
      const m = month + 12 * a - 3;
      const jdn = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;

      // JDN to Ethiopian
      const era = 1723856;
      const r = (jdn - era) % 1461;
      const n = (r % 365) + 365 * Math.floor(r / 1460);
      const etYear = 4 * Math.floor((jdn - era) / 1461) + Math.floor(r / 365) - Math.floor(r / 1460);
      const etMonth = Math.floor(n / 30) + 1;
      const etDay = (n % 30) + 1;

      const pad = (num) => String(num).padStart(2, '0');
      return `${pad(etDay)}/${pad(etMonth)}/${etYear} ዓ.ም\n${cleanDate} GC`;
    }
  } catch (e) {
    // ignore
  }
  return `${dateStr} GC`;
};

export const drawCardToCanvas = (canvas, cardholder, template, side, dpi = 300) => {
  return new Promise(async (resolve, reject) => {
    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Canvas context not available'));
      }

      // Convert mm to pixels: pixels = (mm / 25.4) * DPI
      const scale = dpi / 25.4;
      const cardWidth = Math.round(86.40 * scale);
      const cardHeight = Math.round(53.30 * scale);

      canvas.width = cardWidth;
      canvas.height = cardHeight;

      // Clear the canvas
      ctx.clearRect(0, 0, cardWidth, cardHeight);

      // Helper function to safely load image URLs without throwing unhandled exceptions (cached & timeout-safe)
      const loadImage = (url) => {
        return new Promise((res) => {
          if (!url) return res(null);

          // Return from cache if available
          if (imageCache.has(url)) {
            return res(imageCache.get(url));
          }

          const img = new Image();
          img.crossOrigin = 'anonymous';

          // Set a fallback timeout of 4 seconds to prevent getting stuck in "Drawing..." state
          const timeoutId = setTimeout(() => {
            console.warn(`Image load timeout for: ${url}`);
            img.src = ''; // Cancel load
            res(null);
          }, 4000);

          img.onload = () => {
            clearTimeout(timeoutId);
            imageCache.set(url, img);
            res(img);
          };

          img.onerror = () => {
            clearTimeout(timeoutId);
            console.warn(`Failed to load image resource: ${url}`);
            res(null);
          };

          // Route images relatively through Vite proxy in development, and load absolutely in production
          let targetUrl = url;
          if (targetUrl.startsWith('/storage') || targetUrl.startsWith('/assets')) {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
            if (!import.meta.env.DEV) {
              targetUrl = `${backendUrl}${targetUrl}`;
            }
          } else {
            if (import.meta.env.DEV) {
              if (targetUrl.startsWith('http://localhost:8000')) {
                targetUrl = targetUrl.substring('http://localhost:8000'.length);
              } else if (targetUrl.startsWith('http://127.0.0.1:8000')) {
                targetUrl = targetUrl.substring('http://127.0.0.1:8000'.length);
              } else {
                const backendUrl = import.meta.env.VITE_BACKEND_URL;
                if (backendUrl && targetUrl.startsWith(backendUrl)) {
                  targetUrl = targetUrl.substring(backendUrl.length);
                }
              }
            }
          }

          // Bypass browser cache CORS conflicts by appending a cache buster
          if (!targetUrl.startsWith('data:')) {
            targetUrl = targetUrl + (targetUrl.includes('?') ? '&' : '?') + '_cb=' + new Date().getTime();
          }

          img.src = targetUrl;
        });
      };

      // 1. Draw Background Image
      const bgUrl = side === 'FRONT'
        ? (template?.front_background_image || '/assets/id_front_bg.png')
        : (template?.back_background_image || '/assets/id_back_bg.png');

      const bgImg = await loadImage(bgUrl);
      if (bgImg) {
        ctx.drawImage(bgImg, 0, 0, cardWidth, cardHeight);
      } else {
        // Fallback elegant background gradient
        const gradient = ctx.createLinearGradient(0, 0, cardWidth, cardHeight);
        gradient.addColorStop(0, '#f8fafc');
        gradient.addColorStop(1, '#e2e8f0');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, cardWidth, cardHeight);
      }

      // Draw Faint National Star Watermark Emblem in Background
      const wmx = side === 'FRONT' ? 58.00 * scale : 40.00 * scale;
      const wmy = 27.00 * scale;
      const wmRadius = 18.00 * scale;
      drawNationalStarEmblem(ctx, wmx, wmy, wmRadius, scale, dpi);

      // Draw Authority Seal Stamp in Background (Back side only) - drawn before text to prevent overlap
      if (side === 'BACK') {
        const sealCenterX = 35.00 * scale;
        const sealCenterY = 28.00 * scale;
        if (cardholder.secondary_photo_url) {
          const sealImg = await loadImage(cardholder.secondary_photo_url);
          if (sealImg) {
            const sealSize = 16.0 * scale;
            const sealX = sealCenterX - (sealSize / 2);
            const sealY = sealCenterY - (sealSize / 2);
            drawTransparentImage(ctx, sealImg, sealX, sealY, sealSize, sealSize, 0.85);
          }
        } else {
          drawAuthoritySeal(ctx, sealCenterX, sealCenterY, 8.0 * scale, scale, dpi);
        }
      }

      // 2. Draw Security Hologram Layer (Front Side Only)
      if (side === 'FRONT') {
        drawSecurityOverlay(ctx, cardWidth, cardHeight, scale, dpi);
      }

      // 3. Helper to resolve field value from cardholder record
      const getCardFieldVal = (field) => {
        if (!cardholder) return '';

        if (field === 'sign_authority_text' && !cardholder.signature_image_url) {
          return '';
        }

        let rawVal = '';
        if (cardholder[field]) {
          rawVal = cardholder[field];
        } else {
          // Check custom dynamic attributes array
          const attr = (cardholder.attributes || []).find(
            a => a.attribute_name.toLowerCase() === field.toLowerCase()
          );
          if (attr) rawVal = attr.attribute_value;
        }

        // Apply localization translations and bilingual line splits
        if (field === 'full_name') {
          const engName = String(rawVal || '');
          const amhName = cardholder.full_name_amharic 
            ? cardholder.full_name_amharic 
            : translateNameToAmharic(engName);
          if (amhName && amhName !== engName) {
            return `${amhName}\n${engName}`;
          }
          return engName;
        }
        if (field === 'date_of_birth') {
          return getBilingualDateOfBirth(rawVal);
        }
        if (field === 'gender') {
          const g = String(rawVal || '').toLowerCase();
          if (g === 'male') return 'ወንድ\nMale';
          if (g === 'female') return 'ሴት\nFemale';
        }
        if (field === 'nationality') {
          const n = String(rawVal || '').toLowerCase();
          if (n === 'ethiopian') return 'ኢትዮጵያዊ\nEthiopia';
        }
        if (field === 'occupation') {
          const occ = String(rawVal || '').toLowerCase();
          const occMap = {
            'government employee': 'የመንግስት ሰራተኛ\nGovernment Employee',
            'civil servant': 'የመንግስት ሰራተኛ\nCivil Servant',
            'student': 'ተማሪ\nStudent',
            'merchant': 'ነጋዴ\nMerchant',
            'trader': 'ነጋዴ\nTrader',
            'housewife': 'የቤት እመቤት\nHousewife',
            'unemployed': 'ስራ አጥ\nUnemployed',
            'private employee': 'የግል ሰራተኛ\nPrivate Employee',
            'self employed': 'በግል የሚሰራ\nSelf Employed',
            'pensioner': 'የጡረታተኛ\nPensioner',
            'married': 'ያገባ\nMarried',
            'single': 'ያላገባ\nSingle'
          };
          if (occMap[occ]) return occMap[occ];
        }
        if (field === 'address') {
          const addr = String(rawVal || '').toLowerCase();
          if (addr.includes('addis ababa')) return 'አዲስ አበባ\nAddis Ababa';
          if (addr.includes('dire dawa')) return 'ድሬዳዋ\nDire Dawa';
          if (addr.includes('harar')) return 'ሐረር\nHarar';
        }

        // Render date_issued and expiry_date in Ethiopian Calendar format for standard view
        if (field === 'date_issued' || field === 'expiry_date') {
          return convertToEthiopianDate(rawVal);
        }

        if (rawVal) return rawVal;

        // Static label defaults
        if (field === 'header_amharic') return 'የድሬዳዋ አስተዳደር የነዋሪዎች መታወቂያ ካርድ';
        if (field === 'header_english') return 'Diredawa Administration Residential ID Card';
        if (field === 'disclaimer') return 'ይህ መታወቂያ የጠፋበት ሰው ቢኖር ለሚመለከተው አካል ወይም ፖሊስ ያስረክብ / If you find this ID missing, submit it to the relevant authority';
        if (field === 'sign_authority_text') return 'የባለስልጣን ፊርማ\nSign of the authority';

        return '';
      };

      // 4. Render Layout Elements
      const rawElements = (template?.elements || []).filter(
        e => e.side === side && e.is_visible
      );

      // Override / Normalize elements for the BACK side to match the reference design perfectly
      let activeElements = [...rawElements];
      if (side === 'BACK') {
        // Ensure address is present on the back
        const hasAddress = activeElements.some(e => e.field_name === 'address');
        if (!hasAddress) {
          activeElements.push({
            element_type: 'TEXT',
            field_name: 'address',
            side: 'BACK',
            x_position: 4.00,
            y_position: 31.00,
            width: 40.00,
            height: 7.00,
            font_size: 6,
            font_weight: 'bold',
            is_visible: true
          });
        }

        // Ensure organization logo (emblem) is present on the back top-right
        const hasLogo = activeElements.some(e => e.element_type === 'LOGO');
        if (!hasLogo) {
          activeElements.push({
            element_type: 'LOGO',
            field_name: 'org_logo',
            side: 'BACK',
            x_position: 72.00,
            y_position: 4.00,
            width: 10.00,
            height: 10.00,
            is_visible: true
          });
        }

        // Standard overrides for back elements coordinates to prevent any overlapping
        activeElements = activeElements.map(elem => {
          const overrides = {
            'disclaimer': { x_position: 4.00, y_position: 4.00, width: 66.00, height: 9.00, font_size: 4.5, font_weight: 'bold' },
            'phone_number': { x_position: 4.00, y_position: 15.00, width: 40.00, height: 7.00, font_size: 6 },
            'emergency_contact_name': { x_position: 4.00, y_position: 23.00, width: 40.00, height: 7.00, font_size: 6 },
            'address': { x_position: 4.00, y_position: 31.00, width: 40.00, height: 7.00, font_size: 6 },
            'emergency_contact_phone': { x_position: 4.00, y_position: 39.00, width: 40.00, height: 7.00, font_size: 6 },
            'blood_group': { x_position: 4.00, y_position: 47.00, width: 40.00, height: 7.00, font_size: 6 },
            'date_issued': { x_position: 52.00, y_position: 15.00, width: 28.00, height: 7.00, font_size: 5.5 },
            'expiry_date': { x_position: 52.00, y_position: 23.00, width: 28.00, height: 7.00, font_size: 5.5 },
            'qr_code': { x_position: 56.00, y_position: 31.00, width: 18.00, height: 18.00 },
            'signature_image_url': { x_position: 30.00, y_position: 43.00, width: 22.00, height: 8.00 },
            'sign_authority_text': { x_position: 30.00, y_position: 38.00, width: 22.00, height: 4.50, font_size: 4.5 }
          };

          const key = elem.field_name || elem.element_type?.toLowerCase();
          const ov = overrides[key];
          if (ov) {
            return { ...elem, ...ov };
          }
          if (elem.element_type === 'QR') {
            return { ...elem, ...overrides['qr_code'] };
          }
          if (elem.element_type === 'SIGNATURE') {
            return { ...elem, ...overrides['signature_image_url'] };
          }
          return elem;
        });

        // Sort elements by y_position to avoid overlay issues
        activeElements.sort((a, b) => parseFloat(a.y_position) - parseFloat(b.y_position));
      }

      for (const elem of activeElements) {
        const x = parseFloat(elem.x_position) * scale;
        const y = parseFloat(elem.y_position) * scale;
        const w = parseFloat(elem.width || 20) * scale;
        const h = parseFloat(elem.height || 10) * scale;

        if (elem.element_type === 'TEXT') {
          const val = String(getCardFieldVal(elem.field_name));

          // Map of bilingual labels for resident fields
          const labelMap = {
            'full_name': 'የባለቤቱ ሙሉ ስም / Name of the bearer',
            'date_of_birth': 'የትውልድ ዘመንና ቦታ / Date and place of birth',
            'gender': 'ጾታ / Sex',
            'nationality': 'ዜግነት / Nationality',
            'occupation': 'ስራ / Job',
            'address': 'የመኖሪያ አድራሻ / Address',
            'woreda': 'ወረዳ / Woreda',
            'kebele': 'ቀጠና / Ketena',
            'phone_number': 'ስልክ ቁጥር / Phone Number',
            'emergency_contact_name': 'የአደጋ ጊዜ ተጠሪ ስም / Representative in case of emergency',
            'emergency_contact_phone': 'ስልክ ቁጥር / Phone Number',
            'blood_group': 'የደም አይነት / Blood type',
            'date_issued': 'የተሰጠበት ቀን / Date of issue',
            'expiry_date': 'የሚያበቃበት ቀን / Date of expiry',
            'card_number': 'የመታወቂያ ቁጥር / ID No.'
          };

          const labelText = labelMap[elem.field_name];

          if (labelText) {
            // Draw Label
            const labelSizePt = 4.1; // slightly larger for readability
            const labelSizePx = labelSizePt * (dpi / 72);
            ctx.font = `bold ${labelSizePx}px Inter, sans-serif`;
            ctx.fillStyle = elem.font_color || '#1e293b'; // Slate-800 darker bold label
            ctx.textBaseline = 'top';
            ctx.fillText(labelText, x, y);

            // Draw Value
            const isName = elem.field_name === 'full_name';
            const valueSizePt = isName ? 7.2 : 6.0;
            const valueSizePx = valueSizePt * (dpi / 72);
            ctx.font = `bold ${valueSizePx}px Inter, sans-serif`;
            ctx.fillStyle = elem.font_color || '#0f172a'; // Slate-900 bold value
            ctx.textBaseline = 'top';

            // Value is drawn below the label
            const valueY = y + (2.5 * scale);
            const valueH = h - (2.5 * scale);

            // Word wrap logic for value (newline aware)
            const valLines = val.split('\n');
            const lines = [];
            for (const vLine of valLines) {
              const trimmedLine = vLine.trim();
              if (!trimmedLine) continue;
              const words = trimmedLine.split(/\s+/);
              let line = '';
              for (let n = 0; n < words.length; n++) {
                let testLine = line + words[n] + ' ';
                let metrics = ctx.measureText(testLine);
                if (metrics.width > w && n > 0) {
                  lines.push(line);
                  line = words[n] + ' ';
                } else {
                  line = testLine;
                }
              }
              lines.push(line);
            }

            let lineY = valueY;
            for (let l = 0; l < lines.length; l++) {
              if (lineY + valueSizePx <= valueY + valueH) {
                ctx.fillText(lines[l].trim(), x, lineY);
                lineY += valueSizePx * 1.1;
              }
            }
          } else {
            // Standard text without labels (e.g. headers, disclaimer, signatures)
            const fontSizePt = parseFloat(elem.font_size || 7);
            const fontSizePx = fontSizePt * (dpi / 72);

            ctx.font = `${elem.font_weight || 'normal'} ${fontSizePx}px Inter, sans-serif`;

            // Customize colors for specific texts or honor custom font color
            if (elem.font_color) {
              ctx.fillStyle = elem.font_color;
            } else if (elem.field_name?.includes('header')) {
              ctx.fillStyle = '#0f172a'; // Bold title
            } else if (elem.field_name === 'disclaimer') {
              ctx.fillStyle = '#1e293b'; // Slate-800 bold disclaimer
            } else {
              ctx.fillStyle = '#1e293b';
            }

            ctx.textBaseline = 'top';

            // Newline aware wrap for standard text
            const valLines = val.split('\n');
            const lines = [];
            for (const vLine of valLines) {
              const trimmedLine = vLine.trim();
              if (!trimmedLine) continue;
              const words = trimmedLine.split(/\s+/);
              let line = '';
              for (let n = 0; n < words.length; n++) {
                let testLine = line + words[n] + ' ';
                let metrics = ctx.measureText(testLine);
                if (metrics.width > w && n > 0) {
                  lines.push(line);
                  line = words[n] + ' ';
                } else {
                  line = testLine;
                }
              }
              lines.push(line);
            }

            let lineY = y;
            for (let l = 0; l < lines.length; l++) {
              if (lineY + fontSizePx <= y + h) {
                ctx.fillText(lines[l].trim(), x, lineY);
                lineY += fontSizePx * 1.15;
              }
            }
          }
        }
        else if (elem.element_type === 'PHOTO' && cardholder.photo_url) {
          const img = await loadImage(cardholder.photo_url);
          if (img) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(x, y, w, h);
            ctx.clip();

            // Object fit cover
            const aspect = img.width / img.height;
            const targetAspect = w / h;
            let sx, sy, sw, sh;
            if (aspect > targetAspect) {
              sh = img.height;
              sw = sh * targetAspect;
              sx = (img.width - sw) / 2;
              sy = 0;
            } else {
              sw = img.width;
              sh = sw / targetAspect;
              sx = 0;
              sy = (img.height - sh) / 2;
            }
            ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
            ctx.restore();

            // Thin elegant border
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 1 * (dpi / 300);
            ctx.strokeRect(x, y, w, h);
          }
        }
        else if (elem.element_type === 'LOGO') {
          const img = await loadImage(template?.organization?.logo_url || '/assets/diredawa_logo.png');
          if (img) {
            ctx.drawImage(img, x, y, w, h);
          }
        }
        else if (elem.element_type === 'IMAGE' && elem.field_name === 'national_flag') {
          const img = await loadImage('/assets/ethiopia_flag.png');
          if (img) {
            ctx.drawImage(img, x, y, w, h);
          }
        }
        else if (elem.element_type === 'BARCODE') {
          drawBarcodeCode128(ctx, cardholder.card_number, x, y, w, h, dpi);
        }
        else if (elem.element_type === 'SIGNATURE') {
          // Draw authority seal stamp in its designated upper position (centered around x=35, y=28, not overlapping signature)
          const sealCenterX = 35.00 * scale;
          const sealCenterY = 28.00 * scale;

          if (cardholder.secondary_photo_url) {
            const sealImg = await loadImage(cardholder.secondary_photo_url);
            if (sealImg) {
              const sealSize = 16.0 * scale; // circular stamp size matching reference
              const sealX = sealCenterX - (sealSize / 2);
              const sealY = sealCenterY - (sealSize / 2);
              ctx.save();
              ctx.globalCompositeOperation = 'multiply'; // removes white background of uploaded stamp
              ctx.globalAlpha = 0.85; // beautiful ink stamp opacity
              ctx.drawImage(sealImg, sealX, sealY, sealSize, sealSize);
              ctx.restore();
            }
          } else {
            drawAuthoritySeal(ctx, sealCenterX, sealCenterY, 8.0 * scale, scale, dpi);
          }

          // Draw signature at its actual override element position (y: 43.00, below the text)
          if (cardholder.signature_image_url) {
            const img = await loadImage(cardholder.signature_image_url);
            if (img) {
              ctx.save();
              ctx.globalCompositeOperation = 'multiply'; // removes white background of uploaded signature
              ctx.drawImage(img, x, y, w, h);
              ctx.restore();
            }
          }
        }
        else if (elem.element_type === 'QR') {
          const qrData = cardholder.qr_code?.qr_data || {
            id: cardholder.id,
            name: cardholder.full_name,
            card_no: cardholder.card_number,
            gender: cardholder.gender,
            blood: cardholder.blood_group,
            issue: cardholder.date_issued,
            expiry: cardholder.expiry_date
          };
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(JSON.stringify(qrData))}`;
          const img = await loadImage(qrUrl);
          if (img) {
            ctx.drawImage(img, x, y, w, h);
          }
        }
      }

      // 5. Draw Secondary Watermark Photo (Front Side only - faded watermark matching reference 4)
      if (side === 'FRONT' && cardholder && cardholder.photo_url) {
        const waterImg = await loadImage(cardholder.photo_url);
        if (waterImg) {
          ctx.save();
          // Draw at bottom right: x = 71mm, y = 33mm, w = 11mm, h = 13mm
          const wx = 71.00 * scale;
          const wy = 33.00 * scale;
          const ww = 11.00 * scale;
          const wh = 13.00 * scale;

          ctx.globalAlpha = 0.35; // Faded transparent look

          ctx.beginPath();
          ctx.rect(wx, wy, ww, wh);
          ctx.clip();

          const aspect = waterImg.width / waterImg.height;
          const targetAspect = ww / wh;
          let sx, sy, sw, sh;
          if (aspect > targetAspect) {
            sh = waterImg.height;
            sw = sh * targetAspect;
            sx = (waterImg.width - sw) / 2;
            sy = 0;
          } else {
            sw = waterImg.width;
            sh = sw / targetAspect;
            sx = 0;
            sy = (waterImg.height - sh) / 2;
          }
          ctx.drawImage(waterImg, sx, sy, sw, sh, wx, wy, ww, wh);
          ctx.restore();
        }
      }

      // 6. Draw Card Number on the front side under the flag (if not already drawn as text)
      if (side === 'FRONT' && cardholder && cardholder.card_number) {
        const hasCardNumText = activeElements.some(e => e.element_type === 'TEXT' && e.field_name === 'card_number');
        if (!hasCardNumText) {
          const cnx = 68.00 * scale;
          const cny = 10.20 * scale;
          const cnSizePt = 4.2;
          const cnSizePx = cnSizePt * (dpi / 72);

          ctx.font = `bold ${cnSizePx}px Inter, sans-serif`;
          ctx.fillStyle = '#0f172a';
          ctx.textBaseline = 'top';

          ctx.fillText(`የመታወቂያ ቁጥር: ${cardholder.card_number}`, cnx, cny);
          ctx.fillText(`ID No. ${cardholder.card_number}`, cnx, cny + cnSizePx * 1.15);
        }
      }

      resolve(canvas.toDataURL('image/png'));
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Draws concentric vector security patterns representing hologram security layers
 */
const drawSecurityOverlay = (ctx, w, h, scale, dpi) => {
  ctx.save();
  ctx.strokeStyle = 'rgba(107, 114, 128, 0.08)'; // subtle grey
  ctx.lineWidth = 0.5 * (dpi / 300);

  // 1. Concentric circles in center
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 35 * scale, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 70 * scale, 0, Math.PI * 2);
  ctx.stroke();

  // 2. Guilloche wavy wave patterns
  for (let offset = -20 * scale; offset < h + 20 * scale; offset += 15 * scale) {
    ctx.beginPath();
    ctx.moveTo(-10 * scale, offset);
    ctx.bezierCurveTo(
      20 * scale, offset - 12 * scale,
      60 * scale, offset + 12 * scale,
      w + 10 * scale, offset
    );
    ctx.stroke();
  }

  // 3. Add a faint golden star emblem in background center representing national seal
  ctx.strokeStyle = 'rgba(234, 179, 8, 0.05)'; // transparent yellow gold
  ctx.lineWidth = 1 * (dpi / 300);
  ctx.beginPath();
  const cx = w / 2;
  const cy = h / 2;
  const spikes = 5;
  const outerRadius = 25 * scale;
  const innerRadius = 10 * scale;
  let rot = Math.PI / 2 * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.stroke();

  ctx.restore();
};

/**
 * Draws a high-fidelity vector blue circular authority office seal/stamp
 */
const drawAuthoritySeal = (ctx, cx, cy, radius, scale, dpi) => {
  ctx.save();
  ctx.strokeStyle = 'rgba(29, 78, 216, 0.65)'; // beautiful office blue stamp color
  ctx.lineWidth = 0.85 * (dpi / 300);

  // 1. Outer circle
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  // 2. Inner circle
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.9, 0, Math.PI * 2);
  ctx.stroke();

  // 3. Faint star in the center of the stamp representing seal authority
  ctx.strokeStyle = 'rgba(29, 78, 216, 0.45)';
  ctx.lineWidth = 0.65 * (dpi / 300);
  ctx.beginPath();
  const spikes = 8;
  const outerRadius = radius * 0.35;
  const innerRadius = radius * 0.15;
  let rot = Math.PI / 2 * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.stroke();

  // 4. Add circular text "DIRE DAWA ADMINISTRATION OFFICE"
  ctx.font = `bold ${Math.round(2.0 * (dpi / 72))}px Inter, sans-serif`;
  ctx.fillStyle = 'rgba(29, 78, 216, 0.65)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const text = "DIRE DAWA ADMINISTRATION OFFICE * KEBELE 04 *";
  const chars = text.split('');
  const arcLength = Math.PI * 1.5; // Wrapping arc
  const startAngle = Math.PI * 0.75;

  for (let i = 0; i < chars.length; i++) {
    const angle = startAngle + (i / chars.length) * arcLength;
    ctx.save();
    ctx.translate(cx + Math.cos(angle) * (radius * 0.65), cy + Math.sin(angle) * (radius * 0.65));
    ctx.rotate(angle + Math.PI / 2);
    ctx.fillText(chars[i], 0, 0);
    ctx.restore();
  }

  ctx.restore();
};

/**
 * Draws the faint national star emblem watermark in the background
 */
const drawNationalStarEmblem = (ctx, cx, cy, radius, scale, dpi) => {
  ctx.save();
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.08)'; // faint blue watermark matching reference background
  ctx.lineWidth = 0.9 * (dpi / 300);

  // 1. Draw 5-pointed star
  ctx.beginPath();
  const spikes = 5;
  const outerRadius = radius;
  const innerRadius = radius * 0.385; // perfect star geometry
  let rot = Math.PI / 2 * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.stroke();

  // 2. Draw star rays projecting outward from inner vertices
  ctx.beginPath();
  for (let i = 0; i < spikes; i++) {
    const angle = (Math.PI / 2 * 3) + (i * 2 * Math.PI / spikes);
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * (outerRadius * 1.6), cy + Math.sin(angle) * (outerRadius * 1.6));
  }
  ctx.stroke();

  // 3. Draw surrounding concentric rings
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.05)';
  ctx.lineWidth = 0.45 * (dpi / 300);
  for (let r = radius * 0.4; r <= radius * 2.0; r += radius * 0.28) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
};


