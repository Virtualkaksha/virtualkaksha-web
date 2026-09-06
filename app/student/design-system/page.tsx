import { Button } from "@/components/ui/button";

import BoardCard from "@/app/components/virtualkaksha/BoardCard";
import SearchBar from "@/app/components/virtualkaksha/SearchBar";
import SectionHeader from "@/app/components/virtualkaksha/SectionHeader";
import SubjectCard from "@/app/components/virtualkaksha/SubjectCard";
import { requireCurrentRole } from "@/lib/auth/current-identity";

const boards = [
  {
    title: "CBSE",
    description:
      "Classes 6 to 12 notes, NCERT solutions, videos and practice tests.",
    href: "/student/resources/cbse",
  },
  {
    title: "ICSE",
    description:
      "Structured class-wise and subject-wise learning resources.",
    href: "/student/resources/icse",
  },
  {
    title: "State Boards",
    description:
      "Resources organised according to supported state education boards.",
    href: "/student/resources/state-boards",
  },
];

const subjects = [
  {
    title: "Mathematics",
    chapters: 15,
    href: "/student/resources/cbse/class-10/mathematics",
  },
  {
    title: "Science",
    chapters: 16,
    href: "/student/resources/cbse/class-10/science",
  },
  {
    title: "Social Science",
    chapters: 20,
    href: "/student/resources/cbse/class-10/social-science",
  },
  {
    title: "English",
    chapters: 12,
    href: "/student/resources/cbse/class-10/english",
  },
];

export default async function DesignSystemPage() {
  await requireCurrentRole("STUDENT");
  return (
    <div className="mx-auto max-w-7xl space-y-12 p-8">
      <SectionHeader
        eyebrow="VirtualKaksha"
        title="Design System"
        description="Reusable components used across the entire platform."
        action={<Button>Add Resource</Button>}
      />

      <section className="space-y-5">
        <SectionHeader
          eyebrow="Search"
          title="Find learning content"
          description="Students can search chapters, resources, teachers and courses."
        />

        <SearchBar />
      </section>

      <section className="space-y-5">
        <SectionHeader
          eyebrow="Boards"
          title="Choose your education board"
          description="Reusable board cards for the student resources flow."
        />

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {boards.map((board) => (
            <BoardCard key={board.title} {...board} />
          ))}
        </div>
      </section>

      <section className="space-y-5">
        <SectionHeader
          eyebrow="Subjects"
          title="Browse subjects"
          description="Choose a subject to explore its chapters and learning resources."
        />

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {subjects.map((subject) => (
            <SubjectCard key={subject.title} {...subject} />
          ))}
        </div>
      </section>
    </div>
  );
}