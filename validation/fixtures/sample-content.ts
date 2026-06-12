// Fixtures for validating the deterministic Styalized renderer.
// Content mirrors the approved examples (public/examples/styled-resume.pdf
// and styled-coverletter.pdf) so rendered output can be compared 1:1.

import type {
  CoverLetterContent,
  PersonalInfo,
  Reference,
  ResumeContent,
} from "../../supabase/functions/_shared/styalized.ts";

export const samplePersonalInfo: PersonalInfo = {
  fullName: "Thomas Condran",
  email: "thomas_condran@y7mail.com",
  phone: "0435 741 817",
  address: "Keiraville, NSW",
  linkedIn: "https://www.linkedin.com/in/thomas-condran",
  portfolio: "https://thomascportfolio.online",
};

export const sampleReferences: Reference[] = [
  {
    name: "Elias Kyriazis",
    title: "Senior Lecturer, University of Wollongong",
    contact: "(04) 25288056",
  },
  {
    name: "Tom Hitchcock",
    title: "Director, Purple Patch Consulting",
    contact: "(04) 33668912",
  },
  {
    name: "Katina Michael",
    title: "Honorary Professor, University of Wollongong",
    contact: "Katina@uow.edu.au",
  },
  {
    name: "Christine Gillies",
    title: "Clinical Psychologist",
    contact: "0435 741 817",
  },
];

export const sampleResumeContent: ResumeContent = {
  roleTitle: "Communications & Marketing Professional",
  descriptor: "Marketing & AI Systems",
  capabilities: [
    {
      title: "Strategic Communications & Engagement",
      items:
        "Communications strategy, stakeholder engagement, community-focused content, copywriting, internal & external comms, public awareness campaigns.",
    },
    {
      title: "Marketing & Brand Management",
      items:
        "Strategic marketing planning, social media management, campaign delivery, brand positioning, audience research, digital marketing.",
    },
    {
      title: "Events & Community Participation",
      items:
        "Event coordination support, stakeholder liaison, community engagement, workshop & meeting coordination, relationship management.",
    },
    {
      title: "Governance, Reporting & Delivery",
      items:
        "Strategic planning, performance reporting, project coordination, documentation & QA, budget awareness, executive support.",
    },
  ],
  tools: [
    "Google Analytics",
    "Marketing Automation",
    "Claude (Cowork & Code)",
    "Agentic Coding / IDE",
    "Lovable",
    "Gemini Antigravity",
    "Custom Ad Creation Tools",
    "Custom Scraping Tools",
    "CRM Platforms",
    "Reporting Dashboards",
  ],
  profile: [
    "Aboriginal communications and marketing professional delivering <strong>stakeholder engagement, strategic communications and community-focused content programs</strong> across consulting and digital channels.",
    "Demonstrated ability to develop communication strategies, manage cross-functional projects, analyse performance data and translate complex information into clear, accessible messaging. Combines practical experience across consulting, digital communications and stakeholder engagement with strong academic achievement in Marketing and Public Relations — and a commitment to initiatives that strengthen Aboriginal communities, cultural identity and meaningful community participation.",
  ],
  jobs: [
    {
      title: "Marketing Strategy Consultant",
      org: "Purple Patch Consulting",
      dates: "2022–2023",
      bullets: [
        "Developed strategic marketing and communication initiatives aligned with client objectives.",
        "Conducted stakeholder, audience and competitor research to inform engagement activities.",
        "Produced communication materials, campaign assets and reporting documentation supporting organisational goals.",
        "Collaborated with designers, content creators and stakeholders to deliver integrated marketing outcomes.",
        "Contributed to digital engagement across website content, social campaigns and audience growth, monitoring performance to support evidence-based decisions.",
      ],
      win: [
        "Shaped communication strategies informed by market and audience research, improving engagement and organisational visibility.",
        "Delivered high-quality communication outputs within project timeframes.",
      ],
    },
    {
      title: "Freelance Digital Marketing & Communications Consultant",
      org: "Self-Employed · Fiverr",
      dates: "2022–2023",
      bullets: [
        "Delivered communication, content development and marketing projects for a diverse client base.",
        'Developed stakeholder-focused content designed to improve engagement and visibility, including the [PORTFOLIO_LINK text="AI Marketing Automation Suite" url="https://thomascportfolio.online/#tools"] toolset.',
        "Managed timelines and client expectations across multiple concurrent projects.",
        "Prepared performance reports using analytics tools and dashboard reporting systems.",
      ],
      win: [
        "Built reporting dashboards to support campaign measurement and performance evaluation, and delivered strategic content that lifted audience engagement.",
      ],
    },
    {
      title: "Marketing Intern",
      org: "Layby Surgery",
      dates: "2022",
      bullets: [
        "Supported implementation of digital marketing and communication initiatives.",
        "Assisted with website content improvements and user engagement activities.",
        "Researched opportunities for improved stakeholder engagement and prepared aligned content.",
      ],
      win: [
        "Contributed to website optimisation that improved engagement metrics, and built content calendars aligned to audience needs.",
      ],
    },
    {
      title: "Administrative Secretary",
      org: "C.G Psychological Services",
      dates: "2004–2021",
      bullets: [
        "Provided administrative and operational support within a professional services environment.",
        "Coordinated client communications, scheduling and information management processes.",
        "Maintained confidential records and ensured compliance with organisational procedures.",
        "Supported reporting, documentation and day-to-day operational activities.",
      ],
      win: [
        "Managed complex administrative functions with sustained professionalism and confidentiality, supporting effective communication between clients, practitioners and stakeholders.",
      ],
    },
  ],
  pageSplit: 2,
  education: [
    {
      degree: "Bachelor of Commerce (Marketing)",
      institution: "University of Wollongong",
      dates: "2017–2024",
      note: "Distinction-level across Marketing & Public Relations. Market research, consumer behaviour and stakeholder engagement projects.",
      honor: "100/100 in Marketing Strategy · Most Improved Indigenous Student",
    },
    {
      degree: "Certificate IV in Screen & Media Journalism",
      institution: "TAFE NSW",
      dates: "2014",
    },
    {
      degree: "Project Management Studies",
      institution: "TAFE NSW",
      dates: "In progress",
    },
  ],
  certifications: [
    "Google Analytics Certification",
    "Meta Social Media Marketing Essentials",
    "Google Digital Garage — Intro to Google Ads",
    "Agile Marketing Foundations",
  ],
  professionalDevelopment: [
    "Researching & Writing with Generative AI Tools (LinkedIn Learning)",
    "No Code Architects — Level 3 Automation (Skool)",
    "Using AI for Illustrations & Design (LinkedIn Learning)",
    "Visual Content Marketing Strategies (LinkedIn Learning)",
  ],
  projects: [
    {
      title: "Communications & digital engagement",
      bullets: [
        "Built AI-assisted communication and marketing systems to improve efficiency and stakeholder engagement.",
        "Developed reporting dashboards and performance frameworks supporting evidence-based decisions.",
        "Created strategic communication plans and audience-focused content across digital channels.",
      ],
    },
    {
      title: "Innovation & technology",
      bullets: [
        "Designed custom communication and automation tools supporting content creation, research and reporting.",
        "Developed web-based solutions to improve information gathering, analysis and stakeholder engagement.",
        "Applied emerging technologies to streamline communication workflows and organisational efficiency.",
      ],
    },
  ],
  communityNote:
    "As an Aboriginal professional, I am committed to initiatives that strengthen Aboriginal communities, cultural identity and meaningful participation. My academic, professional and personal experiences have reinforced the importance of respectful engagement, collaboration and culturally informed communication practices.",
};

export const sampleCoverLetterContent: CoverLetterContent = {
  roleTitle: "Communications & Marketing Professional",
  descriptor: "Marketing & AI Systems",
  recipientDepartment: "Premier's Department NSW",
  recipientName: "Hiring Manager",
  salutation: "Hiring Manager",
  paragraphs: [
    "Language carries stories, identity, connection and belonging. As an Aboriginal communications and marketing professional, that understanding has shaped the way I approach stakeholder engagement, communication planning and community participation throughout my career. The opportunity to contribute to the <strong>Aboriginal Languages Trust</strong> particularly appeals to me because of its meaningful work supporting language revitalisation across Aboriginal communities in New South Wales.",
    "Across consulting, freelance communications work and community-focused projects, I have developed experience designing communication strategies, creating audience-focused content, analysing engagement data and supporting initiatives that bring together diverse stakeholders. While my background differs from a traditional government communications pathway, it has provided broad exposure to strategic communications, marketing, reporting and engagement activities that align strongly with the objectives of this role.",
    "At <strong>Purple Patch Consulting</strong>, I contributed to communication and marketing initiatives informed by audience and market research, helping shape strategies that improved engagement and organisational visibility. I produced communication materials, stakeholder-focused content and reporting outputs while working collaboratively with clients and project stakeholders to deliver outcomes within required timeframes — strengthening my ability to balance organisational objectives with stakeholder needs.",
    "Through freelance communications and marketing consulting, I have worked across multiple projects simultaneously — developing content, coordinating deliverables, conducting audience research and preparing reporting frameworks to support evidence-based decision-making. Building reporting dashboards and analysing engagement performance reinforced the importance of measuring outcomes, identifying opportunities for improvement and ensuring communication activities remain responsive to community and stakeholder expectations.",
    "A consistent theme throughout my work has been finding practical ways to improve communication effectiveness. I have developed AI-assisted communication systems, reporting tools and automation processes that support content creation, research and information analysis. While technology is only one part of effective engagement, I value approaches that reduce administrative burden, improve access to information and support more informed decision-making — a mindset that aligns well with the Trust's responsibility to communicate clearly and demonstrate impact through high-quality reporting.",
    "The community focus of this role is particularly important to me. As an Aboriginal person, I understand the significance of respectful engagement, cultural integrity and genuine partnership with communities. My academic, professional and personal experiences have reinforced the value of listening carefully, building trust and ensuring communication activities are grounded in the perspectives and aspirations of the communities they are intended to support.",
    "I hold a <strong>Bachelor of Commerce (Marketing)</strong> from the University of Wollongong — distinction-level results including a perfect score in Marketing Strategy — alongside ongoing development in analytics, AI systems and project management. I would welcome the opportunity to discuss how my experience and commitment to Aboriginal communities could support the Trust's objectives.",
  ],
  closing: "Kind regards,",
};

export const sampleOrganisation = "Aboriginal Languages Trust";

// Degenerate fixture: sparse candidate, no refs/portfolio/notes.
export const minimalPersonalInfo: PersonalInfo = {
  fullName: "Jane Citizen",
  email: "jane@example.com",
  phone: "0400 000 000",
  address: "Sydney, NSW",
};

export const minimalResumeContent: ResumeContent = {
  roleTitle: "Project Coordinator",
  capabilities: [
    { title: "Project Delivery", items: "Scheduling, coordination, reporting, documentation." },
    { title: "Communication", items: "Stakeholder liaison, meeting facilitation, plain-English writing." },
  ],
  tools: ["MS Project", "Excel", "Teams", "SharePoint"],
  profile: [
    "Project coordinator with experience supporting delivery teams across construction and government programs.",
  ],
  jobs: [
    {
      title: "Project Coordinator",
      org: "BuildCo",
      dates: "2021–2024",
      bullets: [
        "Coordinated schedules and budgets across concurrent projects.",
        "Prepared status reports for executive stakeholders.",
      ],
    },
    {
      title: "Site Administrator",
      org: "ConstructIt",
      dates: "2018–2021",
      bullets: [
        "Maintained site records and compliance documentation.",
        "Supported procurement and contractor onboarding.",
      ],
    },
  ],
  pageSplit: 2,
  education: [
    {
      degree: "Diploma of Project Management",
      institution: "TAFE NSW",
      dates: "2018",
    },
  ],
  certifications: [],
};
