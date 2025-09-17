-- Update RLS policy to allow artists to update rejected tracks back to pending
DROP POLICY IF EXISTS "Artists can update their own tracks" ON public.tracks;

-- Create new policy that allows artists to update their own tracks
CREATE POLICY "Artists can update their own tracks"
ON public.tracks 
FOR UPDATE
USING (auth.uid() = artist_id)
WITH CHECK (auth.uid() = artist_id);

-- Add policy for admins to update any track status  
CREATE POLICY "Admins can update track status"
ON public.tracks
FOR UPDATE
USING (get_current_user_role() = 'admin'::text)
WITH CHECK (get_current_user_role() = 'admin'::text);