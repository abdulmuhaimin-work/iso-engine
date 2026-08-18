import { PROFILE } from "./profile";
import {
  aboutHtml,
  contactHtml,
  experienceHtml,
  fullSiteHtml,
  projectsHtml,
  skillsHtml,
} from "./pages";
import type { WebPage } from "../engine";

export type ResumeSection =
  | "about"
  | "experience"
  | "projects"
  | "skills"
  | "contact"
  | "site";

export function resumePage(section: ResumeSection): WebPage {
  switch (section) {
    case "about":
      return {
        title: PROFILE.name,
        urlBar: "https://abdulmuhaimin.my/",
        html: aboutHtml(PROFILE),
      };
    case "experience":
      return {
        title: "Experience",
        urlBar: "https://abdulmuhaimin.my/about",
        html: experienceHtml(PROFILE),
      };
    case "projects":
      return {
        title: "Projects",
        urlBar: "https://abdulmuhaimin.my/portfolio",
        html: projectsHtml(PROFILE),
      };
    case "skills":
      return {
        title: "Skills",
        urlBar: "https://abdulmuhaimin.my/#skills",
        html: skillsHtml(PROFILE),
      };
    case "contact":
      return {
        title: "Contact",
        urlBar: "https://abdulmuhaimin.my/contact",
        html: contactHtml(PROFILE),
      };
    case "site":
      return {
        title: "abdulmuhaimin.my",
        urlBar: "https://abdulmuhaimin.my/",
        iframeUrl: "https://abdulmuhaimin.my/",
        html: fullSiteHtml(PROFILE),
      };
  }
}
