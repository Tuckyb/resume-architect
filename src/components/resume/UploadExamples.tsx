import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Upload, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UploadExamplesProps {
  onExamplesChange?: (examples: { resumeHtml: string | null; coverLetterHtml: string | null }) => void;
}

export function UploadExamples({ onExamplesChange }: UploadExamplesProps) {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null);

  const handleResumeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setResumeFile(file);
      // TODO: Parse PDF and extract HTML for context
    }
  };

  const handleCoverLetterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverLetterFile(file);
      // TODO: Parse PDF and extract HTML for context
    }
  };

  const clearResume = () => setResumeFile(null);
  const clearCoverLetter = () => setCoverLetterFile(null);

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
              <span className="flex-1 text-sm truncate">{resumeFile.name}</span>
              <Button variant="ghost" size="sm" onClick={clearResume}>
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
              />
              <div className="flex items-center justify-center gap-2 p-3 border border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition-colors">
                <Upload className="h-4 w-4" />
                <span className="text-sm">Upload Resume PDF</span>
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
              <span className="flex-1 text-sm truncate">{coverLetterFile.name}</span>
              <Button variant="ghost" size="sm" onClick={clearCoverLetter}>
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
              />
              <div className="flex items-center justify-center gap-2 p-3 border border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition-colors">
                <Upload className="h-4 w-4" />
                <span className="text-sm">Upload Cover Letter PDF</span>
              </div>
            </label>
          )}
        </div>
      </div>
    </Card>
  );
}
