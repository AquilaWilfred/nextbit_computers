"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Truck } from "lucide-react";
import { Agent, Order } from "@/types/orders.types";
import { getAgentStatusMessage } from "@/lib/utils/order.utils";

interface DeliveryAssignmentProps {
  order: Order;
  agents: Agent[];
  selectedAgentId: string;
  onAgentChange: (value: string) => void;
  onAssign: () => void;
  isAssigning: boolean;
}

export const DeliveryAssignment = memo(function DeliveryAssignment({
  order,
  agents,
  selectedAgentId,
  onAgentChange,
  onAssign,
  isAssigning,
}: DeliveryAssignmentProps) {
  if (!["processing", "shipped"].includes(order.status)) return null;

  return (
    <div className="border-t border-border pt-4">
      <h4 className="font-semibold mb-3 flex items-center gap-2">
        <Truck className="w-4 h-4 text-[var(--brand)]" /> Delivery Management
      </h4>
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Select value={selectedAgentId || order.deliveryAgentId?.toString() || ""} onValueChange={onAgentChange}>
          <SelectTrigger className="w-full bg-background">
            <SelectValue placeholder="Assign a Delivery Agent" />
          </SelectTrigger>
          <SelectContent>
            {agents.map((agent) => {
              const isAssignedToThis = order.deliveryAgentId === agent.id;
              const isBusy = !agent.isAvailable || (agent.activeCity && agent.activeCity !== order.shippingCity);
              const statusMessage = getAgentStatusMessage(agent, order.shippingCity);
              return (
                <SelectItem key={agent.id} value={agent.id.toString()} disabled={!!isBusy && !isAssignedToThis}>
                  {agent.name} ({agent.vehicleType} - {agent.vehicleNumber}){statusMessage}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <Button
          className="w-full sm:w-auto shrink-0 bg-[var(--brand)] text-white"
          disabled={!selectedAgentId || isAssigning}
          onClick={onAssign}
        >
          {isAssigning ? "Assigning..." : "Assign & Notify"}
        </Button>
      </div>
    </div>
  );
});