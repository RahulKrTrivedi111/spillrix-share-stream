-- Add missing admin update policy for tracks
CREATE POLICY "Admin can update all tracks" 
ON public.tracks 
FOR UPDATE 
USING (get_current_user_role() = 'admin') 
WITH CHECK (get_current_user_role() = 'admin');