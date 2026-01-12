import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Upload, FileText, X, Palette, FileCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

export interface ExampleTexts {
  // For GPT (content style)
  exampleResumeText: string | null;
  exampleCoverLetterText: string | null;
  // For Claude (formatting style)
  styledResumeText: string | null;
  styledCoverLetterText: string | null;
}

interface UploadExamplesProps {
  onExamplesChange?: (examples: ExampleTexts) => void;
}

export function UploadExamples({ onExamplesChange }: UploadExamplesProps) {
  const { toast } = useToast();
  
  // GPT examples (content)
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState<string | null>(null);
  const [coverLetterText, setCoverLetterText] = useState<string | null>(null);
  const [isParsingResume, setIsParsingResume] = useState(false);
  const [isParsingCoverLetter, setIsParsingCoverLetter] = useState(false);

  // Claude examples (styled formatting)
  const [styledResumeFile, setStyledResumeFile] = useState<File | null>(null);
  const [styledCoverLetterFile, setStyledCoverLetterFile] = useState<File | null>(null);
  const [styledResumeText, setStyledResumeText] = useState<string | null>(null);
  const [styledCoverLetterText, setStyledCoverLetterText] = useState<string | null>(null);
  const [isParsingStyledResume, setIsParsingStyledResume] = useState(false);
  const [isParsingStyledCoverLetter, setIsParsingStyledCoverLetter] = useState(false);

  const notifyChange = (updates: Partial<ExampleTexts>) => {
    onExamplesChange?.({
      exampleResumeText: resumeText,
      exampleCoverLetterText: coverLetterText,
      styledResumeText: styledResumeText,
      styledCoverLetterText: styledCoverLetterText,
      ...updates,
    });
  };

  const parseExamplePdf = async (
    file: File, 
    type: 'resume' | 'coverLetter' | 'styledResume' | 'styledCoverLetter'
  ) => {
    const setIsParsing = {
      resume: setIsParsingResume,
      coverLetter: setIsParsingCoverLetter,
      styledResume: setIsParsingStyledResume,
      styledCoverLetter: setIsParsingStyledCoverLetter,
    }[type];
    
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
      
      switch (type) {
        case 'resume':
          setResumeText(extractedText);
          notifyChange({ exampleResumeText: extractedText });
          break;
        case 'coverLetter':
          setCoverLetterText(extractedText);
          notifyChange({ exampleCoverLetterText: extractedText });
          break;
        case 'styledResume':
          setStyledResumeText(extractedText);
          notifyChange({ styledResumeText: extractedText });
          break;
        case 'styledCoverLetter':
          setStyledCoverLetterText(extractedText);
          notifyChange({ styledCoverLetterText: extractedText });
          break;
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

  // GPT example handlers
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
    notifyChange({ exampleResumeText: null });
  };

  const clearCoverLetter = () => {
    setCoverLetterFile(null);
    setCoverLetterText(null);
    notifyChange({ exampleCoverLetterText: null });
  };

  // Claude styled example handlers
  const handleStyledResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setStyledResumeFile(file);
      await parseExamplePdf(file, 'styledResume');
    }
  };

  const handleStyledCoverLetterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setStyledCoverLetterFile(file);
      await parseExamplePdf(file, 'styledCoverLetter');
    }
  };

  const clearStyledResume = () => {
    setStyledResumeFile(null);
    setStyledResumeText(null);
    notifyChange({ styledResumeText: null });
  };

  const clearStyledCoverLetter = () => {
    setStyledCoverLetterFile(null);
    setStyledCoverLetterText(null);
    notifyChange({ styledCoverLetterText: null });
  };

  const FileUploadField = ({
    label,
    file,
    isParsed,
    isParsing,
    onUpload,
    onClear,
    icon: Icon = FileText,
  }: {
    label: string;
    file: File | null;
    isParsed: boolean;
    isParsing: boolean;
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onClear: () => void;
    icon?: typeof FileText;
  }) => (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {label}
      </Label>
      {file ? (
        <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1 text-sm truncate">
            {file.name}
            {isParsed && <span className="text-green-600 ml-2">✓ Parsed</span>}
          </span>
          <Button variant="ghost" size="sm" onClick={onClear} disabled={isParsing}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <label className="block">
          <input
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={onUpload}
            disabled={isParsing}
          />
          <div className="flex items-center justify-center gap-2 p-3 border border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition-colors">
            <Upload className="h-4 w-4" />
            <span className="text-sm">
              {isParsing ? "Parsing..." : `Upload ${label}`}
            </span>
          </div>
        </label>
      )}
    </div>
  );

  return (
    <Card className="p-6">
      {/* GPT Examples - Content Style */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <FileCode className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Content Examples (for GPT)</h2>
        </div>
        <p className="text-muted-foreground text-sm mb-4">
          Upload example PDFs to guide the AI on content structure and writing style.
        </p>

        <div className="space-y-4">
          <FileUploadField
            label="Example Resume"
            file={resumeFile}
            isParsed={!!resumeText}
            isParsing={isParsingResume}
            onUpload={handleResumeUpload}
            onClear={clearResume}
          />
          <FileUploadField
            label="Example Cover Letter"
            file={coverLetterFile}
            isParsed={!!coverLetterText}
            isParsing={isParsingCoverLetter}
            onUpload={handleCoverLetterUpload}
            onClear={clearCoverLetter}
          />
        </div>
      </div>

      <Separator className="my-6" />

      {/* Claude Examples - Styled Formatting */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Palette className="h-5 w-5 text-accent-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Style Examples (for Formatting)</h2>
        </div>
        <p className="text-muted-foreground text-sm mb-4">
          Upload styled example PDFs to guide the HTML/CSS formatting output.
        </p>

        <div className="space-y-4">
          <FileUploadField
            label="Styled Resume Example"
            file={styledResumeFile}
            isParsed={!!styledResumeText}
            isParsing={isParsingStyledResume}
            onUpload={handleStyledResumeUpload}
            onClear={clearStyledResume}
            icon={Palette}
          />
          <FileUploadField
            label="Styled Cover Letter Example"
            file={styledCoverLetterFile}
            isParsed={!!styledCoverLetterText}
            isParsing={isParsingStyledCoverLetter}
            onUpload={handleStyledCoverLetterUpload}
            onClear={clearStyledCoverLetter}
            icon={Palette}
          />
        </div>
      </div>
    </Card>
  );
}
