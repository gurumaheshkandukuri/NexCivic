const Jimp = require('jimp');

Jimp.read('src/assets/branding/official-logo.png').then(img => {
  img.scan(0, 0, img.bitmap.width, img.bitmap.height, function(x, y, idx) {
    let r = this.bitmap.data[idx + 0];
    let g = this.bitmap.data[idx + 1];
    let b = this.bitmap.data[idx + 2];
    
    // The logo uses Navy (#0F1E3A, r:15, g:30, b:58), Teal (#0EA5A4, r:14, g:165, b:164)
    // If a pixel is very bright, it's part of the background or anti-aliasing.
    
    // We can use a technique to extract the dark foreground from the white background
    // Original pixel = alpha * foreground + (1 - alpha) * white (255)
    // C = A * F + (1 - A) * 255
    // So A = (255 - C) / (255 - F)
    // Since F is generally dark, we can approximate A.
    // Let's find the minimum color component to estimate transparency.
    let minColor = Math.min(r, g, b);
    let alpha = 255 - minColor;
    
    if (alpha < 5) {
      // Pure white -> fully transparent
      this.bitmap.data[idx + 3] = 0;
    } else if (alpha < 255) {
      // Partial transparency (anti-aliasing edge)
      // Reconstruct original foreground color: F = (C - 255 + A * 255) / A
      // Since A = 255 - minColor, it's normalized to 0-1.
      let A_norm = alpha / 255;
      this.bitmap.data[idx + 0] = Math.max(0, Math.min(255, (r - 255 * (1 - A_norm)) / A_norm));
      this.bitmap.data[idx + 1] = Math.max(0, Math.min(255, (g - 255 * (1 - A_norm)) / A_norm));
      this.bitmap.data[idx + 2] = Math.max(0, Math.min(255, (b - 255 * (1 - A_norm)) / A_norm));
      this.bitmap.data[idx + 3] = alpha;
    }
    // If alpha == 255 (minColor == 0), keep fully opaque.
  });
  
  img.write('src/assets/branding/official-logo-transparent.png', () => {
      console.log('Saved transparent logo');
  });
}).catch(err => console.error(err));
