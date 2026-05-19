"use client";

import { memo, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Endpoint } from "@/types/ai.types";
import { FALLBACK_ENDPOINTS } from "@/constants/ai.constants";

async function fetchEndpoints(): Promise<Endpoint[]> {
  const res = await fetch("/api/admin/system/endpoints");
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const EndpointCatalog = memo(function EndpointCatalog() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const handleLoadEndpoints = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchEndpoints();
      setEndpoints(data.length ? data : FALLBACK_ENDPOINTS);
      setLoaded(true);
    } catch (err: any) {
      toast.error(`Unable to load endpoint list: ${err.message}`);
      setEndpoints(FALLBACK_ENDPOINTS);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <Card className="p-6 md:p-8">
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-[var(--brand)]" /> Protected Endpoint Catalog
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Admin-only REST endpoints for internal data analysis, model training, and integrations.
            </p>
          </div>
          
          <Button
            type="button"
            onClick={handleLoadEndpoints}
            variant="outline"
            disabled={loading}
            className="gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loaded ? "Refresh Endpoints" : "Load Endpoints"}
          </Button>
        </div>
        
        {endpoints.length > 0 ? (
          <div className="grid gap-2">
            {endpoints.map(ep => (
              <div key={ep.path} className="rounded-xl border border-border p-4 bg-background/80">
                <code className="font-semibold text-sm">{ep.path}</code>
                <p className="text-sm text-muted-foreground mt-1">{ep.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Click the button to fetch the protected admin endpoint list.
          </p>
        )}
      </div>
    </Card>
  );
});