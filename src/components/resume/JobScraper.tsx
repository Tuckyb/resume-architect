import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { JobTarget } from "@/types/resume";
import { 
  Search, 
  Download, 
  Import, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  MapPin, 
  Building2, 
  Briefcase, 
  DollarSign, 
  Calendar,
  Key,
  Globe,
  Settings2,
  XCircle,
  ChevronDown,
  ChevronUp,
  HelpCircle
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface JobScraperProps {
  onJobsChange: (jobs: JobTarget[]) => void;
  existingJobs: JobTarget[];
  onSwitchTab: (tab: string) => void;
}

interface ScrapedJob {
  jobId: string;
  jobTitle: string;
  jobLink: string;
  companyName: string;
  location?: string;
  jobType?: string;
  salaryLabel?: string;
  listingDateDisplay?: string;
  teaser?: string;
  jobDescription?: string;
  selected?: boolean;
}

// Shape returned by the `websift/seek-job-scraper` Apify actor.
// Verified against the latest dataset export — top-level keys only:
// id, title, roleId, numApplicants, resumePercentage, coverLetterPercentage,
// salary, phoneNumbers, emails, workTypes, workArrangements, jobLink, applyLink,
// joblocationInfo, content, classificationInfo, employerQuestions, employerVideo,
// listedAt, expiresAtUtc, isExternalApply, isVerified, hasRoleRequirements.
// Note: this actor does NOT return advertiser/company info — it must be
// resolved later (e.g. by fetching the jobLink page) or left blank.
interface ApifyJobLocationInfo {
  area?: string;
  displayLocation?: string;
  location?: string;
  country?: string;
  countryCode?: string;
  suburb?: string;
}

interface ApifyClassificationInfo {
  classification?: string;
  subClassification?: string;
}

interface ApifyJobContent {
  bulletPoints?: string[];
  jobHook?: string;
  unEditedContent?: string;
  sections?: string[];
}

interface ApifyAdvertiser {
  id?: number | string;
  name?: string | null;
  isVerified?: boolean;
  isPrivate?: boolean;
  registrationDate?: string;
  logo?: string | null;
}

interface ApifyCompanyProfile {
  id?: string | null;
  name?: string | null;
  companyNameSlug?: string | null;
  overview?: string | null;
  industry?: string | null;
  size?: string | null;
  website?: string | null;
}

interface ApifyJobItem {
  id?: number | string;
  title?: string;
  jobLink?: string;
  applyLink?: string;
  salary?: string | null;
  workTypes?: string;
  workArrangements?: string;
  joblocationInfo?: ApifyJobLocationInfo;
  content?: ApifyJobContent;
  classificationInfo?: ApifyClassificationInfo;
  listedAt?: string;
  expiresAtUtc?: string;
  isExternalApply?: boolean;
  isVerified?: boolean;
  numApplicants?: number;
  // Present in the Full Actor output (and ignored if absent on lite runs).
  advertiser?: ApifyAdvertiser | null;
  companyProfile?: ApifyCompanyProfile | null;
  companyOpenJobs?: string | null;
  recruiterProfile?: {
    name?: string | null;
    agencyName?: string | null;
  } | null;
}

// Pick the best company-name candidate from a scraped job, regardless of
// which SEEK scraper variant (Full vs Lite) produced it. Returns "" if
// nothing usable is present so callers can decide on a placeholder.
function pickCompanyName(item: ApifyJobItem): string {
  const candidates = [
    item.advertiser?.name,
    item.companyProfile?.name,
    // Recruiter agencies post on behalf of companies; fall back only when
    // neither advertiser nor companyProfile gave us a real name.
    item.recruiterProfile?.agencyName,
  ];
  for (const c of candidates) {
    if (typeof c === "string") {
      const trimmed = c.trim();
      // Filter out the actor's "N/A" placeholder and the obvious "Unknown".
      if (trimmed && trimmed.toUpperCase() !== "N/A" && trimmed.toLowerCase() !== "unknown") {
        return trimmed;
      }
    }
  }
  return "";
}

// Format an ISO timestamp (e.g. "2026-06-09T23:57:46.237Z") to
// a short human-readable date for the UI: "9 Jun 2026".
function formatListedAt(iso: string | undefined | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const marketingSubclasses = [
  { id: "6009", name: "Brand Management" },
  { id: "6010", name: "Digital Search Marketing" },
  { id: "6011", name: "Direct Marketing & CRM" },
  { id: "6012", name: "Event Management" },
  { id: "6013", name: "Internal Communications" },
  { id: "6014", name: "Management" },
  { id: "6015", name: "Market Research & Analysis" },
  { id: "6016", name: "Marketing Assistants & Coordinators" },
  { id: "6017", name: "Marketing Communications" },
  { id: "6018", name: "Product Management & Development" },
  { id: "6019", name: "Public Relations & Corporate Affairs" },
  { id: "6020", name: "Trade Marketing" },
  { id: "6021", name: "Other" }
];

export function JobScraper({ onJobsChange, existingJobs, onSwitchTab }: JobScraperProps) {
  const { toast } = useToast();
  
  // Apify credentials live as a backend secret (APIFY_API_TOKEN) and are used
  // by the `apify-scrape` edge function. The token is never exposed to the browser.


  // Subclassification Selection states matching user screenshot
  const [isSubclassOpen, setIsSubclassOpen] = useState(true);
  const [selectedSubclasses, setSelectedSubclasses] = useState<string[]>(() => [
    "6009", "6010", "6012", "6015", "6016", "6017", "6018", "6019", "6020"
  ]);

  const handleToggleSubclass = (id: string) => {
    if (selectedSubclasses.includes(id)) {
      setSelectedSubclasses(selectedSubclasses.filter(item => item !== id));
    } else {
      setSelectedSubclasses([...selectedSubclasses, id]);
    }
  };

  const handleToggleAllSubclasses = (checked: boolean) => {
    if (checked) {
      setSelectedSubclasses(marketingSubclasses.map(s => s.id));
    } else {
      setSelectedSubclasses([]);
    }
  };

  const isAllSubclassesChecked = selectedSubclasses.length > 0;

  // Search parameters
  const [searchMode, setSearchMode] = useState<"form" | "url">("form");
  const [keywords, setKeywords] = useState("Marketing Coordinator");
  const [isCustomKeywords, setIsCustomKeywords] = useState(false);
  const [location, setLocation] = useState("Sydney CBD, Inner West & Eastern Suburbs Sydney NSW");
  const [isCustomLocation, setIsCustomLocation] = useState(false);
  const [workType, setWorkType] = useState<string>("any");
  const [maxResults, setMaxResults] = useState<number>(20);
  const [customUrl, setCustomUrl] = useState("");

  // Scraping status
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeStatus, setScrapeStatus] = useState<string>("");
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  
  // Scraped results
  const [scrapedJobs, setScrapedJobs] = useState<ScrapedJob[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const pollingTimeoutRef = useRef<number | null>(null);




  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (pollingTimeoutRef.current) {
        window.clearTimeout(pollingTimeoutRef.current);
      }
    };
  }, []);

  const handleStartScrape = async () => {
    if (!apiToken.trim()) {
      toast({
        title: "Missing API Token",
        description: "Please make sure your Apify API Token is configured.",
        variant: "destructive",
      });
      return;
    }

    setIsScraping(true);
    setScrapedJobs([]);
    setScrapeStatus("Preparing request...");
    
    // Construct payload (using strict type validation)
    interface ApifyPayload {
      maxResults: number;
      searchUrl?: string;
      searchTerm?: string;
      location?: string;
      classificationIds?: string[];
      subclassificationIds?: string[];
    }
    const payload: ApifyPayload = { maxResults };

    if (searchMode === "url") {
      if (!customUrl.trim()) {
        toast({
          title: "Missing URL",
          description: "Please enter a valid Seek search URL.",
          variant: "destructive",
        });
        setIsScraping(false);
        return;
      }
      payload.searchUrl = customUrl.trim();
    } else {
      if (!keywords.trim()) {
        toast({
          title: "Missing Keywords",
          description: "Please enter keywords or job title to search.",
          variant: "destructive",
        });
        setIsScraping(false);
        return;
      }

      // If work type is specified, we build a SEEK URL to ensure SEEK filters are properly applied
      if (workType !== "any") {
        const queryKeywords = encodeURIComponent(keywords.trim());
        const queryWhere = encodeURIComponent(location.trim());
        payload.searchUrl = `https://www.seek.com.au/jobs?keywords=${queryKeywords}&where=${queryWhere}&worktype=${workType}`;
      } else {
        payload.searchTerm = keywords.trim();
        if (location.trim()) {
          payload.location = location.trim();
        }
      }
    }

    try {
      setScrapeStatus("Starting Apify Actor (websift/seek-job-scraper)...");
      
      const response = await fetch(
        `https://api.apify.com/v2/acts/websift~seek-job-scraper/runs?token=${apiToken}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Failed to start run: ${errText || response.statusText}`);
      }

      const result = await response.json();
      const runId = result.data.id;
      const datasetId = result.data.defaultDatasetId;
      
      setActiveRunId(runId);
      setScrapeStatus("Actor started. Scraping Seek listings...");
      
      // Start polling status
      pollRunStatus(runId, datasetId);

    } catch (error) {
      console.error("Scraping error:", error);
      toast({
        title: "Scrape Failed to Start",
        description: error instanceof Error ? error.message : "Failed to initiate Apify Actor.",
        variant: "destructive",
      });
      setIsScraping(false);
      setScrapeStatus("");
    }
  };

  const pollRunStatus = async (runId: string, datasetId: string) => {
    try {
      const response = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${apiToken}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to poll status: ${response.statusText}`);
      }

      const result = await response.json();
      const status = result.data.status;
      
      if (status === "SUCCEEDED") {
        setScrapeStatus("Scrape successful! Fetching results...");
        await fetchDatasetItems(datasetId);
      } else if (status === "FAILED") {
        throw new Error("Apify actor run failed.");
      } else if (status === "ABORTED") {
        throw new Error("Apify actor run was aborted.");
      } else if (status === "TIMED-OUT") {
        throw new Error("Apify actor run timed out.");
      } else {
        // Still running, check again in 2 seconds
        setScrapeStatus(`Scraper is active (Status: ${status}). Checking progress...`);
        pollingTimeoutRef.current = window.setTimeout(() => {
          pollRunStatus(runId, datasetId);
        }, 2500);
      }
    } catch (error) {
      console.error("Polling error:", error);
      toast({
        title: "Scraping Process Interrupted",
        description: error instanceof Error ? error.message : "An error occurred during polling.",
        variant: "destructive",
      });
      setIsScraping(false);
      setActiveRunId(null);
      setScrapeStatus("");
    }
  };

  const fetchDatasetItems = async (datasetId: string) => {
    try {
      const response = await fetch(
        `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apiToken}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch dataset: ${response.statusText}`);
      }

      const items = await response.json();
      
      if (!Array.isArray(items)) {
        throw new Error("Invalid dataset returned from Apify.");
      }

      const formattedJobs: ScrapedJob[] = (items as ApifyJobItem[]).map((item: ApifyJobItem, index: number) => {
        const jobId = item.id != null ? String(item.id) : `scraped-${Date.now()}-${index}`;
        const jobTitle = item.title ?? "";
        const jobLink = item.jobLink ?? `https://www.seek.com.au/job/${jobId}`;
        const location = item.joblocationInfo?.displayLocation ?? "";
        const jobType = [item.workTypes, item.workArrangements]
          .filter(Boolean)
          .join(" · ");
        const salaryLabel = item.salary ?? "";
        const listingDateDisplay = formatListedAt(item.listedAt);
        const teaser = item.content?.jobHook ?? "";
        // unEditedContent is HTML; strip tags for a plain-text description preview.
        const rawDescription = item.content?.unEditedContent ?? "";
        const jobDescription = rawDescription
          ? rawDescription.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
          : teaser;
        // Full Actor returns advertiser.name / companyProfile.name. The lite
        // variant doesn't, in which case pickCompanyName returns "" and the
        // Setup tab's inline-edit pencil lets the user fill it in.
        const companyName = pickCompanyName(item);
        return {
          jobId,
          jobTitle,
          jobLink,
          companyName,
          location,
          jobType,
          salaryLabel,
          listingDateDisplay,
          teaser,
          jobDescription,
          selected: true, // Default to selected for easy import
        };
      });

      setScrapedJobs(formattedJobs);
      setScrapeStatus("");
      setIsScraping(false);
      setActiveRunId(null);

      toast({
        title: "Scrape Complete!",
        description: `Successfully scraped ${formattedJobs.length} jobs.`,
      });
    } catch (error) {
      console.error("Dataset fetch error:", error);
      toast({
        title: "Failed to Fetch Jobs",
        description: error instanceof Error ? error.message : "Failed to retrieve scraped job items.",
        variant: "destructive",
      });
      setIsScraping(false);
      setActiveRunId(null);
      setScrapeStatus("");
    }
  };

  const handleAbortScrape = async () => {
    if (!activeRunId) return;

    try {
      setScrapeStatus("Aborting scraper run...");
      
      const response = await fetch(
        `https://api.apify.com/v2/actor-runs/${activeRunId}/abort?token=${apiToken}`,
        { method: "POST" }
      );

      if (!response.ok) {
        throw new Error("Failed to abort on Apify. Stopping client polling.");
      }

      toast({
        title: "Scrape Aborted",
        description: "Scraping session has been canceled successfully.",
      });
    } catch (err) {
      console.error("Abort error:", err);
      toast({
        title: "Failed to Abort Run",
        description: "Could not request abort on Apify, but stopping client process.",
        variant: "destructive",
      });
    } finally {
      if (pollingTimeoutRef.current) {
        window.clearTimeout(pollingTimeoutRef.current);
      }
      setIsScraping(false);
      setActiveRunId(null);
      setScrapeStatus("");
    }
  };

  const toggleJobSelect = (jobId: string) => {
    setScrapedJobs(
      scrapedJobs.map((j) =>
        j.jobId === jobId ? { ...j, selected: !j.selected } : j
      )
    );
  };

  const handleSelectAll = () => {
    setScrapedJobs(scrapedJobs.map((j) => ({ ...j, selected: true })));
  };

  const handleDeselectAll = () => {
    setScrapedJobs(scrapedJobs.map((j) => ({ ...j, selected: false })));
  };

  // Direct Import
  const handleImportSelected = () => {
    const selected = scrapedJobs.filter((j) => j.selected);

    if (selected.length === 0) {
      toast({
        title: "No Jobs Selected",
        description: "Please check the box next to at least one job listing to import.",
        variant: "destructive",
      });
      return;
    }

    const mappedJobs: JobTarget[] = selected.map((j) => ({
      id: `job-scraped-${j.jobId}`,
      companyName: j.companyName,
      companyUrl: j.jobLink,
      position: j.jobTitle,
      jobDescription: j.jobDescription || j.teaser || "",
      location: j.location,
      workType: j.jobType,
      postedAt: j.listingDateDisplay,
      selected: true, // Default imported jobs to checked
    }));

    onJobsChange([...existingJobs, ...mappedJobs]);
    
    toast({
      title: "Jobs Imported",
      description: `Added ${selected.length} jobs to your Target Jobs list.`,
    });

    onSwitchTab("setup");
  };

  // Export to CSV/Excel
  const handleExportCSV = () => {
    const targets = scrapedJobs.filter(j => j.selected).length > 0
      ? scrapedJobs.filter(j => j.selected)
      : scrapedJobs;

    if (targets.length === 0) {
      toast({
        title: "No Data to Export",
        description: "Please scrape jobs first or select jobs to export.",
        variant: "destructive",
      });
      return;
    }

    const headers = ["Position", "Company", "Location", "Work Type", "Salary", "Seek URL", "Teaser Summary", "Full Description"];
    
    const escapeCSV = (val: string) => {
      if (val === null || val === undefined) return "";
      let formatted = val.toString().replace(/"/g, '""'); // Escape double quotes
      if (formatted.includes(",") || formatted.includes("\n") || formatted.includes('"')) {
        formatted = `"${formatted}"`;
      }
      return formatted;
    };

    const csvRows = [
      headers.join(","),
      ...targets.map((j) => [
        escapeCSV(j.jobTitle),
        escapeCSV(j.companyName),
        escapeCSV(j.location),
        escapeCSV(j.jobType),
        escapeCSV(j.salaryLabel),
        escapeCSV(j.jobLink),
        escapeCSV(j.teaser),
        escapeCSV(j.jobDescription || j.teaser)
      ].join(","))
    ];

    // Prepend UTF-8 BOM (\uFEFF) to make Excel load it correctly
    const csvContent = "\uFEFF" + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Seek_Scraped_Jobs_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Excel/CSV Exported",
      description: `Downloaded spreadsheet containing ${targets.length} jobs.`,
    });
  };

  const selectedCount = scrapedJobs.filter((j) => j.selected).length;

  return (
    <div className="space-y-6">
      {/* Main Scraper Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-bold">
            <Search className="h-5 w-5 text-primary" />
            Seek Job Scraper
          </CardTitle>
          <CardDescription>
            Search jobs on Seek Australia, filter results, and download them as an Excel sheet or import them straight to the Resume Architect.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tab Selector for Form vs URL */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setSearchMode("form")}
              className={`pb-2.5 px-4 font-medium text-sm transition-all border-b-2 -mb-[2px] ${
                searchMode === "form" 
                  ? "border-primary text-primary" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Search Filters
            </button>
            <button
              onClick={() => setSearchMode("url")}
              className={`pb-2.5 px-4 font-medium text-sm transition-all border-b-2 -mb-[2px] ${
                searchMode === "url" 
                  ? "border-primary text-primary" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Direct Seek URL
            </button>
          </div>

          {searchMode === "form" ? (
            <div className="space-y-6">
              <div className="grid md:grid-cols-4 gap-4 items-end">
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="keywords">Keywords / Job Title</Label>
                  <Select 
                    value={isCustomKeywords ? "custom" : keywords} 
                    onValueChange={(val) => {
                      if (val === "custom") {
                        setIsCustomKeywords(true);
                        setKeywords("");
                      } else {
                        setIsCustomKeywords(false);
                        setKeywords(val);
                      }
                    }} 
                    disabled={isScraping}
                  >
                    <SelectTrigger id="keywords" className="w-full">
                      <SelectValue placeholder="Select job role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Marketing Coordinator">Marketing Coordinator</SelectItem>
                      <SelectItem value="AI Marketing Specialist">AI Marketing Specialist</SelectItem>
                      <SelectItem value="Digital Marketing Specialist">Digital Marketing Specialist</SelectItem>
                      <SelectItem value="Growth Marketing Coordinator">Growth Marketing Coordinator</SelectItem>
                      <SelectItem value="Content Marketing Specialist">Content Marketing Specialist</SelectItem>
                      <SelectItem value="Marketing Operations Specialist">Marketing Operations Specialist</SelectItem>
                      <SelectItem value="Social Media Coordinator">Social Media Coordinator</SelectItem>
                      <SelectItem value="SEO & Content Coordinator">SEO & Content Coordinator</SelectItem>
                      <SelectItem value="Marketing Analyst">Marketing Analyst</SelectItem>
                      <SelectItem value="custom">Custom Job Title...</SelectItem>
                    </SelectContent>
                  </Select>

                  {isCustomKeywords && (
                    <div className="relative mt-2 font-normal">
                      <Input
                        value={keywords}
                        onChange={(e) => setKeywords(e.target.value)}
                        placeholder="Type custom job keywords"
                        disabled={isScraping}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="location">Location</Label>
                  <Select 
                    value={isCustomLocation ? "custom" : location} 
                    onValueChange={(val) => {
                      if (val === "custom") {
                        setIsCustomLocation(true);
                        setLocation("");
                      } else {
                        setIsCustomLocation(false);
                        setLocation(val);
                      }
                    }} 
                    disabled={isScraping}
                  >
                    <SelectTrigger id="location" className="w-full">
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sydney CBD, Inner West & Eastern Suburbs Sydney NSW">
                        Sydney CBD, Inner West & Eastern Suburbs
                      </SelectItem>
                      <SelectItem value="Sydney NSW 2000">
                        Sydney NSW 2000
                      </SelectItem>
                      <SelectItem value="Wollongong, Illawarra & South Coast NSW">
                        Wollongong, Illawarra & South Coast
                      </SelectItem>
                      <SelectItem value="custom">
                        Custom Location...
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {isCustomLocation && (
                    <div className="relative mt-2 font-normal">
                      <Input
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Type Seek Location (e.g. Melbourne VIC)"
                        disabled={isScraping}
                      />
                      <MapPin className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="work-type">Work Type</Label>
                  <Select value={workType} onValueChange={setWorkType} disabled={isScraping}>
                    <SelectTrigger id="work-type" className="w-full">
                      <SelectValue placeholder="Select work type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any (Default)</SelectItem>
                      <SelectItem value="fulltime">Full Time</SelectItem>
                      <SelectItem value="parttime">Part Time</SelectItem>
                      <SelectItem value="contract">Contract/Temp</SelectItem>
                      <SelectItem value="casual">Casual/Vacation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="max-results">Max Results</Label>
                  <Select 
                    value={String(maxResults)} 
                    onValueChange={(val) => setMaxResults(Number(val))} 
                    disabled={isScraping}
                  >
                    <SelectTrigger id="max-results" className="w-full">
                      <SelectValue placeholder="Select limit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 results</SelectItem>
                      <SelectItem value="20">20 results</SelectItem>
                      <SelectItem value="50">50 results</SelectItem>
                      <SelectItem value="100">100 results</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Collapsible Subclassification Selection (matching user mockup) */}
              <div className="border border-border rounded-lg bg-card text-card-foreground overflow-hidden">
                <div 
                  onClick={() => setIsSubclassOpen(!isSubclassOpen)}
                  className="flex items-center gap-2 p-4 cursor-pointer hover:bg-muted/10 transition-colors select-none"
                >
                  {isSubclassOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="font-semibold text-sm text-foreground">
                    Marketing Communications Subclassification
                  </span>
                </div>
                {isSubclassOpen && (
                  <div className="p-4 pt-0 border-t border-border/50 divide-y divide-border/20 max-h-[350px] overflow-y-auto">
                    {/* All subclasses switch */}
                    <div className="flex items-center gap-3 py-2.5 pl-4 hover:bg-muted/5 rounded-md transition-colors">
                      <Switch
                        checked={isAllSubclassesChecked}
                        onCheckedChange={handleToggleAllSubclasses}
                        className="data-[state=checked]:bg-green-500"
                        disabled={isScraping}
                      />
                      <span className="text-sm font-semibold text-foreground flex items-center gap-1.5 select-none">
                        All Marketing Communications Subclasses
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/80 cursor-help" />
                      </span>
                    </div>

                    {/* Individual subclass list */}
                    {marketingSubclasses.map((subclass) => {
                      const isChecked = selectedSubclasses.includes(subclass.id);
                      return (
                        <div 
                          key={subclass.id} 
                          className="flex items-center gap-3 py-2.5 pl-4 hover:bg-muted/5 rounded-md transition-colors"
                        >
                          <Switch
                            checked={isChecked}
                            onCheckedChange={() => handleToggleSubclass(subclass.id)}
                            className="data-[state=checked]:bg-green-500"
                            disabled={isScraping}
                          />
                          <span className="text-sm font-semibold text-foreground flex items-center gap-1.5 select-none">
                            {subclass.name}
                            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/80 cursor-help" />
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-4 gap-4 items-end">
              <div className="space-y-1.5 md:col-span-3">
                <Label htmlFor="custom-url" className="flex items-center gap-1">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  Seek Search URL
                </Label>
                <Input
                  id="custom-url"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="e.g. https://www.seek.com.au/jobs-in-information-communication-technology/software-development?keywords=React"
                  disabled={isScraping}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="max-results-url">Max Results</Label>
                <Select 
                  value={String(maxResults)} 
                  onValueChange={(val) => setMaxResults(Number(val))} 
                  disabled={isScraping}
                >
                  <SelectTrigger id="max-results-url" className="w-full">
                    <SelectValue placeholder="Select limit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 results</SelectItem>
                    <SelectItem value="20">20 results</SelectItem>
                    <SelectItem value="50">50 results</SelectItem>
                    <SelectItem value="100">100 results</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Action Trigger */}
          <div className="flex gap-3">
            {!isScraping ? (
              <Button onClick={handleStartScrape} className="flex-1 py-5" size="lg">
                <Search className="mr-2 h-5 w-5" />
                Scrape Seek Jobs
              </Button>
            ) : (
              <div className="flex flex-col w-full gap-3 bg-primary/5 border border-primary/20 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="font-semibold text-sm text-primary">{scrapeStatus}</span>
                  </div>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={handleAbortScrape}
                    className="flex items-center gap-1"
                  >
                    <XCircle className="h-4 w-4" />
                    Cancel Scrape
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  The Apify Actor takes about 15-45 seconds to spin up, scrape Seek listings, and parse them.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      {scrapedJobs.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-3 flex md:flex-row flex-col justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Scraped Listings ({scrapedJobs.length})
              </CardTitle>
              <CardDescription>
                {selectedCount} jobs selected for import or export.
              </CardDescription>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExportCSV}
                className="flex-1 md:flex-initial"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Excel (CSV)
              </Button>
              <Button 
                onClick={handleImportSelected}
                size="sm"
                className="flex-1 md:flex-initial bg-primary hover:bg-primary/90"
              >
                <Import className="h-4 w-4 mr-2" />
                Import Selected ({selectedCount})
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-0">
            <div className="px-6 flex justify-between border-b pb-3 text-sm">
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="h-8 px-2" onClick={handleSelectAll}>
                  Select All
                </Button>
                <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground" onClick={handleDeselectAll}>
                  Deselect All
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[500px]">
              <div className="divide-y divide-border">
                {scrapedJobs.map((job) => (
                  <div 
                    key={job.jobId} 
                    className={`p-6 transition-colors flex items-start gap-4 ${
                      job.selected ? "bg-primary/5" : "hover:bg-muted/50"
                    }`}
                  >
                    <Checkbox
                      checked={job.selected}
                      onCheckedChange={() => toggleJobSelect(job.jobId)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="font-semibold text-lg text-foreground hover:underline">
                            <a href={job.jobLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                              {job.jobTitle}
                              <Globe className="h-4 w-4 text-muted-foreground inline" />
                            </a>
                          </h4>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                            {job.companyName ? (
                              <span className="flex items-center gap-1.5 font-medium text-foreground/80">
                                <Building2 className="h-4 w-4" />
                                {job.companyName}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 text-muted-foreground/60 italic">
                                <Building2 className="h-4 w-4" />
                                Company not in scrape (open job link to view)
                              </span>
                            )}
                            {job.location && (
                              <span className="flex items-center gap-1.5">
                                <MapPin className="h-4 w-4" />
                                {job.location}
                              </span>
                            )}
                            {job.jobType && (
                              <span className="flex items-center gap-1.5">
                                <Briefcase className="h-4 w-4" />
                                {job.jobType}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          {job.listingDateDisplay && (
                            <span className="flex items-center gap-1 justify-end">
                              <Calendar className="h-3 w-3" />
                              {job.listingDateDisplay}
                            </span>
                          )}
                          {job.salaryLabel && (
                            <span className="flex items-center gap-0.5 justify-end mt-1 text-primary font-semibold text-xs bg-primary/10 px-2 py-0.5 rounded-full">
                              <DollarSign className="h-3.5 w-3.5" />
                              {job.salaryLabel}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {job.teaser && (
                        <div className="bg-muted/40 p-3 rounded text-sm text-muted-foreground line-clamp-2 italic">
                          {job.teaser}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
