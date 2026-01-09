import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { JobTarget } from "@/types/resume";

interface Props {
  data: JobTarget;
  onChange: (data: JobTarget) => void;
}

export function JobTargetForm({ data, onChange }: Props) {
  const handleChange = (field: keyof JobTarget, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Target Job Details</h3>
      <p className="text-sm text-muted-foreground">
        Provide details about the job you're applying for to generate tailored content.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="companyName">Company Name *</Label>
          <Input
            id="companyName"
            value={data.companyName}
            onChange={(e) => handleChange("companyName", e.target.value)}
            placeholder="Switch Key Digital"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="position">Position *</Label>
          <Input
            id="position"
            value={data.position}
            onChange={(e) => handleChange("position", e.target.value)}
            placeholder="Junior Marketing Coordinator"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="jobDescription">Job Description / Requirements</Label>
        <Textarea
          id="jobDescription"
          value={data.jobDescription}
          onChange={(e) => handleChange("jobDescription", e.target.value)}
          placeholder="Paste the job description or key requirements here..."
          className="min-h-[120px]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="companyValues">Company Values / Culture (Optional)</Label>
        <Textarea
          id="companyValues"
          value={data.companyValues || ""}
          onChange={(e) => handleChange("companyValues", e.target.value)}
          placeholder="Describe the company's values or culture to help personalize the cover letter..."
          className="min-h-[80px]"
        />
      </div>
    </div>
  );
}
