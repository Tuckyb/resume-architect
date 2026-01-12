import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  GeneratedDocument,
  JobTarget,
  ParsedResumeData,
} from "@/types/resume";
import { PdfUploader } from "./PdfUploader";
import { JobListUploader } from "./JobListUploader";
import { DocumentPreview } from "./DocumentPreview";

import { RecentSettings } from "./RecentSettings";
import { UploadExamples, ExampleTexts } from "./UploadExamples";
import { Sparkles, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";


export function ResumeBuilder() {
  const { toast } = useToast();
  const [parsedResume, setParsedResume] = useState<ParsedResumeData | null>(null);
  const [jobs, setJobs] = useState<JobTarget[]>([]);
  const [documentType, setDocumentType] = useState<"resume" | "cover-letter" | "both">("both");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDocs, setGeneratedDocs] = useState<GeneratedDocument[]>([]);
  const [currentJobIndex, setCurrentJobIndex] = useState(0);
  const [settingsRefreshTrigger, setSettingsRefreshTrigger] = useState(0);
  const [exampleTexts, setExampleTexts] = useState<ExampleTexts>({ 
    exampleResumeText: null, 
    exampleCoverLetterText: null,
    styledResumeText: null,
    styledCoverLetterText: null,
  });

  const selectedJobs = jobs.filter((j) => j.selected);

  const handleGenerate = async () => {
    if (!parsedResume?.rawText) {
      toast({
        title: "Missing Resume",
        description: "Please upload your resume/CV PDF first.",
        variant: "destructive",
      });
      return;
    }

    if (selectedJobs.length === 0) {
      toast({
        title: "No Jobs Selected",
        description: "Please select at least one job to apply for.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedDocs([]);
    setCurrentJobIndex(0);

    const allDocs: GeneratedDocument[] = [];

    try {
      for (let i = 0; i < selectedJobs.length; i++) {
        setCurrentJobIndex(i);
        const job = selectedJobs[i];

        const { data, error } = await supabase.functions.invoke("generate-documents", {
          body: {
            parsedResumeData: parsedResume,
            jobTarget: job,
            documentType,
            exampleResumeText: exampleTexts.exampleResumeText,
            exampleCoverLetterText: exampleTexts.exampleCoverLetterText,
            styledResumeText: exampleTexts.styledResumeText,
            styledCoverLetterText: exampleTexts.styledCoverLetterText,
          },
        });

        if (error) {
          console.error(`Error generating for ${job.companyName}:`, error);
          continue;
        }

        if (data.documents) {
          const docsWithJobId = data.documents.map((doc: GeneratedDocument) => ({
            ...doc,
            jobId: job.id,
          }));
          allDocs.push(...docsWithJobId);
          setGeneratedDocs([...allDocs]);
        }
      }

      // Save settings to recent_settings after successful generation
      if (allDocs.length > 0) {
        const settingName = selectedJobs.length === 1 
          ? `${selectedJobs[0].position} @ ${selectedJobs[0].companyName}`
          : `${selectedJobs.length} jobs - ${new Date().toLocaleDateString()}`;
        
        const { error: saveError } = await supabase.from("recent_settings").insert([{
          name: settingName,
          resume_data: JSON.parse(JSON.stringify(parsedResume)),
          jobs_data: JSON.parse(JSON.stringify(jobs)),
          document_type: documentType,
          style_name: documentType === "both" ? "Resume + Cover Letter" : documentType === "resume" ? "Resume Only" : "Cover Letter Only",
        }]);

        if (saveError) {
          console.error("Error saving settings:", saveError);
        } else {
          setSettingsRefreshTrigger(prev => prev + 1);
        }
      }

      toast({
        title: "Generation Complete!",
        description: `Generated documents for ${allDocs.length > 0 ? selectedJobs.length : 0} job(s).`,
      });
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
    <div className="min-h-screen w-full bg-background py-8 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            AI Resume & Cover Letter Generator
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Upload your resume PDF and job listings CSV. Select which jobs to apply for,
            and let AI create tailored documents for each application.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left Column - Inputs */}
          <div className="space-y-6">
            {/* PDF Upload */}
            <PdfUploader onParsed={setParsedResume} parsedData={parsedResume} />

            {/* Job List Upload */}
            <JobListUploader jobs={jobs} onJobsChange={setJobs} />

            {/* Document Type & Generate */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Document Type</h3>
              <RadioGroup
                value={documentType}
                onValueChange={(value) =>
                  setDocumentType(value as "resume" | "cover-letter" | "both")
                }
                className="flex flex-wrap gap-4 mb-6"
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

              {/* Validation Alerts */}
              {!parsedResume?.rawText && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Please upload your resume PDF to continue.
                  </AlertDescription>
                </Alert>
              )}

              {parsedResume?.rawText && selectedJobs.length === 0 && (
                <Alert className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Select at least one job from the list above.
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !parsedResume?.rawText || selectedJobs.length === 0}
                className="w-full"
                size="lg"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                {isGenerating
                  ? `Generating (${currentJobIndex + 1}/${selectedJobs.length})...`
                  : `Generate for ${selectedJobs.length} Job${selectedJobs.length !== 1 ? "s" : ""}`}
              </Button>
            </Card>
          </div>

          {/* Right Column - Settings & Preview */}
          <div className="flex flex-col space-y-6">
            {/* Upload Examples */}
            <UploadExamples onExamplesChange={setExampleTexts} />
            
            {/* Recent Settings */}
            <RecentSettings 
              refreshTrigger={settingsRefreshTrigger}
              onLoadSettings={({ resumeData, jobs: loadedJobs, documentType: loadedDocType }) => {
                if (resumeData) setParsedResume(resumeData);
                if (loadedJobs.length > 0) setJobs(loadedJobs);
                setDocumentType(loadedDocType);
              }} 
            />
            
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4">Generated Documents</h2>
              <DocumentPreview 
                documents={generatedDocs} 
                isLoading={isGenerating} 
                jobs={jobs}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
