/**
 * Client-side image optimization helper for room, gallery, facility, owner, and student photos.
 * Resizes oversized photos and compresses to WebP (with JPEG fallback) to keep uploads fast and lightweight.
 */

export interface OptimizedImageResult {
  dataUrl: string;
  mimeType: string;
  width: number;
  height: number;
  sizeBytes: number;
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

function estimateBase64Bytes(dataUrl: string): number {
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) return dataUrl.length;
  return Math.ceil(((dataUrl.length - commaIdx - 1) * 3) / 4);
}

/**
 * Optimizes an image File or Data URL by resizing to maxDimension and compressing
 * to WebP (or JPEG when preferJpeg is true, e.g., for universal jsPDF embedding).
 */
export async function optimizeImageFile(
  source: File | string,
  options?: {
    maxDimension?: number;
    quality?: number;
    maxChars?: number;
    preferJpeg?: boolean;
  }
): Promise<OptimizedImageResult> {
  const maxDimension = options?.maxDimension ?? 1080;
  let quality = options?.quality ?? 0.78;
  const maxChars = options?.maxChars ?? 210000;
  const preferJpeg = options?.preferJpeg ?? false;

  const rawDataUrl = typeof source === 'string' ? source : await readFileAsDataUrl(source);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let w = img.naturalWidth || 800;
      let h = img.naturalHeight || 600;

      if (w > maxDimension || h > maxDimension) {
        if (w >= h) {
          h = Math.max(1, Math.round((h * maxDimension) / w));
          w = maxDimension;
        } else {
          w = Math.max(1, Math.round((w * maxDimension) / h));
          h = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context unavailable'));
        return;
      }

      const drawAndEncode = (targetW: number, targetH: number, q: number, mime: string) => {
        canvas.width = targetW;
        canvas.height = targetH;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.drawImage(img, 0, 0, targetW, targetH);
        return canvas.toDataURL(mime, q);
      };

      // Check WebP support if JPEG is not forced
      let targetMime = preferJpeg ? 'image/jpeg' : 'image/webp';
      let resultUrl = drawAndEncode(w, h, quality, targetMime);
      if (targetMime === 'image/webp' && !resultUrl.startsWith('data:image/webp')) {
        targetMime = 'image/jpeg';
        resultUrl = drawAndEncode(w, h, quality, targetMime);
      }

      // Iteratively reduce quality / dimensions if payload exceeds safe target budget
      let currW = w;
      let currH = h;
      while (resultUrl.length > maxChars && quality > 0.42) {
        quality = Number((quality - 0.1).toFixed(2));
        resultUrl = drawAndEncode(currW, currH, quality, targetMime);
      }
      while (resultUrl.length > maxChars && currW > 480) {
        currW = Math.round(currW * 0.78);
        currH = Math.round(currH * 0.78);
        resultUrl = drawAndEncode(currW, currH, quality, targetMime);
      }

      resolve({
        dataUrl: resultUrl,
        mimeType: targetMime,
        width: currW,
        height: currH,
        sizeBytes: estimateBase64Bytes(resultUrl),
      });
    };
    img.onerror = () => reject(new Error('Invalid image file'));
    img.src = rawDataUrl;
  });
}

/**
 * Resolves natural dimensions of an image Data URL so PDF placement preserves exact aspect ratio.
 */
export function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth || 350,
        height: img.naturalHeight || 450,
      });
    };
    img.onerror = () => resolve({ width: 350, height: 450 });
    img.src = dataUrl;
  });
}
