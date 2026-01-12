import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Plus, Trash2, Upload, Check, Loader2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ParsedResumeData } from "@/types/resume";

interface ExampleResume {
  id: string;
  name: string;
  description: string | null;
  parsed_data: ParsedResumeData;
  original_filename: string | null;
  created_at: string;
}

interface ExampleResumesManagerProps {
  onLoadResume: (data: ParsedResumeData) => void;
}

export function ExampleResumesManager({ onLoadResume }: ExampleResumesManagerProps) {
  const { toast } = useToast();
  const [resumes, setResumes] = useState<ExampleResume[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state
  const [formName, setFormName] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const fetchResumes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("example_resumes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setResumes((data || []) as unknown as ExampleResume[]);
    } catch (error) {
      console.error("Error fetching example resumes:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  const handleFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSaveResume = async () => {
    if (!formName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for this resume.",
        variant: "destructive",
      });
      return;
    }

    if (!resumeFile) {
      toast({
        title: "Resume Required",
        description: "Please upload a resume PDF.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      // Parse PDF to get resume data
      const base64 = await handleFileToBase64(resumeFile);
      const { data: parsedData, error: parseError } = await supabase.functions.invoke("parse-resume-pdf", {
        body: { pdfBase64: base64, fileName: resumeFile.name },
      });

      if (parseError) throw parseError;

      const { data, error } = await supabase.from("example_resumes").insert({
        name: formName.trim(),
        parsed_data: parsedData,
        original_filename: resumeFile.name,
      }).select().single();

      if (error) throw error;

      toast({
        title: "Resume Saved",
        description: `"${formName}" has been saved successfully.`,
      });

      setResumes([data as unknown as ExampleResume, ...resumes]);
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving resume:", error);
      toast({
        title: "Save Failed",
        description: "Failed to save the resume. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteResume = async (resumeId: string) => {
    try {
      const { error } = await supabase.from("example_resumes").delete().eq("id", resumeId);
      if (error) throw error;

      setResumes(resumes.filter((r) => r.id !== resumeId));

      toast({
        title: "Resume Deleted",
        description: "The example resume has been removed.",
      });
    } catch (error) {
      console.error("Error deleting resume:", error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete the resume.",
        variant: "destructive",
      });
    }
  };

  const handleLoadResume = (resume: ExampleResume) => {
    onLoadResume(resume.parsed_data);
    toast({
      title: "Resume Loaded",
      description: `"${resume.name}" has been loaded into the form.`,
    });
  };

  const resetForm = () => {
    setFormName("");
    setResumeFile(null);
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Saved Resumes
        </h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Save Current
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Save Example Resume</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="resume-name">Name *</Label>
                <Input
                  id="resume-name"
                  placeholder="e.g., My Marketing Resume"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Resume PDF *</Label>
                <div className="flex items-center gap-2">
                  <label className="flex-1">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <Button variant="outline" asChild className="w-full">
                      <span className="cursor-pointer flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        {resumeFile ? resumeFile.name : "Upload Resume PDF"}
                      </span>
                    </Button>
                  </label>
                  {resumeFile && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setResumeFile(null)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveResume} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Resume"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <p className="text-muted-foreground text-sm mb-4">
        Save your resume data to reuse for future job applications.
      </p>

      <ScrollArea className="h-[200px]">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : resumes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No saved resumes yet.</p>
            <p className="text-sm">Upload a resume to save it for later.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {resumes.map((resume) => (
              <div
                key={resume.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/50 transition-colors"
              >
                <div>
                  <p className="font-medium">{resume.name}</p>
                  {resume.parsed_data?.personalInfo?.fullName && (
                    <p className="text-sm text-muted-foreground">
                      {resume.parsed_data.personalInfo.fullName}
                    </p>
                  )}
                  {resume.original_filename && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {resume.original_filename}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => handleLoadResume(resume)}
                  >
                    <Download className="h-4 w-4" />
                    Load
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteResume(resume.id)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
}
