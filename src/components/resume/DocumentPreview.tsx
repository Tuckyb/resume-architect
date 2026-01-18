import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, FileText, Loader2, Printer } from "lucide-react";
import { GeneratedDocument, JobTarget } from "@/types/resume";

interface DocumentPreviewProps {
  documents: GeneratedDocument[];
  isLoading: boolean;
  jobs?: JobTarget[];
}

export function DocumentPreview({ documents, isLoading, jobs = [] }: DocumentPreviewProps) {
  const downloadHTML = (doc: GeneratedDocument, job?: JobTarget) => {
    const blob = new Blob([doc.htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const fileName = job ? `${doc.type}_${job.companyName.replace(/\s+/g, "_")}.html` : `${doc.type}.html`;
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printDocument = (doc: GeneratedDocument) => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(doc.htmlContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const groupedDocs = documents.reduce((acc, doc) => {
    const jobId = doc.jobId || "unknown";
    if (!acc[jobId]) acc[jobId] = [];
    acc[jobId].push(doc);
    return acc;
  }, {} as Record<string, GeneratedDocument[]>);

  if (isLoading) {
    return (
<Card className="p-8 flex flex-col items-center justify-center h-[600px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Generating documents...</p>
      </Card>
    );
  }

  if (documents.length === 0) {
    return (
<Card className="p-8 flex flex-col items-center justify-center h-[600px] text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Upload resume, select jobs, and generate.</p>
      </Card>
    );
  }

  const jobIds = Object.keys(groupedDocs);

  return (
    <Card className="p-4 h-[600px] flex flex-col overflow-hidden">
      <Tabs defaultValue={jobIds[0]} className="flex flex-col flex-1">
        <TabsList className="w-full flex-wrap h-auto gap-1 mb-4">
          {jobIds.map((jobId) => (
            <TabsTrigger key={jobId} value={jobId} className="text-xs">
              {jobs.find(j => j.id === jobId)?.companyName || "Document"}
            </TabsTrigger>
          ))}
        </TabsList>
        {jobIds.map((jobId) => {
          const jobDocs = groupedDocs[jobId];
          const job = jobs.find(j => j.id === jobId);
          return (
            <TabsContent key={jobId} value={jobId} className="flex-1 flex flex-col">
              <Tabs defaultValue={jobDocs[0]?.type} className="flex flex-col flex-1">
                <TabsList className="mb-4">
                  {jobDocs.map((doc) => (
                    <TabsTrigger key={doc.type} value={doc.type}>
                      {doc.type === "resume" ? "Resume" : "Cover Letter"}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {jobDocs.map((doc) => (
                  <TabsContent key={doc.type} value={doc.type} className="flex-1 flex flex-col">
                    <div className="flex gap-2 mb-4">
                      <Button variant="outline" size="sm" onClick={() => downloadHTML(doc, job)}>
                        <Download className="h-4 w-4 mr-2" />Download
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => printDocument(doc)}>
                        <Printer className="h-4 w-4 mr-2" />Print/PDF
                      </Button>
                    </div>
                    <ScrollArea className="flex-1 border rounded-lg overflow-auto">
                      <div className="bg-white text-black" dangerouslySetInnerHTML={{ __html: doc.htmlContent }} />
                    </ScrollArea>
                  </TabsContent>
                ))}
              </Tabs>
            </TabsContent>
          );
        })}
      </Tabs>
    </Card>
  );
}
