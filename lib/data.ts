import React from "react";
import { CgWorkAlt } from "react-icons/cg";
import { FaReact } from "react-icons/fa";
import { LuGraduationCap } from "react-icons/lu";
import corpcommentImg from "@/public/corpcomment.png";
import rmtdevImg from "@/public/rmtdev.png";
import wordanalyticsImg from "@/public/wordanalytics.png";

export const links = [
  {
    name: "Home",
    hash: "#home",
  },
  {
    name: "About",
    hash: "#about",
  },
  {
    name: "Projects",
    hash: "#projects",
  },
  {
    name: "Skills",
    hash: "#skills",
  },
  {
    name: "Experience",
    hash: "#experience",
  },
  {
    name: "Contact",
    hash: "#contact",
  },
] as const;

export const experiencesData = [
  {
    title: "MERN Stack Developer",
    location: "Begusarai ,Bihar",
    description: "I completed my 6-month MERN Stack Course by CodeHelp, where I learned about React.js, Tailwind CSS, Express, and MongoDB.",
    icon: React.createElement(LuGraduationCap),
    date: "2023",
  },
  {
    title: "Front-End Developer Intern",
    location: "Remote",
    description: "I worked as a front- end intern at iMeet Technologies for 3 months, where I worked on React.js, Tailwind CSS, Next.js, Express.js, and MongoDB.During my internship, I built a website for iMeet and created the UI for an edtech website.",
    icon: React.createElement(CgWorkAlt),
    date: "April 2023 - July 2023",
  },
  {
    title: "Front-End Engineer Intern",
    location: "Remote",
    description: "I worked as a Front-End Engineer Intern at Echo, where I managed their website software solutions, built UIs, and managed software. My tech stack included React.js, Material-UI, Highcharts, and xlsx."
    ,
    icon: React.createElement(FaReact),
    date: "July-2023 - May 2024",
  },
] as const;

export const projectsData = [
  {
    title: "Tamoato Foodcommerce",
    description:
      "I have built a food commerce store with a dashboard and a buying page. On the dashboard, sellers can upload products, and buyers can purchase them. The store is integrated with the Stripe payment gateway.",
    tags: ["React", "Express js", "MongoDB", "Tailwind", "Stripe"],
    imageUrl: corpcommentImg,
  },
  {
    title: "rmtDev",
    description:
      "Job board for remote developer jobs. I was the front-end developer. It has features like filtering, sorting and pagination.",
    tags: ["React", "TypeScript", "Next.js", "Tailwind", "Redux"],
    imageUrl: rmtdevImg,
  },
  {
    title: "Word Analytics",
    description:
      "A public web app for quick analytics on text. It shows word count, character count and social media post limits.",
    tags: ["React", "Next.js", "SQL", "Tailwind", "Framer"],
    imageUrl: wordanalyticsImg,
  },
] as const;

export const skillsData = [
  "HTML",
  "CSS",
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "Git",
  "Tailwind",
  "Prisma",
  "MongoDB",
  "Redux",
  "GraphQL",
  "Apollo",
  "Express",
  "PostgreSQL",
  "Python",
  "Django",
  "Framer Motion",
  "Wordpress",
  "Vs Code"
] as const;
