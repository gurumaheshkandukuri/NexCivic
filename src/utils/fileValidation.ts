// NexCivic File Upload Validation & Canvas Image Compressor (Hardened)

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB limit
const COMPRESSION_THRESHOLD_BYTES = 1 * 1024 * 1024; // 1MB threshold

/**
 * Validates image file type, size, extension, double extension, 0-byte check, and corruption check
 */
export async function validateImageFile(file: File): Promise<FileValidationResult> {
  if (!file) {
    return { isValid: false, error: "No file provided." };
  }

  // 1. 0-Byte Check
  if (file.size === 0) {
    return { isValid: false, error: "Empty 0-byte file detected." };
  }

  // 2. Size Check (> 5MB)
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { 
      isValid: false, 
      error: `File size exceeds 5MB limit (${(file.size / (1024 * 1024)).toFixed(2)} MB).` 
    };
  }

  // 3. Double Extension / Fake Extension Check (e.g., photo.png.exe)
  const nameParts = file.name.split(".");
  if (nameParts.length > 2) {
    const dangerousExts = ["exe", "bat", "cmd", "sh", "php", "js", "html", "svg", "gif"];
    const hasForbiddenInnerExt = nameParts.some((part, idx) => 
      idx > 0 && idx < nameParts.length - 1 && dangerousExts.includes(part.toLowerCase())
    );
    if (hasForbiddenInnerExt) {
      return { 
        isValid: false, 
        error: "Forbidden double extension file name detected (e.g. photo.png.exe)." 
      };
    }
  }

  // 4. Exact Extension Check
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { 
      isValid: false, 
      error: "Invalid file extension. Executable, SVG, GIF, or unknown files are strictly rejected." 
    };
  }

  // 5. MIME Type Check
  if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
    return { 
      isValid: false, 
      error: "Invalid file type. Only JPG, PNG, and WebP images are allowed." 
    };
  }

  // 6. Corrupted Image & Dimension Check via Image Element
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      if (img.width === 0 || img.height === 0) {
        resolve({ isValid: false, error: "Corrupted image file (invalid zero dimensions)." });
      } else {
        resolve({ isValid: true });
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ isValid: false, error: "Corrupted or unreadable image file." });
    };

    img.src = objectUrl;
  });
}

/**
 * Compresses an image file using Canvas API ONLY if size > 1MB
 */
export async function compressImageIfNeeded(
  file: File, 
  maxWidth: number = 1920, 
  maxHeight: number = 1080, 
  quality: number = 0.8
): Promise<File> {
  // Only compress if larger than 1MB
  if (file.size <= COMPRESSION_THRESHOLD_BYTES) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.width;
      let height = img.height;

      // Preserve aspect ratio
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      if (height > maxHeight) {
        width = Math.round((width * maxHeight) / height);
        height = maxHeight;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: "image/jpeg",
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };

    img.src = objectUrl;
  });
}

export const compressImage = compressImageIfNeeded;
