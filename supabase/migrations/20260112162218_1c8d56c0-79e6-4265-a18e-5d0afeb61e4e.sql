-- Create a table for saving complete settings/configurations
CREATE TABLE public.recent_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  style_name TEXT,
  resume_data JSONB,
  jobs_data JSONB,
  example_resume_url TEXT,
  example_coverletter_url TEXT,
  document_type TEXT DEFAULT 'both',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.recent_settings ENABLE ROW LEVEL SECURITY;

-- Create public access policies (no auth)
CREATE POLICY "Allow public read access to recent_settings" 
ON public.recent_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access to recent_settings" 
ON public.recent_settings 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public delete access to recent_settings" 
ON public.recent_settings 
FOR DELETE 
USING (true);