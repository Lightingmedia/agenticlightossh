import { Outlet } from "react-router-dom";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { useRequireAuth } from "@/hooks/use-require-auth";

const DashboardLayout = () => {
  const { loading } = useRequireAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground font-mono">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar />
      <main className="ml-[72px] md:ml-64 transition-all duration-300">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
