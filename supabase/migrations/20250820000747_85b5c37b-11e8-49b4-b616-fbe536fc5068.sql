-- Create handle_new_user function for automatic profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create trigger for automatic profile creation on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for tracks table
ALTER TABLE public.tracks REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.tracks;

-- Enable realtime for profiles table  
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.profiles;