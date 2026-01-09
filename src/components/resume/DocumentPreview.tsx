import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GeneratedDocument } from "@/types/resume";
import { Download, FileText } from "lucide-react";

interface Props {
  documents: GeneratedDocument[];
  isLoading: boolean;
}

export function DocumentPreview({ documents, isLoading }: Props) {
  const handleDownloadHTML = (doc: GeneratedDocument) => {
    const blob = new Blob([doc.htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.type === "resume" ? "Resume" : "CoverLetter"}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrintPDF = (doc: GeneratedDocument) => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(doc.htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-8 flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
        <p className="text-muted-foreground">Generating your documents...</p>
        <p className="text-sm text-muted-foreground mt-2">
          Step 1: Creating content with GPT...
        </p>
      </Card>
    );
  }

  if (documents.length === 0) {
    return (
      <Card className="p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Documents Yet</h3>
        <p className="text-muted-foreground max-w-md">
          Fill out your information and click "Generate Documents" to create your
          resume and cover letter.
        </p>
      </Card>
    );
  }

  return (
    <Tabs defaultValue={documents[0]?.type} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        {documents.map((doc) => (
          <TabsTrigger key={doc.type} value={doc.type}>
            {doc.type === "resume" ? "Resume" : "Cover Letter"}
          </TabsTrigger>
        ))}
      </TabsList>

      {documents.map((doc) => (
        <TabsContent key={doc.type} value={doc.type} className="mt-4">
          <div className="flex gap-2 mb-4">
            <Button variant="outline" size="sm" onClick={() => handleDownloadHTML(doc)}>
              <Download className="mr-2 h-4 w-4" />
              Download HTML
            </Button>
            <Button variant="outline" size="sm" onClick={() => handlePrintPDF(doc)}>
              <FileText className="mr-2 h-4 w-4" />
              Print / Save PDF
            </Button>
          </div>

          <Card className="p-0 overflow-hidden">
            <iframe
              srcDoc={doc.htmlContent}
              className="w-full min-h-[600px] border-0"
              title={`${doc.type} preview`}
            />
          </Card>
        </TabsContent>
      ))}
    </Tabs>
  );
}
