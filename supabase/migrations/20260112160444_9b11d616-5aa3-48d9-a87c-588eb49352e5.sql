-- Create a table for saved skills (formatting templates/examples)
CREATE TABLE public.skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  example_resume_html TEXT, -- HTML content from example resume PDF
  example_coverletter_html TEXT, -- HTML content from example cover letter PDF
  css_framework TEXT, -- Custom CSS if any
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create a table for saved example resumes (reusable resume data)
CREATE TABLE public.example_resumes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  parsed_data JSONB NOT NULL, -- The parsed resume data (personalInfo, workExperience, etc.)
  original_filename TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security (but allow public access for now since no auth)
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.example_resumes ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since no auth yet)
CREATE POLICY "Allow public read access to skills" 
ON public.skills 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access to skills" 
ON public.skills 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update access to skills" 
ON public.skills 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete access to skills" 
ON public.skills 
FOR DELETE 
USING (true);

CREATE POLICY "Allow public read access to example_resumes" 
ON public.example_resumes 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access to example_resumes" 
ON public.example_resumes 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update access to example_resumes" 
ON public.example_resumes 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete access to example_resumes" 
ON public.example_resumes 
FOR DELETE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_skills_updated_at
BEFORE UPDATE ON public.skills
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_example_resumes_updated_at
BEFORE UPDATE ON public.example_resumes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();