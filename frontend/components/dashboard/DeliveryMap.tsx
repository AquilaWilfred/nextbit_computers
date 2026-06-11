import { useRef } from "react";
import { MapView } from "@/components/map/MapView";
import { Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DeliveryMapProps {
  agentName?: string;
  agentPhone?: string;
  vehicleNumber?: string;
  deliveryOtp?: string;
  driverLocation: { lat: number; lng: number } | null;
}

export function DeliveryMap({ agentName, agentPhone, vehicleNumber, deliveryOtp, driverLocation }: DeliveryMapProps) {
  const mapRef = useRef<google.maps.Map | null>(null);

  return (
    <section className="bg-card border border-border rounded-xl p-5" aria-labelledby="delivery-heading">
      <h2 id="delivery-heading" className="font-display font-semibold mb-4 flex items-center gap-2">
        <MapPin className="w-4.5 h-4.5 text-[var(--brand)]" aria-hidden="true" /> Live Delivery Tracking
      </h2>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
          <div className="p-4 bg-muted/40 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Delivery Agent</p>
            <p className="font-medium">{agentName ?? "Assigned Driver"}</p>
            <p className="text-sm text-muted-foreground mt-1">Vehicle: {vehicleNumber ?? "Pending"}</p>
            <Button
              variant="outline"
              className="w-full mt-3 gap-2 hover:bg-[var(--brand)] hover:text-white transition-colors"
              onClick={() => agentPhone && window.open(`tel:${agentPhone}`)}
              disabled={!agentPhone}
              aria-label={agentPhone ? `Call agent at ${agentPhone}` : "Agent phone unavailable"}
            >
              <Phone className="w-4 h-4" aria-hidden="true" /> Call Agent
            </Button>
          </div>
          <div className="p-4 bg-muted/40 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Delivery OTP</p>
            <p className="font-mono text-2xl font-bold tracking-widest text-[var(--brand)]" aria-label={`OTP: ${deliveryOtp ?? "not yet assigned"}`}>
              {deliveryOtp ?? "----"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Provide this code to the agent upon arrival.</p>
          </div>
        </div>
        <div className="md:col-span-2 rounded-lg overflow-hidden border border-border h-[280px] bg-muted" aria-label="Delivery map">
          <MapView
            initialZoom={14}
            onMapReady={(map) => {
              mapRef.current = map;
              if (driverLocation) map.setCenter(driverLocation);
            }}
          />
        </div>
      </div>
    </section>
  );
}