import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import PricingSection from "@/components/landing/PricingSection";
import Footer from "@/components/landing/Footer";
import { FactsBar, LifecycleSection, BentoSection, CodeSection, FinalCTA } from "@/components/landing/LaunchSections";

const Index = () => (
  <div className="min-h-screen bg-background">
    <Header />
    <main>
      <Hero />
      <FactsBar />
      <LifecycleSection />
      <BentoSection />
      <CodeSection />
      <PricingSection />
      <FinalCTA />
    </main>
    <Footer />
  </div>
);

export default Index;
