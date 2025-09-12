import { supabase } from "@/integrations/supabase/client";

/**
 * Generates a signed URL from a file path, with fallback bucket support
 */
export async function generateSignedUrl(
  filePath: string, 
  primaryBucket: string, 
  fallbackBucket?: string,
  expiresIn = 3600
): Promise<string | null> {
  // If it's already a full URL, return it
  if (filePath?.startsWith('http')) {
    return filePath;
  }

  if (!filePath) {
    return null;
  }

  try {
    // Try primary bucket first
    const { data, error } = await supabase.storage
      .from(primaryBucket)
      .createSignedUrl(filePath, expiresIn);

    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }

    // Try fallback bucket if provided
    if (fallbackBucket) {
      const { data: fallbackData, error: fallbackError } = await supabase.storage
        .from(fallbackBucket)
        .createSignedUrl(filePath, expiresIn);

      if (!fallbackError && fallbackData?.signedUrl) {
        return fallbackData.signedUrl;
      }
    }

    console.error('Failed to generate signed URL:', error);
    return null;
  } catch (error) {
    console.error('Storage error:', error);
    return null;
  }
}

/**
 * Generates a signed URL specifically for music files
 */
export function generateMusicUrl(filePath: string): Promise<string | null> {
  return generateSignedUrl(filePath, 'music-files', 'tracks');
}

/**
 * Generates a signed URL specifically for cover art
 */
export function generateCoverArtUrl(filePath: string): Promise<string | null> {
  return generateSignedUrl(filePath, 'cover-art', 'tracks');
}