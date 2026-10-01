// NexCivic HTML5 Canvas Difference Hash (dHash) Image Similarity Engine
// Operates 100% locally in browser JS at ZERO COST.

export interface ImageHashComparisonResult {
  similarityPercentage: number;
  differingBits: number;
  isVisualMatch: boolean;
}

/**
 * Calculates Hamming distance (number of differing bits) between two binary hash strings
 */
export function calculateHammingDistance(hash1: string, hash2: string): number {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) {
    return 64; // Maximum difference if hash is missing or invalid
  }
  let count = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) count++;
  }
  return count;
}

/**
 * Compares two 64-bit binary hashes and returns visual match probability
 */
export function compareImageHashes(hash1: string, hash2: string): ImageHashComparisonResult {
  const differingBits = calculateHammingDistance(hash1, hash2);
  const similarityPercentage = Math.max(0, Math.round(((64 - differingBits) / 64) * 100));
  // Hamming distance <= 12 bits out of 64 corresponds to ~81%+ visual match
  const isVisualMatch = differingBits <= 12;

  return {
    similarityPercentage,
    differingBits,
    isVisualMatch
  };
}

/**
 * Generates a 64-bit Difference Hash (dHash) from an HTMLImageElement using offscreen 9x8 Canvas
 */
export function generateDHashFromImage(img: HTMLImageElement): string | null {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 9;
    canvas.height = 8;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0, 9, 8);
    const imageData = ctx.getImageData(0, 0, 9, 8);
    const pixels = imageData.data;

    // Convert pixels to 9x8 luminance array
    const grayscale: number[][] = [];
    for (let y = 0; y < 8; y++) {
      const row: number[] = [];
      for (let x = 0; x < 9; x++) {
        const i = (y * 9 + x) * 4;
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        // Standard ITU-R BT.601 luminance formula
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        row.push(luminance);
      }
      grayscale.push(row);
    }

    // Compare left vs right pixel in each row to generate 64 binary bits
    let hash = "";
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const leftPixel = grayscale[y][x];
        const rightPixel = grayscale[y][x + 1];
        hash += leftPixel > rightPixel ? "1" : "0";
      }
    }

    return hash.length === 64 ? hash : null;
  } catch (err) {
    console.warn("dHash generation warning:", err);
    return null;
  }
}

/**
 * Asynchronously generates 64-bit dHash from an image URL or data URL safely
 */
export function computeImageDHash(imageSrc: string): Promise<string | null> {
  return new Promise((resolve) => {
    if (!imageSrc) {
      resolve(null);
      return;
    }
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const hash = generateDHashFromImage(img);
        resolve(hash);
      };
      img.onerror = () => {
        // Fallback gracefully without breaking calling flow
        resolve(null);
      };
      img.src = imageSrc;
    } catch {
      resolve(null);
    }
  });
}
