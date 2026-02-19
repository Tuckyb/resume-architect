import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Upload, FileText, Check, X, Loader2, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ParsedResumeData } from "@/types/resume";

interface PdfUploaderProps {
  onParsed: (data: ParsedResumeData) => void;
  parsedData: ParsedResumeData | null;
  onPortfolioChange?: (json: Record<string, unknown> | null) => void;
  portfolioJson?: Record<string, unknown> | null;
}

export function PdfUploader({ onParsed, parsedData, onPortfolioChange, portfolioJson }: PdfUploaderProps) {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [portfolioFileName, setPortfolioFileName] = useState<string | null>(null);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  const [isJsonDragging, setIsJsonDragging] = useState(false);

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const files = e.dataTransfer.files;
      if (files.length > 0) await processFile(files[0]);
    },
    []
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) await processFile(files[0]);
  };

  const processFile = async (file: File) => {
    const isJson = file.type === "application/json" || file.name.endsWith(".json");
    const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");

    if (!isPdf && !isJson) {
      toast({ title: "Invalid file type", description: "Please upload a PDF or JSON file.", variant: "destructive" });
      return;
    }

    setFileName(file.name);

    if (isJson) {
      try {
        const text = await file.text();
        const json = JSON.parse(text);
        // Accept raw ParsedResumeData JSON directly
        const parsed: ParsedResumeData = {
          rawText: json.rawText ?? JSON.stringify(json),
          personalInfo: json.personalInfo,
          workExperience: json.workExperience,
          education: json.education,
          skills: json.skills,
          certifications: json.certifications,
          achievements: json.achievements,
          references: json.references,
        };
        onParsed(parsed);
        toast({ title: "JSON Loaded", description: "Resume data imported from JSON." });
      } catch {
        toast({ title: "Invalid JSON", description: "Could not parse the JSON file.", variant: "destructive" });
        setFileName(null);
      }
      return;
    }

    setIsUploading(true);
    try {
      const base64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke("parse-resume-pdf", {
        body: { pdfBase64: base64, fileName: file.name },
      });
      if (error) throw error;
      onParsed(data);
      toast({ title: "PDF Parsed Successfully", description: "Your information has been extracted." });
    } catch (error) {
      console.error("PDF parsing error:", error);
      toast({ title: "Parsing Failed", description: "Failed to parse the PDF. Please try again.", variant: "destructive" });
      setFileName(null);
    } finally {
      setIsUploading(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleClear = () => {
    setFileName(null);
    onParsed({ rawText: "" });
  };

  const processJsonFile = async (file: File) => {
    setPortfolioError(null);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      setPortfolioFileName(file.name);
      onPortfolioChange?.(json);
      toast({ title: "Portfolio Loaded", description: "Portfolio JSON has been loaded for linking." });
    } catch {
      setPortfolioError("Invalid JSON — please upload a valid .json file.");
      onPortfolioChange?.(null);
    }
  };

  const handleJsonSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processJsonFile(file);
  };

  const handleJsonDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsJsonDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await processJsonFile(file);
  };

  const handleJsonClear = () => {
    setPortfolioFileName(null);
    setPortfolioError(null);
    onPortfolioChange?.(null);
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
        <FileText className="h-5 w-5" />
        My Information
      </h2>
      <p className="text-muted-foreground text-sm mb-5">
        Upload your resume PDF and portfolio JSON so the AI can create tailored, hyperlinked applications.
      </p>

      {/* Section 1: Resume PDF or JSON */}
      <div className="mb-5">
        <p className="text-sm font-medium text-foreground mb-3">1. Resume / CV (PDF or JSON)</p>
        {!parsedData?.rawText ? (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Parsing {fileName}...</p>
              </div>
            ) : (
              <>
                <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-2">Drag and drop your PDF or JSON here, or</p>
                <label>
                  <input type="file" accept=".pdf,.json,application/pdf,application/json" onChange={handleFileSelect} className="hidden" />
                  <Button variant="outline" asChild>
                    <span className="cursor-pointer">Browse Files</span>
                  </Button>
                </label>
              </>
            )}
          </div>
        ) : (
          <div className="border rounded-lg p-4 bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-full">
                  <Check className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="font-medium">{fileName || "Resume uploaded"}</p>
                  <p className="text-sm text-muted-foreground">Information extracted successfully</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleClear}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              {parsedData.personalInfo?.fullName && (
                <p><span className="text-muted-foreground">Name:</span> {parsedData.personalInfo.fullName}</p>
              )}
              {parsedData.skills && parsedData.skills.length > 0 && (
                <p><span className="text-muted-foreground">Skill categories:</span> {parsedData.skills.map((s) => s.category).join(", ")}</p>
              )}
              {parsedData.education && parsedData.education.length > 0 && (
                <p><span className="text-muted-foreground">Education entries:</span> {parsedData.education.length}</p>
              )}
              {parsedData.references && parsedData.references.length > 0 && (
                <p><span className="text-muted-foreground">References:</span> {parsedData.references.length} found</p>
              )}
            </div>
          </div>
        )}
      </div>

      <Separator className="my-5" />

      {/* Section 2: Portfolio JSON */}
      <div>
        <p className="text-sm font-medium text-foreground mb-1">2. Portfolio Website (JSON)</p>
        <p className="text-xs text-muted-foreground mb-3">
          Export your portfolio site as JSON. The AI will hyperlink relevant projects and work samples in your documents.
        </p>
        {!portfolioJson ? (
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isJsonDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsJsonDragging(true); }}
            onDragLeave={() => setIsJsonDragging(false)}
            onDrop={handleJsonDrop}
          >
            <Globe className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">Drag and drop your JSON here, or</p>
            <label>
              <input type="file" accept=".json,application/json" onChange={handleJsonSelect} className="hidden" />
              <Button variant="outline" size="sm" asChild>
                <span className="cursor-pointer">Browse Files</span>
              </Button>
            </label>
            {portfolioError && (
              <p className="text-xs text-destructive mt-2">{portfolioError}</p>
            )}
          </div>
        ) : (
          <div className="border rounded-lg p-4 bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-full">
                  <Globe className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium">{portfolioFileName || "Portfolio loaded"}</p>
                  <p className="text-sm text-muted-foreground">Portfolio data ready for linking</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleJsonClear}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
