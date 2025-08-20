-- Create security definer function to safely check user roles
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Drop all existing problematic policies on profiles
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable all access for admin users" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Create clean, non-recursive policies for profiles
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Admin policy using security definer function (non-recursive)
CREATE POLICY "Admins can access all profiles" 
ON public.profiles 
FOR ALL 
USING (public.get_current_user_role() = 'admin');

-- Drop and recreate tracks policies using the same function
DROP POLICY IF EXISTS "Admin can view all tracks" ON public.tracks;

-- Recreate admin policy for tracks using security definer function
CREATE POLICY "Admin can view all tracks" 
ON public.tracks 
FOR SELECT 
USING (public.get_current_user_role() = 'admin');