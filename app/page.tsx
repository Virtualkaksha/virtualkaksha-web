import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Courses from "./components/Courses";
import Testimonials from "./components/Testimonials";
import ChooseClass from "./components/ChooseClass";
import WhyChoose from "./components/WhyChoose";
import PopularResources from "./components/PopularResources";
import TeacherSection from "./components/TeacherSection";
import PracticeTests from "./components/PracticeTests";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <ChooseClass />
      <PopularResources />
      <Courses />
      <TeacherSection />
      <PracticeTests />
      <WhyChoose />
      <Testimonials />
      <Footer />
    </>
  );
}
