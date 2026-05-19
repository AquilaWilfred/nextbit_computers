import { useState, useEffect } from "react";
import { Agent } from "@/types/orders.types";
import { apiFetch } from "@/lib/utils/order.utils";

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Agent[]>("/api/delivery/agents")
      .then(setAgents)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { agents, loading };
}