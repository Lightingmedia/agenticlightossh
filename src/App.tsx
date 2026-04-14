import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import AdminLayout from "./layouts/AdminLayout";
import AdminDashboard from "./pages/AdminDashboard";
import AdminTesters from "./pages/AdminTesters";
import AdminAnalytics from "./pages/AdminAnalytics";
import NotFound from "./pages/NotFound";
import DashboardLayout from "./layouts/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Agents from "./pages/Agents";
import GPUMonitor from "./pages/GPUMonitor";
import Telemetry from "./pages/Telemetry";
import Inference from "./pages/Inference";
import LLMServing from "./pages/LLMServing";
import Models from "./pages/Models";
import Training from "./pages/Training";
import ThermalControl from "./pages/ThermalControl";
import AgentTemplates from "./pages/AgentTemplates";
import DataSources from "./pages/DataSources";
import RuleBuilder from "./pages/RuleBuilder";
import ActionOrchestrator from "./pages/ActionOrchestrator";
import DeployAgent from "./pages/DeployAgent";
import AgentMonitor from "./pages/AgentMonitor";
import PhotonicFabric from "./pages/PhotonicFabric";
import AgentStudio from "./pages/AgentStudio";
import Docs from "./pages/Docs";
import Examples from "./pages/Examples";
import Clusters from "./pages/Clusters";
import Runs from "./pages/Runs";
import EnergyLab from "./pages/EnergyLab";
import Onboard from "./pages/Onboard";
import LightCompiler from "./pages/LightCompiler";
import TransformerExplainer from "./pages/TransformerExplainer";
import LLMPerfBench from "./pages/LLMPerfBench";
import Benchmark from "./pages/Benchmark";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/onboard" element={<Onboard />} />
          <Route path="/light-compiler" element={<LightCompiler />} />
          <Route path="/transformer-explainer" element={<TransformerExplainer />} />
          <Route path="/benchmark" element={<Benchmark />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="testers" element={<AdminTesters />} />
            <Route path="analytics" element={<AdminAnalytics />} />
          </Route>
          <Route path="/examples" element={<Examples />} />

          {/* Dashboard Routes */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="agents" element={<Agents />} />
            <Route path="gpu" element={<GPUMonitor />} />
            <Route path="telemetry" element={<Telemetry />} />
            <Route path="thermal" element={<ThermalControl />} />
            <Route path="inference" element={<Inference />} />
            <Route path="llm-serving" element={<LLMServing />} />
            <Route path="models" element={<Models />} />
            <Route path="training" element={<Training />} />
            <Route path="benchmark" element={<LLMPerfBench />} />
            <Route path="photonic" element={<PhotonicFabric />} />
            {/* LightOS/Fabric OS Routes */}
            <Route path="clusters" element={<Clusters />} />
            <Route path="runs" element={<Runs />} />
            <Route path="runs/:runId" element={<EnergyLab />} />
            {/* Agent Builder Routes */}
            <Route path="studio" element={<AgentStudio />} />
            <Route path="templates" element={<AgentTemplates />} />
            <Route path="agent/new" element={<AgentStudio />} />
            <Route path="data-sources" element={<DataSources />} />
            <Route path="rules" element={<RuleBuilder />} />
            <Route path="actions" element={<ActionOrchestrator />} />
            <Route path="deploy" element={<DeployAgent />} />
            <Route path="monitor" element={<AgentMonitor />} />
          </Route>

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
