import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Work",
  description: "Professional experience — Product Engineer with 3 years building web applications.",
};

const experience = [
  {
    company: "Wokay",
    url: "https://wokay.com",
    roles: [
      {
        title: "Product Engineer 2",
        period: "Jan 2026 — present",
        points: [
          "Owning the task management and chat modules end-to-end for the collaboration platform",
          "Leading frontend architecture decisions — component patterns, state management, performance",
          "Driving product features from design discussion to production deployment",
          "Building virtualized task lists handling 1000+ items with optimized render paths",
        ],
      },
    ],
    location: "Hyderabad",
  },
  {
    company: "Social X",
    url: null,
    roles: [
      {
        title: "Frontend Engineer",
        period: "Sep 2024 — Dec 2025",
        points: [
          "Built the frontend for a social media startup from the ground up",
          "Developed user feeds, profiles, follow system, and real-time interactions",
          "Implemented responsive UI with Next.js, TypeScript, and Tailwind CSS",
          "Worked in a fast-paced startup environment shipping features weekly",
        ],
      },
    ],
    location: "Remote",
  },
  {
    company: "Echo",
    url: null,
    roles: [
      {
        title: "Frontend Engineer Intern",
        period: "Jul 2023 — May 2024",
        points: [
          "Built data visualization dashboards using React, Material-UI, and Highcharts",
          "Managed the company website and internal software tools",
          "Worked with xlsx library for spreadsheet data processing and export",
        ],
      },
    ],
    location: "Remote",
  },
  {
    company: "iMeet Technologies",
    url: null,
    roles: [
      {
        title: "Frontend Developer Intern",
        period: "Apr — Jul 2023",
        points: [
          "Developed the company website and marketing pages",
          "Built UI for an edtech platform using React, Next.js, and Tailwind CSS",
          "Collaborated with design team to implement responsive layouts",
        ],
      },
    ],
    location: "Remote",
  },
];

const skills = [
  "TypeScript", "React", "Next.js", "Node.js", "Tailwind CSS",
  "PostgreSQL", "MongoDB", "Docker", "Git", "Redux",
];

export default function WorkPage() {
  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold tracking-tight">Work</h1>
      <p className="text-muted mt-2">
        3 years building web applications. Currently owning task management and
        chat modules at Wokay.
      </p>

      <div className="mt-12 space-y-12">
        {experience.map((job) => (
          <div key={job.company} className="fade-in">
            <div className="flex items-baseline justify-between flex-wrap gap-2">
              {job.url ? (
                <a href={job.url} target="_blank" rel="noopener" className="font-heading font-bold text-lg hover:text-accent transition-colors">
                  {job.company}
                </a>
              ) : (
                <span className="font-heading font-bold text-lg">{job.company}</span>
              )}
              <span className="text-xs text-muted">{job.location}</span>
            </div>

            <div className="mt-3 space-y-6 border-l-2 border-border pl-5 ml-1">
              {job.roles.map((role) => (
                <div key={role.title}>
                  <div className="flex justify-between items-baseline flex-wrap gap-2">
                    <span className="font-medium text-sm">{role.title}</span>
                    <span className="text-xs text-muted tabular-nums">{role.period}</span>
                  </div>
                  <ul className="mt-2 space-y-1.5">
                    {role.points.map((point, i) => (
                      <li key={i} className="text-sm text-muted flex gap-2.5">
                        <span className="shrink-0 mt-2 w-1 h-1 rounded-full bg-accent" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <section className="mt-16 reveal">
        <h2 className="font-heading text-xs font-bold text-muted uppercase tracking-widest mb-4">
          Technologies
        </h2>
        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <span key={skill} className="text-sm px-3 py-1 rounded-lg border border-border text-muted bg-surface">
              {skill}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
