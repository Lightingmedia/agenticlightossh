import { useEffect } from "react";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";

const EMBED_SRC =
  "https://prod-api-holo-ai.fly.dev/public/seo/embed/51bf8ff9-5aad-4bb1-be8b-ac0f6c27ee8d.js";

const Blog = () => {
  useEffect(() => {
    document.title = "Blog · LightOS";
    // Remove any previous copy so the embed re-initialises on each visit.
    document.querySelectorAll(`script[src="${EMBED_SRC}"]`).forEach((s) => s.remove());
    const script = document.createElement("script");
    script.src = EMBED_SRC;
    script.defer = true;
    document.body.appendChild(script);
    return () => {
      script.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="pt-32 pb-20">
        <div className="container mx-auto px-4 max-w-5xl">
          <h1 className="font-mono text-3xl md:text-4xl font-bold mb-8">Blog</h1>
          <div id="holo-blog" />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Blog;
