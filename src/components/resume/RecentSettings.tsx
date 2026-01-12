import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Clock, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ParsedResumeData, JobTarget } from "@/types/resume";

interface RecentSetting {
  id: string;
  name: string;
  style_name: string | null;
  resume_data: ParsedResumeData | null;
  jobs_data: JobTarget[] | null;
  example_resume_url: string | null;
  example_coverletter_url: string | null;
  document_type: string | null;
  created_at: string;
}

interface RecentSettingsProps {
  onLoadSettings: (settings: {
    resumeData: ParsedResumeData | null;
    jobs: JobTarget[];
    documentType: "resume" | "cover-letter" | "both";
  }) => void;
  refreshTrigger?: number;
}

export function RecentSettings({ onLoadSettings, refreshTrigger }: RecentSettingsProps) {
  const { toast } = useToast();
  const [recentSettings, setRecentSettings] = useState<RecentSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRecentSettings();
  }, [refreshTrigger]);

  const fetchRecentSettings = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("recent_settings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error fetching recent settings:", error);
    } else {
      // Cast the data to our expected type
      const typedData = (data || []).map((item: any) => ({
        ...item,
        resume_data: item.resume_data as ParsedResumeData | null,
        jobs_data: item.jobs_data as JobTarget[] | null,
      }));
      setRecentSettings(typedData);
    }
    setIsLoading(false);
  };

  const handleLoadSettings = (setting: RecentSetting) => {
    onLoadSettings({
      resumeData: setting.resume_data,
      jobs: setting.jobs_data || [],
      documentType: (setting.document_type as "resume" | "cover-letter" | "both") || "both",
    });
    toast({
      title: "Settings Loaded",
      description: `Loaded settings for "${setting.name}"`,
    });
  };

  const handleClearRecent = async () => {
    const { error } = await supabase.from("recent_settings").delete().neq("id", "");

    if (error) {
      toast({
        title: "Error",
        description: "Failed to clear recent settings",
        variant: "destructive",
      });
    } else {
      setRecentSettings([]);
      toast({
        title: "Cleared",
        description: "All recent settings have been cleared",
      });
    }
  };

  const getTargetPreview = (jobs: JobTarget[] | null): string => {
    if (!jobs || jobs.length === 0) return "No jobs selected";
    const selectedJobs = jobs.filter((j) => j.selected);
    if (selectedJobs.length === 0) return "No jobs selected";
    const firstJob = selectedJobs[0];
    const preview = `Target: ${firstJob.position || firstJob.companyName}`;
    return preview.length > 40 ? preview.substring(0, 37) + "..." : preview;
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold text-foreground mb-2 flex items-center gap-2">
        <Clock className="h-5 w-5" />
        Recent Settings
      </h2>
      <p className="text-muted-foreground text-sm mb-4">
        Click any item to load its settings
      </p>

      <ScrollArea className="h-[300px] mb-4">
        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">Loading...</div>
        ) : recentSettings.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No recent settings saved yet.
          </div>
        ) : (
          <div className="space-y-2 pr-4">
            {recentSettings.map((setting) => (
              <button
                key={setting.id}
                onClick={() => handleLoadSettings(setting)}
                className="w-full text-left p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="font-medium text-foreground">{setting.name}</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  {setting.style_name && (
                    <span className="text-primary">{setting.style_name}</span>
                  )}
                  {setting.style_name && <span>•</span>}
                  <span>{format(new Date(setting.created_at), "dd/MM/yyyy")}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1 truncate">
                  {getTargetPreview(setting.jobs_data)}
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>

      {recentSettings.length > 0 && (
        <Button
          variant="outline"
          className="w-full"
          onClick={handleClearRecent}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Clear Recent
        </Button>
      )}
    </Card>
  );
}
