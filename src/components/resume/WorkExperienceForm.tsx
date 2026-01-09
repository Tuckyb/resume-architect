import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WorkExperience } from "@/types/resume";
import { Plus, Trash2 } from "lucide-react";

interface Props {
  data: WorkExperience[];
  onChange: (data: WorkExperience[]) => void;
}

export function WorkExperienceForm({ data, onChange }: Props) {
  const addExperience = () => {
    onChange([
      ...data,
      {
        id: crypto.randomUUID(),
        title: "",
        company: "",
        period: "",
        responsibilities: [""],
      },
    ]);
  };

  const removeExperience = (id: string) => {
    onChange(data.filter((exp) => exp.id !== id));
  };

  const updateExperience = (id: string, field: keyof WorkExperience, value: string | string[]) => {
    onChange(
      data.map((exp) => (exp.id === id ? { ...exp, [field]: value } : exp))
    );
  };

  const updateResponsibility = (expId: string, index: number, value: string) => {
    const exp = data.find((e) => e.id === expId);
    if (!exp) return;
    const newResponsibilities = [...exp.responsibilities];
    newResponsibilities[index] = value;
    updateExperience(expId, "responsibilities", newResponsibilities);
  };

  const addResponsibility = (expId: string) => {
    const exp = data.find((e) => e.id === expId);
    if (!exp) return;
    updateExperience(expId, "responsibilities", [...exp.responsibilities, ""]);
  };

  const removeResponsibility = (expId: string, index: number) => {
    const exp = data.find((e) => e.id === expId);
    if (!exp) return;
    const newResponsibilities = exp.responsibilities.filter((_, i) => i !== index);
    updateExperience(expId, "responsibilities", newResponsibilities);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Work Experience</h3>
        <Button type="button" variant="outline" size="sm" onClick={addExperience}>
          <Plus className="mr-2 h-4 w-4" />
          Add Experience
        </Button>
      </div>

      {data.map((exp, expIndex) => (
        <div key={exp.id} className="rounded-lg border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Position {expIndex + 1}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeExperience(exp.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Job Title *</Label>
              <Input
                value={exp.title}
                onChange={(e) => updateExperience(exp.id, "title", e.target.value)}
                placeholder="Marketing Strategy Consultant"
              />
            </div>
            <div className="space-y-2">
              <Label>Company *</Label>
              <Input
                value={exp.company}
                onChange={(e) => updateExperience(exp.id, "company", e.target.value)}
                placeholder="Purple Patch Consulting"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Period</Label>
              <Input
                value={exp.period}
                onChange={(e) => updateExperience(exp.id, "period", e.target.value)}
                placeholder="2022–2023"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Responsibilities & Achievements</Label>
            {exp.responsibilities.map((resp, respIndex) => (
              <div key={respIndex} className="flex gap-2">
                <Textarea
                  value={resp}
                  onChange={(e) => updateResponsibility(exp.id, respIndex, e.target.value)}
                  placeholder="Describe your responsibility or achievement..."
                  className="min-h-[60px]"
                />
                {exp.responsibilities.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeResponsibility(exp.id, respIndex)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => addResponsibility(exp.id)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Responsibility
            </Button>
          </div>
        </div>
      ))}

      {data.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No work experience added yet. Click "Add Experience" to get started.
        </p>
      )}
    </div>
  );
}
