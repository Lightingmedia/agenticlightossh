import type { ReactNode } from "react";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";

type Props = { eyebrow: string; title: string; intro: string; children: ReactNode };

/** Shared shell for the simple company, developer and legal pages linked from the footer. */
const InfoPage = ({ eyebrow, title, intro, children }: Props) => (
  <div className="min-h-screen bg-background text-foreground">
    <Header />
    <main className="pt-32 sm:pt-40 pb-24">
      <div className="container mx-auto max-w-3xl px-4">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-4 py-1.5 font-mono text-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />{eyebrow}
        </span>
        <h1 className="mt-6 font-mono text-4xl sm:text-5xl font-bold tracking-tighter">{title}</h1>
        <p className="mt-4 text-lg text-muted-foreground">{intro}</p>
        <div className="mt-12 space-y-10">{children}</div>
      </div>
    </main>
    <Footer />
  </div>
);

export const Section = ({ title, children, id }: { title: string; children: ReactNode; id?: string }) => (
  <section id={id} className="space-y-3 scroll-mt-32">
    <h2 className="font-mono text-xl font-semibold">{title}</h2>
    <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
  </section>
);

export const Code = ({ children }: { children: string }) => (
  <pre className="overflow-x-auto rounded-lg border border-border bg-card/60 p-4 font-mono text-xs text-foreground">{children}</pre>
);

export default InfoPage;
