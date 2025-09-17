-- Add soft delete columns to tracks table
ALTER TABLE public.tracks 
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN deleted_by UUID REFERENCES public.profiles(id);