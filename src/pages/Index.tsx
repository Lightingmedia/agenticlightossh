import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import LogosSection from "@/components/landing/LogosSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import OnboardSection from "@/components/landing/OnboardSection";
import WorkflowAnimation from "@/components/landing/WorkflowAnimation";
import ToolingSection from "@/components/landing/ToolingSection";
import PricingSection from "@/components/landing/PricingSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <LogosSection />
        <FeaturesSection />
        <OnboardSection />
        <WorkflowAnimation />
        <ToolingSection />
        <PricingSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
