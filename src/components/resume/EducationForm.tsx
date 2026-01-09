import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Education } from "@/types/resume";
import { Plus, Trash2 } from "lucide-react";

interface Props {
  data: Education[];
  onChange: (data: Education[]) => void;
}

export function EducationForm({ data, onChange }: Props) {
  const addEducation = () => {
    onChange([
      ...data,
      {
        id: crypto.randomUUID(),
        degree: "",
        institution: "",
        period: "",
        achievements: [],
      },
    ]);
  };

  const removeEducation = (id: string) => {
    onChange(data.filter((edu) => edu.id !== id));
  };

  const updateEducation = (id: string, field: keyof Education, value: string | string[]) => {
    onChange(
      data.map((edu) => (edu.id === id ? { ...edu, [field]: value } : edu))
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Education</h3>
        <Button type="button" variant="outline" size="sm" onClick={addEducation}>
          <Plus className="mr-2 h-4 w-4" />
          Add Education
        </Button>
      </div>

      {data.map((edu, index) => (
        <div key={edu.id} className="rounded-lg border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Education {index + 1}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeEducation(edu.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Degree / Certification *</Label>
              <Input
                value={edu.degree}
                onChange={(e) => updateEducation(edu.id, "degree", e.target.value)}
                placeholder="Bachelor of Commerce – Marketing"
              />
            </div>
            <div className="space-y-2">
              <Label>Institution *</Label>
              <Input
                value={edu.institution}
                onChange={(e) => updateEducation(edu.id, "institution", e.target.value)}
                placeholder="University of Wollongong"
              />
            </div>
            <div className="space-y-2">
              <Label>Period</Label>
              <Input
                value={edu.period}
                onChange={(e) => updateEducation(edu.id, "period", e.target.value)}
                placeholder="2017–2024"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Achievements (comma separated)</Label>
              <Textarea
                value={edu.achievements?.join(", ") || ""}
                onChange={(e) =>
                  updateEducation(
                    edu.id,
                    "achievements",
                    e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                  )
                }
                placeholder="100/100 in Marketing Strategy, Top Graduating Distinction"
              />
            </div>
          </div>
        </div>
      ))}

      {data.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No education added yet. Click "Add Education" to get started.
        </p>
      )}
    </div>
  );
}
