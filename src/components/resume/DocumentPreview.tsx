import { useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, FileText, Loader2, Printer, PackageCheck } from "lucide-react";
import { GeneratedDocument, JobTarget } from "@/types/resume";
import JSZip from "jszip";

interface DocumentPreviewProps {
  documents: GeneratedDocument[];
  isLoading: boolean;
  jobs?: JobTarget[];
}

function docFileName(doc: GeneratedDocument, job?: JobTarget, ext = "html"): string {
  const company = job?.companyName.replace(/\s+/g, "_") || "document";
  return `${doc.type}_${company}.${ext}`;
}

// Renders a document's HTML in a hidden iframe (real styling + web fonts),
// captures each A4 .sheet with html2canvas, and assembles the pages into a
// PDF with jsPDF. Each sheet becomes exactly one page — html2pdf's automatic
// pagination mis-paginates iframe content, so the sheets are captured
// individually. Note: pages are rasterized images — pixel-accurate, but the
// text is not selectable; the per-document Download PDF (print dialog) stays
// the best option when an ATS needs to parse the text.
async function renderDocToPdf(doc: GeneratedDocument): Promise<Blob> {
  // Lazy-loaded: html2canvas + jsPDF add ~1MB, only needed for the ZIP.
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "-9999px";
  iframe.style.width = "210mm";
  iframe.style.height = "297mm";
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);
  try {
    await new Promise<void>((resolve) => {
      iframe.onload = () => resolve();
      iframe.srcdoc = doc.htmlContent;
    });
    const frameDoc = iframe.contentDocument;
    if (!frameDoc) throw new Error("Could not render document for PDF conversion");

    try {
      await frameDoc.fonts?.ready;
    } catch {
      // Fonts unavailable (offline) — capture with fallback fonts.
    }
    // Small settle delay so web fonts finish painting before capture.
    await new Promise((r) => setTimeout(r, 300));

    const sheets = Array.from(frameDoc.querySelectorAll<HTMLElement>(".sheet"));
    if (sheets.length === 0) throw new Error("No printable sheets found in document");

    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    for (let i = 0; i < sheets.length; i++) {
      const canvas = await html2canvas(sheets[i], {
        scale: 2,
        useCORS: true,
        backgroundColor: "#FAFAF7",
      });
      if (i > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, 210, 297);
    }
    return pdf.output("blob");
  } finally {
    iframe.remove();
  }
}

export function DocumentPreview({ documents, isLoading, jobs = [] }: DocumentPreviewProps) {
  // Hidden iframe used for print-to-PDF; reused across clicks.
  const printFrameRef = useRef<HTMLIFrameElement | null>(null);
  // Progress label while the ZIP's PDFs are being rendered, null when idle.
  const [zipProgress, setZipProgress] = useState<string | null>(null);

  // Opens the browser print dialog on the document rendered at true A4 size.
  // The framework's @page { size: A4; margin: 0 } rules make "Save as PDF"
  // pixel-faithful to the Styalized design.
  const downloadPdf = (doc: GeneratedDocument) => {
    printFrameRef.current?.remove();

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "-9999px";
    iframe.style.width = "210mm";
    iframe.style.height = "297mm";
    iframe.setAttribute("aria-hidden", "true");
    printFrameRef.current = iframe;

    iframe.onload = async () => {
      const frameWindow = iframe.contentWindow;
      const frameDoc = iframe.contentDocument;
      if (!frameWindow || !frameDoc) return;
      try {
        await frameDoc.fonts?.ready;
      } catch {
        // Fonts unavailable (offline) — print with fallback fonts.
      }
      // Small settle delay so web fonts finish painting before print.
      setTimeout(() => {
        frameWindow.focus();
        frameWindow.print();
      }, 300);
    };

    document.body.appendChild(iframe);
    iframe.srcdoc = doc.htmlContent;
  };

  const downloadHtml = (doc: GeneratedDocument, job?: JobTarget) => {
    const blob = new Blob([doc.htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = docFileName(doc, job);
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAllAsZip = async () => {
    const zip = new JSZip();
    try {
      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        setZipProgress(`${i + 1}/${documents.length}`);
        const job = jobs.find((j) => j.id === doc.jobId);
        const pdf = await renderDocToPdf(doc);
        zip.file(docFileName(doc, job, "pdf"), pdf);
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "all_documents.zip";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setZipProgress(null);
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
      <Card className="p-8 flex flex-col items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Generating documents...</p>
      </Card>
    );
  }

  if (documents.length === 0) {
    return (
      <Card className="p-8 flex flex-col items-center justify-center h-[calc(100vh-200px)] text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Upload resume, select jobs, and generate.</p>
      </Card>
    );
  }

  const jobIds = Object.keys(groupedDocs);

  return (
    <Card className="p-4 h-[calc(100vh-200px)] flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-4 pb-3 border-b">
        <div className="min-w-0">
          <span className="text-sm font-medium text-muted-foreground block">
            {documents.length} document{documents.length !== 1 ? 's' : ''} generated
          </span>
          <span className="text-xs text-muted-foreground block">
            The ZIP contains a PDF of every document. For a selectable-text copy of a
            single document, use its <strong>Download PDF</strong> button (Save as PDF).
          </span>
        </div>
        <Button variant="default" onClick={downloadAllAsZip} disabled={zipProgress !== null}>
          {zipProgress !== null ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <PackageCheck className="h-4 w-4 mr-2" />
          )}
          {zipProgress !== null ? `Preparing PDFs ${zipProgress}…` : "Download All (PDF ZIP)"}
        </Button>
      </div>
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
                    <div className="flex items-center gap-2 mb-4">
                      <Button variant="default" size="sm" onClick={() => downloadPdf(doc)}>
                        <Printer className="h-4 w-4 mr-2" />Download PDF
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => downloadHtml(doc, job)}>
                        <Download className="h-4 w-4 mr-2" />Download HTML
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        PDF opens the print dialog — choose "Save as PDF".
                      </span>
                    </div>
                    <iframe
                      srcDoc={doc.htmlContent}
                      sandbox="allow-same-origin"
                      title={`${doc.type} preview`}
                      className="flex-1 w-full border rounded-lg bg-white"
                    />
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
