import { Shield } from "lucide-react";

export const Header = () => {
  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 max-w-7xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary rounded-sm">
            <Shield className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-heading font-bold uppercase tracking-tight">
              AI Safety Vision
            </h1>
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
              AI-Powered Inspection Tool
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};
