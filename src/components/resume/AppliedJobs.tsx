import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2,
  Trash2,
  ExternalLink,
  MapPin,
  Building2,
  RefreshCw,
  Undo2,
  CheckCircle2,
} from "lucide-react";

interface AppliedJobRow {
  id: string;
  created_at: string;
  applied_at: string | null;
  title: string;
  company: string | null;
  location: string | null;
  category: string;
  description: string | null;
  url: string | null;
  source: string | null;
  salary: string | null;
  posted_date: string | null;
}

interface AppliedJobsProps {
  refreshTrigger?: number;
}

export function AppliedJobs({ refreshTrigger }: AppliedJobsProps) {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<AppliedJobRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadJobs = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("job_board")
      .select("*")
      .eq("applied", true)
      .order("applied_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load applied jobs", description: error.message, variant: "destructive" });
    } else {
      setJobs((data ?? []) as AppliedJobRow[]);
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs, refreshTrigger]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("job_board").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    setJobs((prev) => prev.filter((j) => j.id !== id));
  };

  const handleRestore = async (id: string) => {
    const { error } = await supabase
      .from("job_board")
      .update({ applied: false, applied_at: null })
      .eq("id", id);
    if (error) {
      toast({ title: "Couldn't move back", description: error.message, variant: "destructive" });
      return;
    }
    setJobs((prev) => prev.filter((j) => j.id !== id));
    toast({ title: "Moved back to Job Board" });
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-primary" />
              Applied
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Jobs you&apos;ve sent to the Resume &amp; Cover Letter maker, with their application
              links kept in one place.
            </p>
          </div>
          <Button variant="outline" onClick={loadJobs} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : jobs.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-muted-foreground">
            No applied jobs yet. Use <strong>Use for resume + cover letter</strong> on the Job Board
            to send roles here.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {jobs.map((job) => (
            <Card key={job.id} className="p-5 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground leading-tight">{job.title}</h3>
                  {job.company && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Building2 className="h-3.5 w-3.5 shrink-0" />
                      {job.company}
                    </p>
                  )}
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {job.category}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                {job.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {job.location}
                  </span>
                )}
                {job.salary && <span>{job.salary}</span>}
                {job.posted_date && <span>{job.posted_date}</span>}
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t">
                {job.url ? (
                  <Button size="sm" asChild>
                    <a href={job.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-1 h-3.5 w-3.5" /> Application link
                    </a>
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">No application link</span>
                )}
                <Button size="sm" variant="ghost" onClick={() => handleRestore(job.id)}>
                  <Undo2 className="mr-1 h-3.5 w-3.5" /> Back to board
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto text-destructive hover:text-destructive"
                  onClick={() => handleDelete(job.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
