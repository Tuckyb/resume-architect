import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Wand2, Plus, Trash2, Upload, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Skill {
  id: string;
  name: string;
  description: string | null;
  example_resume_html: string | null;
  example_coverletter_html: string | null;
  css_framework: string | null;
  created_at: string;
}

interface SkillsManagerProps {
  selectedSkill: Skill | null;
  onSkillSelect: (skill: Skill | null) => void;
}

export function SkillsManager({ selectedSkill, onSkillSelect }: SkillsManagerProps) {
  const { toast } = useToast();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null);

  const fetchSkills = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("skills")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSkills(data || []);
    } catch (error) {
      console.error("Error fetching skills:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

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

  const handleSaveSkill = async () => {
    if (!formName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for this skill.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      let exampleResumeHtml: string | null = null;
      let exampleCoverLetterHtml: string | null = null;

      // Parse PDF files to get example content
      if (resumeFile) {
        const base64 = await handleFileToBase64(resumeFile);
        const { data, error } = await supabase.functions.invoke("parse-resume-pdf", {
          body: { pdfBase64: base64, fileName: resumeFile.name },
        });
        if (!error && data?.rawText) {
          exampleResumeHtml = data.rawText;
        }
      }

      if (coverLetterFile) {
        const base64 = await handleFileToBase64(coverLetterFile);
        const { data, error } = await supabase.functions.invoke("parse-resume-pdf", {
          body: { pdfBase64: base64, fileName: coverLetterFile.name },
        });
        if (!error && data?.rawText) {
          exampleCoverLetterHtml = data.rawText;
        }
      }

      const { data, error } = await supabase.from("skills").insert({
        name: formName.trim(),
        description: formDescription.trim() || null,
        example_resume_html: exampleResumeHtml,
        example_coverletter_html: exampleCoverLetterHtml,
      }).select().single();

      if (error) throw error;

      toast({
        title: "Skill Saved",
        description: `"${formName}" has been saved successfully.`,
      });

      setSkills([data, ...skills]);
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving skill:", error);
      toast({
        title: "Save Failed",
        description: "Failed to save the skill. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSkill = async (skillId: string) => {
    try {
      const { error } = await supabase.from("skills").delete().eq("id", skillId);
      if (error) throw error;

      setSkills(skills.filter((s) => s.id !== skillId));
      if (selectedSkill?.id === skillId) {
        onSkillSelect(null);
      }

      toast({
        title: "Skill Deleted",
        description: "The skill has been removed.",
      });
    } catch (error) {
      console.error("Error deleting skill:", error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete the skill.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setResumeFile(null);
    setCoverLetterFile(null);
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Wand2 className="h-5 w-5" />
          Skills (Formatting Templates)
        </h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Skill
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Skill</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="skill-name">Name *</Label>
                <Input
                  id="skill-name"
                  placeholder="e.g., Professional Marketing Style"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="skill-description">Description</Label>
                <Textarea
                  id="skill-description"
                  placeholder="Describe this formatting style..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Example Resume PDF (for formatting reference)</Label>
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
              <div className="space-y-2">
                <Label>Example Cover Letter PDF (for formatting reference)</Label>
                <div className="flex items-center gap-2">
                  <label className="flex-1">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setCoverLetterFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <Button variant="outline" asChild className="w-full">
                      <span className="cursor-pointer flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        {coverLetterFile ? coverLetterFile.name : "Upload Cover Letter PDF"}
                      </span>
                    </Button>
                  </label>
                  {coverLetterFile && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCoverLetterFile(null)}
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
              <Button onClick={handleSaveSkill} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Skill"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <p className="text-muted-foreground text-sm mb-4">
        Save formatting templates with example PDFs. The examples will be used as reference for generating styled documents.
      </p>

      <ScrollArea className="h-[200px]">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : skills.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No skills saved yet.</p>
            <p className="text-sm">Click "Add Skill" to create one.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {skills.map((skill) => (
              <div
                key={skill.id}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedSkill?.id === skill.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => onSkillSelect(selectedSkill?.id === skill.id ? null : skill)}
              >
                <div className="flex items-center gap-3">
                  {selectedSkill?.id === skill.id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                  <div>
                    <p className="font-medium">{skill.name}</p>
                    {skill.description && (
                      <p className="text-sm text-muted-foreground">{skill.description}</p>
                    )}
                    <div className="flex gap-2 mt-1">
                      {skill.example_resume_html && (
                        <span className="text-xs bg-muted px-2 py-0.5 rounded">Resume example</span>
                      )}
                      {skill.example_coverletter_html && (
                        <span className="text-xs bg-muted px-2 py-0.5 rounded">Cover letter example</span>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSkill(skill.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
}
