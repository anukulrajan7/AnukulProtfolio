import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projects",
  description: "Open source projects and production apps built by Anukul Raj.",
};

const projects = [
  {
    name: "Wokay",
    description:
      "Real-time workspace app combining chat, task management, and video calling. Built with React, Node.js, WebRTC (mediasoup), and PostgreSQL. Serves growing teams with 1000+ concurrent tasks.",
    tags: ["React", "Node.js", "WebRTC", "PostgreSQL"],
    url: "https://wokay.com",
  },
  {
    name: "DoctorBooking",
    description:
      "Full-stack healthcare platform for booking doctor appointments. Patient and doctor dashboards, scheduling, and Stripe payment integration.",
    tags: ["React", "Express", "MongoDB", "Stripe"],
    url: "https://github.com/anukulrajan7/DoctorBooking",
  },
  {
    name: "Social-X",
    description:
      "Social media application with user feeds, profiles, follow system, likes, and real-time updates built with TypeScript.",
    tags: ["TypeScript", "Next.js", "Tailwind"],
    url: "https://github.com/anukulrajan7/social-x",
  },
  {
    name: "EdTech LMS",
    description:
      "Learning management system with course creation, video lectures, student progress tracking, and admin dashboards.",
    tags: ["React", "Express", "MongoDB"],
    url: "https://github.com/anukulrajan7/edtechLms",
  },
  {
    name: "Uber Clone",
    description:
      "Ride-hailing app with real-time location tracking on maps, ride booking flow, driver-rider matching, and fare calculation.",
    tags: ["React", "Node.js", "Socket.io", "Maps API"],
    url: "https://github.com/anukulrajan7/uberclone",
  },
  {
    name: "Tomato Food Commerce",
    description:
      "Food delivery platform with seller dashboard, product management, cart system, and Stripe payment gateway.",
    tags: ["React", "Express", "MongoDB", "Stripe"],
    url: "https://github.com/anukulrajan7/tomato",
  },
];

export default function ProjectsPage() {
  return (
    <div>
      <h1
        className="text-2xl font-extrabold tracking-tight"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        Projects
      </h1>
      <p className="text-muted mt-2 text-[15px]">
        Things I've built — from side projects to production apps.
      </p>

      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {projects.map((project) => (
          <a
            key={project.name}
            href={project.url}
            target="_blank"
            rel="noopener"
            className="card group"
          >
            <div className="flex items-start justify-between">
              <h3
                className="font-bold text-[15px] group-hover:text-accent transition-colors"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {project.name}
              </h3>
              <ArrowUpRight
                size={14}
                className="text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5"
              />
            </div>
            <p className="text-xs text-muted mt-2 leading-relaxed">
              {project.description}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {project.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] px-2 py-0.5 rounded-md bg-surface border border-border text-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
