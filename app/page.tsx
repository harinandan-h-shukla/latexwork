import { SiteNavbar } from "@/components/marketing/site-navbar";
import { Hero } from "@/components/marketing/hero";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { PaperStructureSection } from "@/components/marketing/paper-structure-section";
import { ResearchDiscoverySection } from "@/components/marketing/research-discovery-section";
import { CitationWorkflowSection } from "@/components/marketing/citation-workflow-section";
import { WritingSection } from "@/components/marketing/writing-section";
import { PaperHealthSection } from "@/components/marketing/paper-health-section";
import { LocalCompileSection } from "@/components/marketing/local-compile-section";
import { CollaborationSection } from "@/components/marketing/collaboration-section";
import { ResearchUseCases } from "@/components/marketing/research-use-cases";
import { PlansSection } from "@/components/marketing/plans-section";
import { AboutSection } from "@/components/marketing/about-section";
import { FinalCta } from "@/components/marketing/final-cta";
import { SiteFooter } from "@/components/marketing/site-footer";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNavbar />
      <main>
        <Hero />
        <FeatureGrid />
        <PaperStructureSection />
        <ResearchDiscoverySection />
        <CitationWorkflowSection />
        <WritingSection />
        <PaperHealthSection />
        <LocalCompileSection />
        <CollaborationSection />
        <ResearchUseCases />
        <PlansSection />
        <AboutSection />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}
