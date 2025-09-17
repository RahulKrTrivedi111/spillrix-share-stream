-- Make the cover-art bucket public so images can be displayed
UPDATE storage.buckets 
SET public = true 
WHERE id = 'cover-art';

-- Create RLS policy to allow public read access to cover art images
CREATE POLICY "Public read access for cover art" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'cover-art');