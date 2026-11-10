import { Link } from "react-router-dom";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import CeoLetter from "@/components/welcome/CeoLetter";
import { Button } from "@/components/ui/button";

const Welcome = () => (
  <div>
    <DashboardHeader title="Welcome" subtitle="A letter from our CEO" />
    <div className="p-6">
      <div className="mx-auto max-w-2xl rounded-xl border border-primary/25 bg-card p-8 shadow-[0_0_40px_hsl(var(--primary)/0.08)]">
        <CeoLetter />
        <div className="mt-6 flex flex-wrap gap-2">
          <Button asChild><Link to="/dashboard/gateway-setup">Connect my first GPU</Link></Button>
          <Button asChild variant="outline"><Link to="/dashboard/gpu-cloud">Explore GPU Cloud</Link></Button>
        </div>
      </div>
    </div>
  </div>
);

export default Welcome;
