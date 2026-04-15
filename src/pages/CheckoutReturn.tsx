import { useSearchParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight } from "lucide-react";

export default function CheckoutReturn() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="max-w-md w-full text-center border-primary/30">
        <CardHeader>
          <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
          <CardTitle className="text-2xl font-mono">Welcome Aboard!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            {sessionId
              ? "Your subscription is being activated. You'll have full access momentarily."
              : "No session information found."}
          </p>
          <div className="flex flex-col gap-2">
            <Button asChild>
              <Link to="/dashboard">
                Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/pricing">View Plans</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
