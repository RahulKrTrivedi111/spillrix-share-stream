-- Fix RLS policies for tracks table to allow proper SELECT access
-- Current issue: Users can't view their own tracks due to missing SELECT policy

-- Add missing SELECT policies for tracks table
CREATE POLICY "Artists can view their own tracks" 
ON public.tracks 
FOR SELECT 
USING (auth.uid() = artist_id);

CREATE POLICY "Admins can view all tracks" 
ON public.tracks 
FOR SELECT 
USING (get_current_user_role() = 'admin');

-- Add missing DELETE policy for artists to delete their own tracks
CREATE POLICY "Artists can delete their own tracks" 
ON public.tracks 
FOR DELETE 
USING (auth.uid() = artist_id);

-- Fix the function search path issue (from linter)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    CASE 
      WHEN NEW.email = 'linkpointtrivedi480@gmail.com' THEN 'admin'
      ELSE 'artist'
    END
  );
  RETURN NEW;
END;
$function$;

-- Fix the get_current_user_role function search path
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$function$;

-- Add trigger for handle_new_user if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Fix storage bucket structure for tracks to match what's being used
DO $$
BEGIN
  -- Check if tracks bucket exists, if not create it
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'tracks') THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('tracks', 'tracks', true);
  END IF;
END $$;

-- Add storage policies for tracks bucket
CREATE POLICY "Users can view track files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'tracks');

CREATE POLICY "Artists can upload their own track files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'tracks' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Artists can update their own track files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'tracks' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Artists can delete their own track files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'tracks' AND auth.uid()::text = (storage.foldername(name))[1]);