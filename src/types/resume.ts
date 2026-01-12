export interface PersonalInfo {
  fullName: string;
  address: string;
  phone: string;
  email: string;
  linkedIn?: string;
  portfolio?: string;
}

export interface WorkExperience {
  id: string;
  title: string;
  company: string;
  period: string;
  responsibilities: string[];
}

export interface Education {
  id: string;
  degree: string;
  institution: string;
  period: string;
  achievements?: string[];
}

export interface Skill {
  category: string;
  items: string[];
}

export interface JobTarget {
  id: string;
  companyName: string;
  companyUrl?: string;
  position: string;
  jobDescription: string;
  location?: string;
  workType?: string;
  seniority?: string;
  postedAt?: string;
  selected: boolean;
}

export interface Reference {
  name: string;
  title: string;
  contact: string;
}

export interface ParsedResumeData {
  rawText: string;
  personalInfo?: Partial<PersonalInfo>;
  workExperience?: WorkExperience[];
  education?: Education[];
  skills?: Skill[];
  certifications?: string[];
  achievements?: string[];
  references?: Reference[];
}

export interface ResumeData {
  personalInfo: PersonalInfo;
  professionalSummary: string;
  workExperience: WorkExperience[];
  education: Education[];
  skills: string[];
  certifications: string[];
  achievements: string[];
}

export interface ApplicationData {
  resumeData: ResumeData;
  jobTarget: JobTarget;
  documentType: 'resume' | 'cover-letter' | 'both';
}

export interface GeneratedDocument {
  type: 'resume' | 'cover-letter';
  rawContent: string;
  htmlContent: string;
  jobId: string;
}
