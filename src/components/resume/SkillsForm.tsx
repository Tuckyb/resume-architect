import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  skills: string[];
  certifications: string[];
  achievements: string[];
  professionalSummary: string;
  onSkillsChange: (skills: string[]) => void;
  onCertificationsChange: (certifications: string[]) => void;
  onAchievementsChange: (achievements: string[]) => void;
  onSummaryChange: (summary: string) => void;
}

export function SkillsForm({
  skills,
  certifications,
  achievements,
  professionalSummary,
  onSkillsChange,
  onCertificationsChange,
  onAchievementsChange,
  onSummaryChange,
}: Props) {
  const parseCommaSeparated = (value: string): string[] => {
    return value.split(",").map((s) => s.trim()).filter(Boolean);
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-foreground">Skills & Summary</h3>

      <div className="space-y-2">
        <Label htmlFor="summary">Professional Summary</Label>
        <Textarea
          id="summary"
          value={professionalSummary}
          onChange={(e) => onSummaryChange(e.target.value)}
          placeholder="Write a brief professional summary highlighting your key strengths and career objectives..."
          className="min-h-[100px]"
        />
        <p className="text-xs text-muted-foreground">
          Leave blank to let AI generate one based on your experience
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="skills">Skills (comma separated)</Label>
        <Textarea
          id="skills"
          value={skills.join(", ")}
          onChange={(e) => onSkillsChange(parseCommaSeparated(e.target.value))}
          placeholder="Google Analytics, SEMrush, Content Strategy, SEO, Social Media Marketing, Canva, Adobe Suite..."
          className="min-h-[80px]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="certifications">Certifications (comma separated)</Label>
        <Textarea
          id="certifications"
          value={certifications.join(", ")}
          onChange={(e) => onCertificationsChange(parseCommaSeparated(e.target.value))}
          placeholder="Google Analytics Basics, Meta Social Media Marketing Essentials, Google Ads Introduction..."
          className="min-h-[80px]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="achievements">Key Achievements (comma separated)</Label>
        <Textarea
          id="achievements"
          value={achievements.join(", ")}
          onChange={(e) => onAchievementsChange(parseCommaSeparated(e.target.value))}
          placeholder="25% increase in engagement, Perfect score in Marketing Strategy, Most Improved Award..."
          className="min-h-[80px]"
        />
      </div>
    </div>
  );
}
