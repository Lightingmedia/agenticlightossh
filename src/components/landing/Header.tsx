import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      {/* Announcement Bar */}
      <div className="bg-secondary/80 backdrop-blur-sm border-b border-border py-2 px-4">
        <div className="container mx-auto flex items-center justify-center gap-2 text-sm">
          <span className="text-primary">🚀</span>
          <span className="font-mono text-muted-foreground">LIGHTOS v1.0.0 is live!</span>
          <a href="#" className="text-primary hover:underline font-mono">
            Try for free →
          </a>
        </div>
      </div>

      {/* Main Header */}
      <nav className="bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <a href="/" className="flex items-center gap-2 font-mono text-lg font-bold">
              <span className="text-primary">{`{ }`}</span>
              <span className="text-foreground">LIGHTOS</span>
            </a>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <div className="relative">
                <button
                  className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors font-mono text-sm uppercase tracking-wide"
                  onMouseEnter={() => setProductsOpen(true)}
                  onMouseLeave={() => setProductsOpen(false)}
                >
                  Products
                  <ChevronDown className="w-4 h-4" />
                </button>
                <AnimatePresence>
                  {productsOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-xl py-2"
                      onMouseEnter={() => setProductsOpen(true)}
                      onMouseLeave={() => setProductsOpen(false)}
                    >
                      <a href="#" className="block px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">CLI</a>
                      <a href="#" className="block px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                        VS Code <span className="text-primary text-xs">SOON</span>
                      </a>
                      <a href="#" className="block px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                        Sandbox <span className="text-primary text-xs">SOON</span>
                      </a>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <a href="#enterprise" className="text-muted-foreground hover:text-foreground transition-colors font-mono text-sm uppercase tracking-wide">
                Enterprise
              </a>
              <a href="#news" className="text-muted-foreground hover:text-foreground transition-colors font-mono text-sm uppercase tracking-wide">
                News
              </a>
            </div>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-3">
              <Button variant="outline" size="sm" className="font-mono border-border hover:border-primary hover:text-primary">
                Discord
              </Button>
              <Button size="sm" className="font-mono bg-foreground text-background hover:bg-foreground/90">
                Login
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden text-foreground"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-border bg-background"
            >
              <div className="container mx-auto px-4 py-4 flex flex-col gap-4">
                <a href="#" className="text-muted-foreground hover:text-foreground font-mono text-sm uppercase">Products</a>
                <a href="#enterprise" className="text-muted-foreground hover:text-foreground font-mono text-sm uppercase">Enterprise</a>
                <a href="#news" className="text-muted-foreground hover:text-foreground font-mono text-sm uppercase">News</a>
                <div className="flex gap-3 pt-4 border-t border-border">
                  <Button variant="outline" size="sm" className="font-mono flex-1">Discord</Button>
                  <Button size="sm" className="font-mono flex-1 bg-foreground text-background">Login</Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
};

export default Header;