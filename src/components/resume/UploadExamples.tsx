import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Upload, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UploadExamplesProps {
  onExamplesChange?: (examples: { 
    exampleResumeText: string | null; 
    exampleCoverLetterText: string | null 
  }) => void;
}

export function UploadExamples({ onExamplesChange }: UploadExamplesProps) {
  const { toast } = useToast();
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState<string | null>(null);
  const [coverLetterText, setCoverLetterText] = useState<string | null>(null);
  const [isParsingResume, setIsParsingResume] = useState(false);
  const [isParsingCoverLetter, setIsParsingCoverLetter] = useState(false);

  const parseExamplePdf = async (file: File, type: 'resume' | 'coverLetter') => {
    const setIsParsing = type === 'resume' ? setIsParsingResume : setIsParsingCoverLetter;
    setIsParsing(true);

    try {
      // Convert file to base64
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const pdfBase64 = btoa(binary);

      // Call parse-resume-pdf to extract text
      const { data, error } = await supabase.functions.invoke("parse-resume-pdf", {
        body: { pdfBase64, fileName: file.name },
      });

      if (error) {
        throw error;
      }

      // Get the raw text from the parsed data
      const extractedText = data?.rawText || "";
      
      if (type === 'resume') {
        setResumeText(extractedText);
        onExamplesChange?.({ 
          exampleResumeText: extractedText, 
          exampleCoverLetterText: coverLetterText 
        });
      } else {
        setCoverLetterText(extractedText);
        onExamplesChange?.({ 
          exampleResumeText: resumeText, 
          exampleCoverLetterText: extractedText 
        });
      }

      toast({
        title: "Example Parsed",
        description: `Successfully extracted text from ${file.name}`,
      });
    } catch (error) {
      console.error("Error parsing example PDF:", error);
      toast({
        title: "Parsing Failed",
        description: `Could not parse ${file.name}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsParsing(false);
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setResumeFile(file);
      await parseExamplePdf(file, 'resume');
    }
  };

  const handleCoverLetterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverLetterFile(file);
      await parseExamplePdf(file, 'coverLetter');
    }
  };

  const clearResume = () => {
    setResumeFile(null);
    setResumeText(null);
    onExamplesChange?.({ 
      exampleResumeText: null, 
      exampleCoverLetterText: coverLetterText 
    });
  };

  const clearCoverLetter = () => {
    setCoverLetterFile(null);
    setCoverLetterText(null);
    onExamplesChange?.({ 
      exampleResumeText: resumeText, 
      exampleCoverLetterText: null 
    });
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold text-foreground mb-2">Upload Examples</h2>
      <p className="text-muted-foreground text-sm mb-4">
        Upload example PDFs that show the desired output formatting style.
      </p>

      <div className="space-y-4">
        {/* Example Resume PDF */}
        <div className="space-y-2">
          <Label>Example Resume PDF</Label>
          {resumeFile ? (
            <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-sm truncate">
                {resumeFile.name}
                {resumeText && <span className="text-green-600 ml-2">✓ Parsed</span>}
              </span>
              <Button variant="ghost" size="sm" onClick={clearResume} disabled={isParsingResume}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <label className="block">
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleResumeUpload}
                disabled={isParsingResume}
              />
              <div className="flex items-center justify-center gap-2 p-3 border border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition-colors">
                <Upload className="h-4 w-4" />
                <span className="text-sm">
                  {isParsingResume ? "Parsing..." : "Upload Resume PDF"}
                </span>
              </div>
            </label>
          )}
        </div>

        {/* Example Cover Letter PDF */}
        <div className="space-y-2">
          <Label>Example Cover Letter PDF</Label>
          {coverLetterFile ? (
            <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-sm truncate">
                {coverLetterFile.name}
                {coverLetterText && <span className="text-green-600 ml-2">✓ Parsed</span>}
              </span>
              <Button variant="ghost" size="sm" onClick={clearCoverLetter} disabled={isParsingCoverLetter}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <label className="block">
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleCoverLetterUpload}
                disabled={isParsingCoverLetter}
              />
              <div className="flex items-center justify-center gap-2 p-3 border border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition-colors">
                <Upload className="h-4 w-4" />
                <span className="text-sm">
                  {isParsingCoverLetter ? "Parsing..." : "Upload Cover Letter PDF"}
                </span>
              </div>
            </label>
          )}
        </div>
      </div>
    </Card>
  );
}
