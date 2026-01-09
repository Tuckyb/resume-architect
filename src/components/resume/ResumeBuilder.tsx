import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  ApplicationData,
  GeneratedDocument,
  ResumeData,
  JobTarget,
} from "@/types/resume";
import { PersonalInfoForm } from "./PersonalInfoForm";
import { WorkExperienceForm } from "./WorkExperienceForm";
import { EducationForm } from "./EducationForm";
import { SkillsForm } from "./SkillsForm";
import { JobTargetForm } from "./JobTargetForm";
import { DocumentPreview } from "./DocumentPreview";
import { Sparkles } from "lucide-react";

const initialResumeData: ResumeData = {
  personalInfo: {
    fullName: "",
    address: "",
    phone: "",
    email: "",
    linkedIn: "",
    portfolio: "",
  },
  professionalSummary: "",
  workExperience: [],
  education: [],
  skills: [],
  certifications: [],
  achievements: [],
};

const initialJobTarget: JobTarget = {
  companyName: "",
  position: "",
  jobDescription: "",
  companyValues: "",
};

export function ResumeBuilder() {
  const { toast } = useToast();
  const [resumeData, setResumeData] = useState<ResumeData>(initialResumeData);
  const [jobTarget, setJobTarget] = useState<JobTarget>(initialJobTarget);
  const [documentType, setDocumentType] = useState<"resume" | "cover-letter" | "both">("both");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDocs, setGeneratedDocs] = useState<GeneratedDocument[]>([]);
  const [activeTab, setActiveTab] = useState("personal");

  const handleGenerate = async () => {
    // Validation
    if (!resumeData.personalInfo.fullName || !resumeData.personalInfo.email) {
      toast({
        title: "Missing Information",
        description: "Please fill in at least your name and email.",
        variant: "destructive",
      });
      return;
    }

    if (!jobTarget.companyName || !jobTarget.position) {
      toast({
        title: "Missing Job Details",
        description: "Please provide the company name and position.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedDocs([]);

    try {
      const applicationData: ApplicationData = {
        resumeData,
        jobTarget,
        documentType,
      };

      const { data, error } = await supabase.functions.invoke("generate-documents", {
        body: applicationData,
      });

      if (error) throw error;

      if (data.documents) {
        setGeneratedDocs(data.documents);
        toast({
          title: "Success!",
          description: "Your documents have been generated.",
        });
      }
    } catch (error) {
      console.error("Generation error:", error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate documents",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">
          Resume & Cover Letter Builder
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Enter your details below and let AI create professional, tailored documents
          for your job application.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Input Form */}
        <div className="space-y-6">
          <Card className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5 mb-6">
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="experience">Experience</TabsTrigger>
                <TabsTrigger value="education">Education</TabsTrigger>
                <TabsTrigger value="skills">Skills</TabsTrigger>
                <TabsTrigger value="job">Target Job</TabsTrigger>
              </TabsList>

              <TabsContent value="personal">
                <PersonalInfoForm
                  data={resumeData.personalInfo}
                  onChange={(personalInfo) =>
                    setResumeData({ ...resumeData, personalInfo })
                  }
                />
              </TabsContent>

              <TabsContent value="experience">
                <WorkExperienceForm
                  data={resumeData.workExperience}
                  onChange={(workExperience) =>
                    setResumeData({ ...resumeData, workExperience })
                  }
                />
              </TabsContent>

              <TabsContent value="education">
                <EducationForm
                  data={resumeData.education}
                  onChange={(education) =>
                    setResumeData({ ...resumeData, education })
                  }
                />
              </TabsContent>

              <TabsContent value="skills">
                <SkillsForm
                  skills={resumeData.skills}
                  certifications={resumeData.certifications}
                  achievements={resumeData.achievements}
                  professionalSummary={resumeData.professionalSummary}
                  onSkillsChange={(skills) =>
                    setResumeData({ ...resumeData, skills })
                  }
                  onCertificationsChange={(certifications) =>
                    setResumeData({ ...resumeData, certifications })
                  }
                  onAchievementsChange={(achievements) =>
                    setResumeData({ ...resumeData, achievements })
                  }
                  onSummaryChange={(professionalSummary) =>
                    setResumeData({ ...resumeData, professionalSummary })
                  }
                />
              </TabsContent>

              <TabsContent value="job">
                <JobTargetForm data={jobTarget} onChange={setJobTarget} />
              </TabsContent>
            </Tabs>
          </Card>

          {/* Document Type Selection */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Document Type</h3>
            <RadioGroup
              value={documentType}
              onValueChange={(value) =>
                setDocumentType(value as "resume" | "cover-letter" | "both")
              }
              className="flex flex-wrap gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="resume" id="resume" />
                <Label htmlFor="resume">Resume Only</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cover-letter" id="cover-letter" />
                <Label htmlFor="cover-letter">Cover Letter Only</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="both" id="both" />
                <Label htmlFor="both">Both</Label>
              </div>
            </RadioGroup>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full mt-6"
              size="lg"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              {isGenerating ? "Generating..." : "Generate Documents"}
            </Button>
          </Card>
        </div>

        {/* Preview Panel */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Preview</h2>
          <DocumentPreview documents={generatedDocs} isLoading={isGenerating} />
        </div>
      </div>
    </div>
  );
}
