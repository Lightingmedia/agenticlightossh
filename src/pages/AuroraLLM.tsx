import React, { useState } from 'react';
import { 
  LayoutGrid, Cpu, Activity, FileJson, Shield, Bot, Settings, 
  Sun, Moon, CheckCircle2, UploadCloud, Search,
  Database, HardDrive, RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active?: boolean, onClick?: () => void }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center justify-start gap-3 px-6 py-3.5 text-[13px] font-bold tracking-wider transition-colors ${
      active 
        ? 'text-white border-l-4 border-emerald-500 bg-white/5' 
        : 'text-slate-400 hover:text-white hover:bg-white/5 border-l-4 border-transparent'
    }`}
  >
    <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={1.5} />
    {label}
  </button>
);

const EnterpriseSearch = () => (
  <div className="max-w-5xl space-y-8 animate-in fade-in duration-500 mx-auto">
    {/* Page Header Toggle (Connectors / Add / Sync) */}
    <div className="flex bg-secondary/50 rounded-xl p-1 w-fit border border-border">
      <button className="px-10 py-2.5 rounded-lg bg-background shadow-sm text-sm font-semibold border border-border flex items-center gap-2 text-foreground">
        <Database className="w-4 h-4" /> Connectors
      </button>
      <button className="px-10 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-2">
        <Settings className="w-4 h-4" /> Add Connector
      </button>
      <button className="px-10 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-2">
        <RefreshCw className="w-4 h-4" /> Sync Management
      </button>
    </div>

    {/* Search Index Status */}
    <Card className="shadow-sm border-border bg-card">
      <CardHeader className="pb-4 border-b border-border">
        <div className="flex items-center gap-2 text-foreground font-semibold">
          <RefreshCw className="w-4 h-4" /> Search Index Status
        </div>
        <CardDescription className="text-muted-foreground">All connectors sync to a unified search index</CardDescription>
      </CardHeader>
      <CardContent className="pt-6 grid grid-cols-3 gap-8">
        <div>
          <p className="text-[13px] font-medium text-muted-foreground mb-1">Total Documents Indexed</p>
          <p className="text-3xl font-normal tracking-tight text-foreground">67,101</p>
        </div>
        <div>
           <p className="text-[13px] font-medium text-muted-foreground mb-1">Last Sync</p>
           <p className="text-[15px] font-medium text-foreground mt-2">1/9/2025, 3:30:00 AM</p>
        </div>
        <div>
           <p className="text-[13px] font-medium text-muted-foreground mb-1">Status</p>
           <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-500 font-medium mt-2">
             <CheckCircle2 className="w-4 h-4" /> Up To Date
           </div>
        </div>
      </CardContent>
    </Card>

    {/* Quick Stats Grid */}
    <div className="grid grid-cols-3 gap-6">
      <Card className="shadow-sm border-border bg-card">
        <CardContent className="pt-6">
          <p className="text-[13px] font-medium text-muted-foreground mb-3">Total Connectors</p>
          <p className="text-4xl font-normal tracking-tight text-foreground">6</p>
        </CardContent>
      </Card>
      <Card className="shadow-sm border-border bg-card">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-500 mb-3">
            <CheckCircle2 className="w-4 h-4" /> <span className="text-[13px] font-medium">Active Connectors</span>
          </div>
          <p className="text-4xl font-normal tracking-tight text-emerald-600 dark:text-emerald-500">6</p>
        </CardContent>
      </Card>
      <Card className="shadow-sm border-border bg-card">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Activity className="w-4 h-4" /> <span className="text-[13px] font-medium text-foreground">Document Usage</span>
            </div>
          </div>
          <p className="text-4xl font-normal tracking-tight text-emerald-600 dark:text-emerald-500 mb-4">13%</p>
          <Progress value={13} className="h-2 bg-secondary" style={{ "--progress-background": "hsl(147, 100%, 40%)" } as React.CSSProperties} />
          <p className="text-xs font-medium text-muted-foreground mt-3">67,101 / 500,000</p>
        </CardContent>
      </Card>
    </div>

    {/* Connectors List */}
    <div className="mt-8">
      <div className="flex items-center gap-3 mb-2">
        <h3 className="text-lg font-semibold text-foreground">Tier 1 - Document Systems</h3>
        <Badge variant="secondary" className="bg-foreground text-background font-medium hover:bg-foreground rounded-md px-2 py-0.5">4 connectors</Badge>
        <Badge variant="outline" className="font-medium text-muted-foreground border-border rounded-md px-2 py-0.5">30,556 documents</Badge>
      </div>
      <p className="text-sm font-medium text-muted-foreground mb-6">Traditional document storage where each item is a discrete file</p>
      
      <div className="space-y-4">
        {[
          { name: 'Google Drive', docs: '12,528 Documents', color: 'text-yellow-500', icon: <img src="https://upload.wikimedia.org/wikipedia/commons/d/da/Google_Drive_logo.png" alt="Drive" className="w-6 h-6 object-contain" /> },
          { name: 'Sharepoint', docs: '27,728 Documents', color: 'text-teal-600', icon: <img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/Microsoft_Office_SharePoint_%282019%E2%80%93present%29.svg" alt="Sharepoint" className="w-6 h-6 object-contain" /> },
          { name: 'Acme SQL', docs: '8,726 Documents', color: 'text-slate-600', icon: <Database className="text-slate-600 dark:text-slate-300 w-6 h-6"/> }
        ].map(conn => (
          <Card key={conn.name} className="flex items-center p-5 shadow-sm border-border bg-card">
            <div className="flex items-center gap-5 flex-1 w-full text-left">
              <div className="w-8 h-8 flex items-center justify-center">
                {conn.icon}
              </div>
              <span className="font-semibold text-[17px] text-foreground">{conn.name}</span>
            </div>
            <div className="flex items-center gap-20 pr-6">
              <span className="text-muted-foreground font-medium text-[15px]">{conn.docs}</span>
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-500 w-24 font-medium">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> Active
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  </div>
);

const AssistantsConfig = () => (
  <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-500">
    <section>
      <h3 className="text-xl font-semibold mb-1 text-foreground">Select your AI model(s)</h3>
      <p className="text-[15px] font-medium text-muted-foreground mb-6">Pick a model that works best for what you want it to do.</p>
      
      <div className="grid grid-cols-4 gap-5">
        {[
          { name: 'OpenAI', desc: 'Great for everyday tasks', icon: '🌀' },
          { name: 'Claude', desc: 'Versatile in language understanding', icon: '☀️', selected: true },
          { name: 'Gemini', desc: 'Specializes in dialogue and storytelling', icon: '✨' },
          { name: 'Perplexity', desc: 'Specializes in code and reasoning', icon: '💠' }
        ].map(mod => (
          <Card key={mod.name} className={`cursor-pointer transition-all bg-card ${mod.selected ? 'ring-[3px] ring-foreground border-transparent shadow-lg transform -translate-y-1' : 'border-border hover:border-muted-foreground hover:shadow-md'}`}>
            <CardContent className="p-8 text-center flex flex-col items-center gap-4">
              <div className="text-5xl mb-2">{mod.icon}</div>
              <h4 className="font-bold text-lg text-foreground">{mod.name}</h4>
              <p className="text-[13px] font-medium text-muted-foreground leading-relaxed px-2">{mod.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>

    <section>
      <h3 className="text-xl font-semibold mb-1 text-foreground">Give your bot a purpose</h3>
      <p className="text-[15px] font-medium text-muted-foreground mb-6">Tell your bot how to behave and how to respond to user messages. Try to be as specific as possible.</p>
      <Textarea 
        className="min-h-[100px] text-[15px] p-5 font-medium bg-secondary/30 focus:bg-background border-border placeholder:text-muted-foreground"
        placeholder="e.g. This bot should provide marketing support..."
        defaultValue="This bot should provide marketing support to members of Acme, Corp, based on our specific brand voice and style."
      />
    </section>

    <section>
      <h3 className="text-xl font-semibold mb-1 flex items-center gap-2 text-foreground">
        Include supporting documents <span className="text-muted-foreground font-normal">(optional)</span>
      </h3>
      <p className="text-[15px] font-medium text-muted-foreground mb-6">Upload documents or connect data sources to provide additional context for your assistant.</p>
      
      <div className="border-[2px] border-dashed border-border rounded-xl p-8 text-center mb-6 cursor-pointer hover:bg-secondary/40 hover:border-primary/50 transition-colors bg-[#FAFAFA] dark:bg-card/50">
        <UploadCloud className="w-6 h-6 mx-auto mb-3 text-foreground" />
        <p className="text-[15px] font-semibold text-foreground"><span className="underline">Upload</span> <span className="text-muted-foreground font-medium no-underline">from your files</span></p>
      </div>

      <div className="space-y-4">
        {[
          { name: 'Google Drive', docs: '12,528 Documents', icon: <img src="https://upload.wikimedia.org/wikipedia/commons/d/da/Google_Drive_logo.png" alt="Drive" className="w-5 h-5 object-contain" /> },
          { name: 'Sharepoint', docs: '27,728 Documents', icon: <img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/Microsoft_Office_SharePoint_%282019%E2%80%93present%29.svg" alt="Sharepoint" className="w-5 h-5 object-contain" /> }
        ].map(conn => (
          <Card key={conn.name} className="flex items-center p-4 bg-card border-border shadow-sm">
            <div className="flex items-center gap-5 flex-1 pl-2">
              <div className="w-6 h-6 flex items-center justify-center">
                {conn.icon}
              </div>
              <span className="font-semibold text-[15px] text-foreground">{conn.name}</span>
            </div>
            <div className="flex items-center gap-16 pr-4">
              <span className="text-muted-foreground font-medium text-[13px]">{conn.docs}</span>
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-500 text-[13px] font-semibold">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> Connected
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  </div>
);

export default function AuroraLLM() {
  const [activeView, setActiveView] = useState<'search'|'assistants'>('search');

  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0A0B] text-foreground flex font-sans w-full">
      
      {/* Dark Sidebar (Liminal Style) */}
      <aside className="w-[280px] bg-[#141517] flex flex-col flex-shrink-0 h-screen sticky top-0" style={{ fontFamily: 'Inter, sans-serif' }}>
        <div className="px-6 py-8 flex items-center gap-3 text-white">
          <div className="w-7 h-7 rounded bg-white flex items-center justify-center">
            <Bot className="w-5 h-5 text-[#141517]" />
          </div>
          <span className="text-2xl font-semibold tracking-tight">Liminal</span>
        </div>

        <nav className="flex-1 mt-4">
          <SidebarItem icon={LayoutGrid} label="INSIGHTS" onClick={() => setActiveView('search')} />
          <SidebarItem icon={Cpu} label="MODELS" onClick={() => setActiveView('search')} />
          <SidebarItem icon={FileJson} label="LOGS" onClick={() => setActiveView('search')} />
          <SidebarItem icon={Search} label="EXPORTS" onClick={() => setActiveView('search')} />
          <SidebarItem icon={Shield} label="POLICY" onClick={() => setActiveView('search')} />
          <div className="my-4"></div>
          <SidebarItem icon={Activity} label="ASSISTANTS" active={activeView === 'assistants'} onClick={() => setActiveView('assistants')} />
        </nav>

        <div className="p-6 space-y-4">
          <button className="flex items-center gap-3 text-sm font-semibold text-slate-400 hover:text-white mb-6">
            <Settings className="w-5 h-5" /> Settings
          </button>
          
          <div className="bg-[#1e1f23] rounded-xl p-3 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm relative">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="Avatar" className="w-full h-full rounded-full object-cover" />
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#1e1f23] rounded-full"></div>
            </div>
            <div className="flex-1 overflow-hidden text-left">
              <p className="text-sm text-white font-semibold truncate leading-tight">Chris Johnson</p>
              <p className="text-[11px] font-medium text-slate-400 truncate mt-0.5">RN Admin<br/>cjohnson@mail.com</p>
            </div>
          </div>

          <div className="bg-[#1e1f23] rounded-xl p-1 flex mt-4">
            <button className="flex-1 py-1.5 flex items-center justify-center gap-2 text-xs font-semibold text-slate-400 hover:text-white rounded-lg">
              <Sun className="w-4 h-4" /> Light
            </button>
            <button className="flex-1 py-1.5 flex items-center justify-center gap-2 text-xs font-semibold text-white bg-black/50 rounded-lg shadow-sm">
              <Moon className="w-4 h-4" /> Dark
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col bg-[#FAFAFA] dark:bg-[#0A0A0B] overflow-y-auto h-screen relative">
        <header className="px-12 py-8 bg-[#FAFAFA] dark:bg-[#0A0A0B] sticky top-0 z-20 border-b border-border/50">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground text-left">
            {activeView === 'search' ? 'Enterprise Search' : 'Model Agnostic Assistants'}
          </h1>
        </header>
        
        {/* If Assistants, show a blue accent line just under header */}
        {activeView === 'assistants' && (
          <div className="h-1 w-full flex sticky top-[103px] z-20"><div className="w-40 bg-blue-500 h-full"></div></div>
        )}

        <div className="p-12 pb-24 w-full text-left">
          {activeView === 'search' && <EnterpriseSearch />}
          {activeView === 'assistants' && <AssistantsConfig />}
        </div>
      </main>

    </div>
  );
}
