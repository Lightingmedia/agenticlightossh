import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, ExternalLink } from "lucide-react";

interface Tester {
  id: string;
  full_name: string;
  headline: string | null;
  company_name: string | null;
  active_title: string | null;
  location_full: string | null;
  linkedin_url: string | null;
  followers_count: number | null;
  company_industry: string | null;
}

const AdminTesters = () => {
  const [testers, setTesters] = useState<Tester[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("testers")
        .select("id, full_name, headline, company_name, active_title, location_full, linkedin_url, followers_count, company_industry")
        .order("followers_count", { ascending: false });
      setTesters(data ?? []);
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = testers.filter(t =>
    [t.full_name, t.company_name, t.active_title, t.company_industry].some(
      f => f?.toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-mono text-foreground">Testers</h1>
        <p className="text-muted-foreground mt-1">{testers.length} registered testers</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search by name, company, title, industry..."
          value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <Card className="bg-card/50 border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono">Name</TableHead>
                  <TableHead className="font-mono">Title</TableHead>
                  <TableHead className="font-mono">Company</TableHead>
                  <TableHead className="font-mono">Industry</TableHead>
                  <TableHead className="font-mono">Location</TableHead>
                  <TableHead className="font-mono text-right">Followers</TableHead>
                  <TableHead className="font-mono w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Loading...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No testers found</TableCell></TableRow>
                ) : filtered.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.full_name}</TableCell>
                    <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">{t.active_title ?? "—"}</TableCell>
                    <TableCell>{t.company_name ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{t.company_industry ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{t.location_full ?? "—"}</TableCell>
                    <TableCell className="text-right font-mono">{t.followers_count?.toLocaleString() ?? "0"}</TableCell>
                    <TableCell>
                      {t.linkedin_url && (
                        <a href={t.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminTesters;
