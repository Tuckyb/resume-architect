import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Eye, FileText, Mail } from "lucide-react";
import exampleResumePage1 from "@/assets/example-resume-page1.jpg";
import exampleCoverletterPage1 from "@/assets/example-coverletter-page1.jpg";

export function ExampleOutputPreview() {
  const [selectedExample, setSelectedExample] = useState<"resume" | "coverletter" | null>(null);

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Eye className="h-5 w-5" />
        Example Output
      </h2>
      <p className="text-muted-foreground text-sm mb-4">
        See examples of professionally styled resumes and cover letters that will be generated.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Resume Example */}
        <Dialog>
          <DialogTrigger asChild>
            <button 
              className="group relative overflow-hidden rounded-lg border-2 border-muted hover:border-primary transition-colors cursor-pointer"
              onClick={() => setSelectedExample("resume")}
            >
              <div className="aspect-[8.5/11] relative">
                <img 
                  src={exampleResumePage1} 
                  alt="Example styled resume" 
                  className="w-full h-full object-cover object-top"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                  <span className="text-white font-medium flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    View Full Size
                  </span>
                </div>
              </div>
              <div className="p-3 bg-muted/50 flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Resume Example</span>
              </div>
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Example Styled Resume
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <img 
                src={exampleResumePage1} 
                alt="Example styled resume - full size" 
                className="w-full rounded-lg shadow-lg"
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* Cover Letter Example */}
        <Dialog>
          <DialogTrigger asChild>
            <button 
              className="group relative overflow-hidden rounded-lg border-2 border-muted hover:border-primary transition-colors cursor-pointer"
              onClick={() => setSelectedExample("coverletter")}
            >
              <div className="aspect-[8.5/11] relative">
                <img 
                  src={exampleCoverletterPage1} 
                  alt="Example cover letter" 
                  className="w-full h-full object-cover object-top"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                  <span className="text-white font-medium flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    View Full Size
                  </span>
                </div>
              </div>
              <div className="p-3 bg-muted/50 flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Cover Letter Example</span>
              </div>
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Example Cover Letter
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <img 
                src={exampleCoverletterPage1} 
                alt="Example cover letter - full size" 
                className="w-full rounded-lg shadow-lg"
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <p className="text-xs text-muted-foreground mt-4 text-center">
        Click to preview • Generated documents will match this professional styling
      </p>
    </Card>
  );
}
