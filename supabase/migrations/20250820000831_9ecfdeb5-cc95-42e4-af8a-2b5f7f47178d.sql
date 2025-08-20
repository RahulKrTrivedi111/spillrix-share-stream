-- Enable realtime for tracks table (if not already enabled)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'tracks') THEN
        ALTER publication supabase_realtime ADD TABLE public.tracks;
    END IF;
END
$$;

-- Enable realtime for profiles table (if not already enabled)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'profiles') THEN
        ALTER publication supabase_realtime ADD TABLE public.profiles;
    END IF;
END
$$;