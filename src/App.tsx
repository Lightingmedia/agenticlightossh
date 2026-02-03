import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import DashboardLayout from "./layouts/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Agents from "./pages/Agents";
import GPUMonitor from "./pages/GPUMonitor";
import Telemetry from "./pages/Telemetry";
import Inference from "./pages/Inference";
import Models from "./pages/Models";
import Training from "./pages/Training";
import ThermalControl from "./pages/ThermalControl";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          
          {/* Dashboard Routes */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="agents" element={<Agents />} />
            <Route path="gpu" element={<GPUMonitor />} />
            <Route path="telemetry" element={<Telemetry />} />
            <Route path="thermal" element={<ThermalControl />} />
            <Route path="inference" element={<Inference />} />
            <Route path="models" element={<Models />} />
            <Route path="training" element={<Training />} />
          </Route>

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
