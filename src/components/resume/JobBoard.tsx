import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { JobTarget } from "@/types/resume";
import {
  Sparkles,
  Loader2,
  Trash2,
  ExternalLink,
  MapPin,
  Building2,
  Plus,
  RefreshCw,
} from "lucide-react";

interface JobBoardRow {
  id: string;
  created_at: string;
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

interface JobBoardProps {
  onAddToTargets?: (jobs: JobTarget[]) => void;
  onSwitchTab?: (tab: string) => void;
}

export function JobBoard({ onAddToTargets, onSwitchTab }: JobBoardProps) {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<JobBoardRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isResearching, setIsResearching] = useState(false);
  const [filter, setFilter] = useState<"all" | "AI" | "Marketing">("all");

  const loadJobs = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("job_board")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load job board", description: error.message, variant: "destructive" });
    } else {
      setJobs((data ?? []) as JobBoardRow[]);
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleResearch = async () => {
    setIsResearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("research-jobs", {
        body: { categories: ["AI", "Marketing"] },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({
        title: "Research complete",
        description: `Added ${data?.inserted ?? 0} new job${data?.inserted === 1 ? "" : "s"} to your board.`,
      });
      await loadJobs();
    } catch (err) {
      toast({
        title: "Research failed",
        description: err instanceof Error ? err.message : "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setIsResearching(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("job_board").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    setJobs((prev) => prev.filter((j) => j.id !== id));
  };

  const handleAddToTargets = (job: JobBoardRow) => {
    const target: JobTarget = {
      id: `board-${job.id}`,
      companyName: job.company ?? "Unknown company",
      companyUrl: job.url ?? undefined,
      position: job.title,
      jobDescription: job.description ?? "",
      location: job.location ?? undefined,
      selected: true,
    };
    onAddToTargets?.([target]);
    toast({ title: "Added to targets", description: `${job.title} is ready in Setup.` });
    onSwitchTab?.("setup");
  };

  const filtered = filter === "all" ? jobs : jobs.filter((j) => j.category === filter);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Job Board</h2>
            <p className="text-muted-foreground text-sm mt-1">
              AI-researched roles in the AI &amp; Marketing space, saved permanently so nothing
              disappears.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadJobs} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button onClick={handleResearch} disabled={isResearching}>
              {isResearching ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              {isResearching ? "Researching…" : "Research jobs (AI + Marketing)"}
            </Button>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          {(["all", "AI", "Marketing"] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "All" : f}
              <span className="ml-1.5 opacity-70">
                {f === "all" ? jobs.length : jobs.filter((j) => j.category === f).length}
              </span>
            </Button>
          ))}
        </div>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-muted-foreground">
            No jobs yet. Click <strong>Research jobs</strong> to populate your board.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((job) => (
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

              {job.description && (
                <p className="text-sm text-muted-foreground mt-3 line-clamp-4 flex-1">
                  {job.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t">
                <Button size="sm" variant="outline" onClick={() => handleAddToTargets(job)}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Use for resume
                </Button>
                {job.url && (
                  <Button size="sm" variant="ghost" asChild>
                    <a href={job.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-1 h-3.5 w-3.5" /> View
                    </a>
                  </Button>
                )}
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
