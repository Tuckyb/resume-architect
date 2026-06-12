CREATE TABLE public.job_board (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  title text NOT NULL,
  company text,
  location text,
  category text NOT NULL DEFAULT 'AI',
  description text,
  url text,
  source text DEFAULT 'perplexity',
  salary text,
  posted_date text
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_board TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_board TO authenticated;
GRANT ALL ON public.job_board TO service_role;

ALTER TABLE public.job_board ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to job_board" ON public.job_board FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to job_board" ON public.job_board FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to job_board" ON public.job_board FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access to job_board" ON public.job_board FOR DELETE USING (true);

CREATE TRIGGER update_job_board_updated_at BEFORE UPDATE ON public.job_board FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();