/**
 * Content sourced from https://abdulmuhaimin.my
 * NPCs and dialogue are generated from these fields.
 */
export interface Job {
  company: string;
  title: string;
  dates: string;
  location?: string;
  bullets: string[];
}

export interface Project {
  name: string;
  blurb: string;
  stack: string[];
  url?: string;
}

export type ResumeProfile = {
  name: string;
  title: string;
  location: string;
  summary: string;
  experience: Job[];
  projects: Project[];
  skills: string[];
  contact: {
    email: string;
    github: string;
    linkedin: string;
    website: string;
    phone?: string;
  };
};

export const PROFILE: ResumeProfile = {
  name: "Abdul Muhaimin bin Md Shahid",
  title: "Full Stack Developer",
  location: "Semenyih, Selangor, Malaysia",
  summary:
    "With over 5 years of hands-on experience in building modern, user-centric web applications, I specialize in full-stack development with a strong focus on frontend technologies such as React, Next.js, and Drupal. At Credence and in previous roles, I have excelled in agile environments—delivering scalable solutions and intuitive user experiences for clients ranging from startups to established tech firms. I'm passionate about remote-first work cultures and believe in leveraging technology to connect, collaborate, and innovate from anywhere in the world.",
  experience: [
    {
      company: "Credence",
      title: "Full Stack Developer",
      dates: "Aug 2024 — present",
      location: "Kuala Lumpur, Malaysia",
      bullets: [
        "Collaborate in an agile team on client systems.",
        "Build and update frontends primarily with Drupal and Next.js.",
        "Ship scalable, intuitive experiences for established tech clients.",
      ],
    },
    {
      company: "Nematix",
      title: "Mid-level Developer",
      dates: "Aug 2023 — Aug 2024",
      location: "Shah Alam, Selangor",
      bullets: [
        "Worked on a data analytics and dashboard management platform.",
        "Focused on the frontend: modules that plug into the larger system.",
      ],
    },
    {
      company: "REKA",
      title: "Frontend Developer",
      dates: "Sep 2021 — Aug 2023",
      location: "Kuala Lumpur, Malaysia",
      bullets: [
        "Built product UIs and client solutions across studio divisions.",
        "Shipped Sanatoria, a Unity horror game, during a 1-month jam.",
      ],
    },
    {
      company: "ELMLAB",
      title: "Web Developer",
      dates: "2020 — Apr 2021",
      location: "Beranang, Selangor",
      bullets: [
        "Web development for studio and client work.",
        "Grew into frontend-heavy full-stack delivery.",
      ],
    },
  ] satisfies Job[],
  projects: [
    {
      name: "Interactive Portfolio",
      blurb:
        "A responsive, interactive portfolio with dynamic layouts, animations, and advanced React components — the site at abdulmuhaimin.my.",
      stack: ["React", "TailwindCSS", "Responsive Design", "3D Animations"],
      url: "https://abdulmuhaimin.my/portfolio",
    },
    {
      name: "SERV Sfera Auto",
      blurb:
        "A comprehensive web app for auto workshop management with secure authentication and role-based access control.",
      stack: ["React", "Firebase", "Bootstrap", "Cloud Functions"],
    },
    {
      name: "Stripe Payment Server",
      blurb:
        "Backend API so multiple apps can take payments through Stripe.",
      stack: ["Node.js", "Express", "MongoDB", "Stripe"],
    },
    {
      name: "Sanatoria",
      blurb:
        "A horror game developed in Unity during a 1-month game jam at REKA.",
      stack: ["Unity", "C#", "3D", "Game Development"],
    },
  ] satisfies Project[],
  skills: [
    "React",
    "TypeScript",
    "Next.js",
    "JavaScript",
    "TailwindCSS",
    "HTML/CSS",
    "Drupal",
    "Node.js",
    "Express",
    "Firebase",
    "MongoDB",
    "Git",
    "CI/CD",
  ],
  contact: {
    email: "abdulmuhaimin.my/contact",
    github: "github.com/abdulmuhaimin-work",
    linkedin: "linkedin.com/in/abdul-muhaimin-md-shahid",
    website: "abdulmuhaimin.my",
    phone: "+60 13-593 2043",
  },
};
