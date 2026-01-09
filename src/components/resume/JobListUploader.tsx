import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Upload,
  FileSpreadsheet,
  Briefcase,
  MapPin,
  Building2,
  ExternalLink,
  Plus,
  Trash2,
} from "lucide-react";
import { JobTarget } from "@/types/resume";
import { useToast } from "@/hooks/use-toast";

interface JobListUploaderProps {
  jobs: JobTarget[];
  onJobsChange: (jobs: JobTarget[]) => void;
}

export function JobListUploader({ jobs, onJobsChange }: JobListUploaderProps) {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualJob, setManualJob] = useState<Partial<JobTarget>>({
    companyName: "",
    position: "",
    jobDescription: "",
    location: "",
  });

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        await processCSV(files[0]);
      }
    },
    [jobs]
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processCSV(files[0]);
    }
  };

  const processCSV = async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file.",
        variant: "destructive",
      });
      return;
    }

    try {
      const text = await file.text();
      const parsedJobs = parseCSV(text);
      onJobsChange([...jobs, ...parsedJobs]);
      toast({
        title: "Jobs Imported",
        description: `Added ${parsedJobs.length} jobs from CSV.`,
      });
    } catch (error) {
      console.error("CSV parsing error:", error);
      toast({
        title: "Parsing Failed",
        description: "Failed to parse the CSV. Please check the format.",
        variant: "destructive",
      });
    }
  };

  const parseCSV = (csvText: string): JobTarget[] => {
    const lines = csvText.split("\n").filter((line) => line.trim());
    if (lines.length < 2) return [];

    // Parse header to find column indices
    const header = parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim());
    
    // Common column name mappings
    const columnMap: Record<string, string[]> = {
      companyName: ["company", "companyname", "company_name", "employer"],
      position: ["title", "position", "job_title", "jobtitle", "role"],
      jobDescription: ["descriptiontext", "description", "job_description", "jobdescription", "descriptionhtml"],
      location: ["location", "city", "place"],
      companyUrl: ["companyurl", "company_url", "url", "link"],
      workType: ["worktype", "work_type", "type", "employment_type"],
      seniority: ["seniority", "level", "experience_level"],
      postedAt: ["postedat", "posted_at", "date", "posted_date"],
    };

    const getColumnIndex = (fieldName: string): number => {
      const possibleNames = columnMap[fieldName] || [fieldName];
      for (const name of possibleNames) {
        const index = header.indexOf(name);
        if (index !== -1) return index;
      }
      return -1;
    };

    const indices = {
      company: getColumnIndex("companyName"),
      position: getColumnIndex("position"),
      description: getColumnIndex("jobDescription"),
      location: getColumnIndex("location"),
      companyUrl: getColumnIndex("companyUrl"),
      workType: getColumnIndex("workType"),
      seniority: getColumnIndex("seniority"),
      postedAt: getColumnIndex("postedAt"),
    };

    const parsedJobs: JobTarget[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      
      const companyName = indices.company >= 0 ? values[indices.company]?.trim() : "";
      const position = indices.position >= 0 ? values[indices.position]?.trim() : "";
      
      if (!companyName && !position) continue;

      parsedJobs.push({
        id: `job-${Date.now()}-${i}`,
        companyName: companyName || "Unknown Company",
        position: position || "Unknown Position",
        jobDescription: indices.description >= 0 ? cleanDescription(values[indices.description]) : "",
        location: indices.location >= 0 ? values[indices.location]?.trim() : undefined,
        companyUrl: indices.companyUrl >= 0 ? values[indices.companyUrl]?.trim() : undefined,
        workType: indices.workType >= 0 ? values[indices.workType]?.trim() : undefined,
        seniority: indices.seniority >= 0 ? values[indices.seniority]?.trim() : undefined,
        postedAt: indices.postedAt >= 0 ? values[indices.postedAt]?.trim() : undefined,
        selected: false,
      });
    }

    return parsedJobs;
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current);

    return result;
  };

  const cleanDescription = (desc: string): string => {
    if (!desc) return "";
    // Remove HTML tags and clean up
    return desc
      .replace(/<[^>]*>/g, " ")
      .replace(/&[^;]+;/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 2000); // Limit length
  };

  const toggleJobSelection = (jobId: string) => {
    onJobsChange(
      jobs.map((job) =>
        job.id === jobId ? { ...job, selected: !job.selected } : job
      )
    );
  };

  const selectAll = () => {
    onJobsChange(jobs.map((job) => ({ ...job, selected: true })));
  };

  const deselectAll = () => {
    onJobsChange(jobs.map((job) => ({ ...job, selected: false })));
  };

  const removeJob = (jobId: string) => {
    onJobsChange(jobs.filter((job) => job.id !== jobId));
  };

  const addManualJob = () => {
    if (!manualJob.companyName || !manualJob.position) {
      toast({
        title: "Missing Information",
        description: "Please provide at least company name and position.",
        variant: "destructive",
      });
      return;
    }

    const newJob: JobTarget = {
      id: `manual-${Date.now()}`,
      companyName: manualJob.companyName,
      position: manualJob.position,
      jobDescription: manualJob.jobDescription || "",
      location: manualJob.location,
      selected: true,
    };

    onJobsChange([...jobs, newJob]);
    setManualJob({ companyName: "", position: "", jobDescription: "", location: "" });
    setShowManualAdd(false);
    toast({ title: "Job Added", description: "Manual job entry added successfully." });
  };

  const selectedCount = jobs.filter((j) => j.selected).length;

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Briefcase className="h-5 w-5" />
        Target Jobs
      </h2>
      <p className="text-muted-foreground text-sm mb-4">
        Upload a CSV with job listings or add jobs manually. Select which jobs you want to apply for.
      </p>

      {/* CSV Upload */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors mb-4 ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <FileSpreadsheet className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm text-muted-foreground mb-2">
          Drag and drop a CSV file, or
        </p>
        <label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button variant="outline" size="sm" asChild>
            <span className="cursor-pointer">Browse CSV</span>
          </Button>
        </label>
      </div>

      {/* Manual Add Toggle */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowManualAdd(!showManualAdd)}
        className="mb-4"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Job Manually
      </Button>

      {/* Manual Add Form */}
      {showManualAdd && (
        <div className="border rounded-lg p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="manual-company">Company Name</Label>
              <Input
                id="manual-company"
                value={manualJob.companyName}
                onChange={(e) =>
                  setManualJob({ ...manualJob, companyName: e.target.value })
                }
                placeholder="Company name"
              />
            </div>
            <div>
              <Label htmlFor="manual-position">Position</Label>
              <Input
                id="manual-position"
                value={manualJob.position}
                onChange={(e) =>
                  setManualJob({ ...manualJob, position: e.target.value })
                }
                placeholder="Job title"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="manual-location">Location (optional)</Label>
            <Input
              id="manual-location"
              value={manualJob.location}
              onChange={(e) =>
                setManualJob({ ...manualJob, location: e.target.value })
              }
              placeholder="City, State"
            />
          </div>
          <div>
            <Label htmlFor="manual-description">Job Description</Label>
            <Textarea
              id="manual-description"
              value={manualJob.jobDescription}
              onChange={(e) =>
                setManualJob({ ...manualJob, jobDescription: e.target.value })
              }
              placeholder="Paste the job description here..."
              rows={4}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={addManualJob} size="sm">
              Add Job
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowManualAdd(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Job List */}
      {jobs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {selectedCount} of {jobs.length} jobs selected
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={selectAll}>
                Select All
              </Button>
              <Button variant="ghost" size="sm" onClick={deselectAll}>
                Deselect All
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[300px] border rounded-lg">
            <div className="p-2 space-y-2">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className={`p-3 rounded-lg border transition-colors ${
                    job.selected
                      ? "bg-primary/5 border-primary/30"
                      : "bg-muted/30 border-transparent"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={job.selected}
                      onCheckedChange={() => toggleJobSelection(job.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium truncate">{job.position}</h4>
                        {job.workType && (
                          <span className="text-xs px-2 py-0.5 bg-muted rounded-full">
                            {job.workType}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Building2 className="h-3 w-3" />
                        <span className="truncate">{job.companyName}</span>
                        {job.companyUrl && (
                          <a
                            href={job.companyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      {job.location && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span>{job.location}</span>
                        </div>
                      )}
                      {job.postedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Posted: {job.postedAt}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeJob(job.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </Card>
  );
}
