-- Enable realtime for tracks table
ALTER TABLE public.tracks REPLICA IDENTITY FULL;

-- Add tracks table to realtime publication  
ALTER PUBLICATION supabase_realtime ADD TABLE public.tracks;