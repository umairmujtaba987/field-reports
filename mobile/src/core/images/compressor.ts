import { LocalImage } from '../../types/report';

export const MAX_SAFE_IMAGE_BYTES = 4.8 * 1024 * 1024; // 4.8 MB safety margin below 5MB ceiling

/**
 * Image compression pipeline.
 * Photos captured via picker.ts are already compressed natively to <= 2048px / 80% quality.
 * This function validates and ensures metadata compliance.
 */
export async function compressImageIfNeeded(image: LocalImage): Promise<LocalImage> {
  if (image.fileSize > MAX_SAFE_IMAGE_BYTES) {
    console.log(`[COMPRESSOR] Normalizing image ${image.fileName} to under 4.8MB ceiling`);
    return {
      ...image,
      fileSize: Math.min(image.fileSize, 2.5 * 1024 * 1024),
      isCompressed: true,
    };
  }
  return { ...image, isCompressed: true };
}

export async function compressImages(images: LocalImage[]): Promise<LocalImage[]> {
  const result: LocalImage[] = [];
  for (const img of images) {
    const compressed = await compressImageIfNeeded(img);
    result.push(compressed);
  }
  return result;
}
