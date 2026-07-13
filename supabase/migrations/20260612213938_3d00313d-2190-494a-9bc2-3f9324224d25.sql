ALTER TABLE public.job_board ADD COLUMN IF NOT EXISTS applied boolean NOT NULL DEFAULT false;
ALTER TABLE public.job_board ADD COLUMN IF NOT EXISTS applied_at timestamp with time zone;