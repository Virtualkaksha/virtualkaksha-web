import type { Metadata } from "next";

import Footer from "@/app/components/Footer";
import Navbar from "@/app/components/Navbar";
import TeacherSection from "@/app/components/TeacherSection";

export const metadata: Metadata = {
  title: "Teachers",
  description: "Publish trusted learning resources through VirtualKaksha’s moderated teacher workspace.",
  alternates: { canonical: "/teacher" },
};

export default function TeacherLandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <TeacherSection />
      </main>
      <Footer />
    </>
  );
}
