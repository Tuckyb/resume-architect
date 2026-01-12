import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, FileText, Check, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ParsedResumeData } from "@/types/resume";

interface PdfUploaderProps {
  onParsed: (data: ParsedResumeData) => void;
  parsedData: ParsedResumeData | null;
}

interface PdfUploaderProps {
  onParsed: (data: ParsedResumeData) => void;
  parsedData: ParsedResumeData | null;
}

export function PdfUploader({ onParsed, parsedData }: PdfUploaderProps) {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        await processFile(files[0]);
      }
    },
    []
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  };

  const processFile = async (file: File) => {
    if (file.type !== "application/pdf") {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setFileName(file.name);

    try {
      // Convert file to base64
      const base64 = await fileToBase64(file);

      // Call edge function to parse PDF
      const { data, error } = await supabase.functions.invoke("parse-resume-pdf", {
        body: { pdfBase64: base64, fileName: file.name },
      });

      if (error) throw error;

      onParsed(data);
      toast({
        title: "PDF Parsed Successfully",
        description: "Your resume information has been extracted.",
      });
    } catch (error) {
      console.error("PDF parsing error:", error);
      toast({
        title: "Parsing Failed",
        description: "Failed to parse the PDF. Please try again.",
        variant: "destructive",
      });
      setFileName(null);
    } finally {
      setIsUploading(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
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

  const handleClear = () => {
    setFileName(null);
    onParsed({ rawText: "" });
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <FileText className="h-5 w-5" />
        Your Resume/CV (PDF)
      </h2>
      <p className="text-muted-foreground text-sm mb-4">
        Upload a PDF containing your personal information, work experience, education, and skills.
        This information will be used to generate tailored applications.
      </p>

      {!parsedData?.rawText ? (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
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
          {isUploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Parsing {fileName}...</p>
            </div>
          ) : (
            <>
              <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-2">
                Drag and drop your PDF here, or
              </p>
              <label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
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
                <p className="text-sm text-muted-foreground">
                  Information extracted successfully
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleClear}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Preview extracted info */}
          <div className="mt-4 space-y-2 text-sm">
            {parsedData.personalInfo?.fullName && (
              <p>
                <span className="text-muted-foreground">Name:</span>{" "}
                {parsedData.personalInfo.fullName}
              </p>
            )}
            {parsedData.skills && parsedData.skills.length > 0 && (
              <p>
                <span className="text-muted-foreground">Skills categories:</span>{" "}
                {parsedData.skills.map((s) => s.category).join(", ")}
              </p>
            )}
            {parsedData.education && parsedData.education.length > 0 && (
              <p>
                <span className="text-muted-foreground">Education entries:</span>{" "}
                {parsedData.education.length}
              </p>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
