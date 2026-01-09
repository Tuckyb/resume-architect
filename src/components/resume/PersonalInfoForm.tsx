import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PersonalInfo } from "@/types/resume";

interface Props {
  data: PersonalInfo;
  onChange: (data: PersonalInfo) => void;
}

export function PersonalInfoForm({ data, onChange }: Props) {
  const handleChange = (field: keyof PersonalInfo, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Personal Information</h3>
      
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name *</Label>
          <Input
            id="fullName"
            value={data.fullName}
            onChange={(e) => handleChange("fullName", e.target.value)}
            placeholder="Thomas Condran"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={data.email}
            onChange={(e) => handleChange("email", e.target.value)}
            placeholder="example@email.com"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="phone">Phone *</Label>
          <Input
            id="phone"
            value={data.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            placeholder="0435 741 817"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            value={data.address}
            onChange={(e) => handleChange("address", e.target.value)}
            placeholder="9 Rose Street, Keiraville, NSW"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="linkedIn">LinkedIn URL</Label>
          <Input
            id="linkedIn"
            value={data.linkedIn || ""}
            onChange={(e) => handleChange("linkedIn", e.target.value)}
            placeholder="https://linkedin.com/in/yourprofile"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="portfolio">Portfolio URL</Label>
          <Input
            id="portfolio"
            value={data.portfolio || ""}
            onChange={(e) => handleChange("portfolio", e.target.value)}
            placeholder="https://yourportfolio.com"
          />
        </div>
      </div>
    </div>
  );
}
