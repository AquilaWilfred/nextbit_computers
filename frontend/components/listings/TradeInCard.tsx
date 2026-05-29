// components/listings/TradeInCard.tsx
"use client";

import { FC, memo, useState } from 'react';
import { TradeInRequest } from '@/types/listings/listings.types';
import { DEVICE_LABELS, CONDITION_META, STATUS_CONFIG } from '@/constants/listings/listings.constants';
import { toast } from 'sonner';
import { Eye, EyeOff, Edit2, Trash2 } from 'lucide-react';

// Small helper to call update endpoint
async function updateListing(listingId: number, payload: any) {
  const res = await fetch(`/api/tradein/listings/${listingId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to update listing');
  return res.json();
}

interface TradeInCardProps {
  listing: TradeInRequest;
  onDeleted?: (listingId: number) => void;
}

export const TradeInCard: FC<TradeInCardProps> = memo(({ listing, onDeleted }) => {
  const statusConfig = STATUS_CONFIG[listing.status];
  const conditionMeta = CONDITION_META[listing.condition];
  const [isHidden, setIsHidden] = useState(!!listing.visible === false ? true : !listing.visible ? false : !(listing.visible ?? true));
  const [editing, setEditing] = useState(false);
  const [newPrice, setNewPrice] = useState(listing.asking_price_kes);
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <div className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition">
      <div className="flex flex-wrap md:flex-nowrap gap-5">
        {/* Thumbnail */}
        <div className="w-28 h-28 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
          <img 
            src={listing.images?.[0] || "https://placehold.co/600x400/2563EB/white?text=Device"} 
            alt={listing.model} 
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        
        {/* Details */}
        <div className="flex-1">
          <div className="flex flex-wrap justify-between items-start gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-gray-800 text-lg">{listing.brand} {listing.model}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusConfig.bgColor}`}>
                  {statusConfig.label}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {DEVICE_LABELS[listing.device_type]} · {conditionMeta.label}
              </div>
              {listing.specs && (
                <div className="text-sm text-gray-600 mt-2 line-clamp-2">{listing.specs}</div>
              )}
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-blue-700">KES {listing.asking_price_kes.toLocaleString()}</span>
              <div className="mt-2 flex items-center justify-end gap-2 flex-wrap">
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      const updated = await updateListing(listing.id, { visible: !(listing.visible ?? true) });
                      toast.success((updated.visible ? 'Listing visible' : 'Listing hidden'));
                      setIsHidden(!updated.visible);
                    } catch (err) {
                      console.error(err);
                      toast.error('Failed to toggle visibility');
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                  title={(listing.visible ?? true) ? 'Hide this listing' : 'Show this listing'}
                >
                  {(listing.visible ?? true) ? (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      Hide
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      Show
                    </>
                  )}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setEditing(true); setNewPrice(listing.asking_price_kes); }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition"
                  title="Edit the asking price"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit Price
                </button>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!confirm('Drop this listing from the marketplace? This cannot be undone.')) return;
                    
                    setIsDeleting(true);
                    try {
                      const res = await fetch(`/api/tradein/listings/${listing.id}`, { 
                        method: 'DELETE', 
                        credentials: 'include' 
                      });
                      if (!res.ok) {
                        const body = await res.json().catch(() => ({}));
                        throw new Error(body.detail || 'Failed to delete listing');
                      }
                      toast.success('Listing dropped successfully');
                      // Call parent callback to remove from list
                      if (onDeleted) {
                        onDeleted(listing.id);
                      } else {
                        // Fallback to reload if no callback
                        setTimeout(() => window.location.reload(), 500);
                      }
                    } catch (err) {
                      console.error(err);
                      toast.error(err instanceof Error ? err.message : 'Failed to drop listing');
                    } finally {
                      setIsDeleting(false);
                    }
                  }}
                  disabled={isDeleting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  title="Permanently delete this listing"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {isDeleting ? 'Dropping...' : 'Drop Listing'}
                </button>
              </div>
              {listing.credit_issued_kes && (
                <div className="text-green-600 text-sm font-medium mt-1">
                  💰 Paid: KES {listing.credit_issued_kes.toLocaleString()}
                </div>
              )}
            </div>
          </div>
          
          {/* Additional Info */}
          <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
            <span>📅 Listed: {new Date(listing.created_at).toLocaleDateString()}</span>
            {listing.views && listing.views > 0 && <span>👁️ {listing.views} views</span>}
            {listing.location && <span>📍 {listing.location}</span>}
            {listing.drop_branch && <span>🏪 Drop-off: {listing.drop_branch}</span>}
          </div>
          
          {/* Image thumbnails gallery */}
          {listing.images && listing.images.length > 1 && (
            <div className="flex gap-2 mt-3">
              {listing.images.slice(1, 4).map((img, idx) => (
                <img 
                  key={idx} 
                  src={img} 
                  alt={`${listing.brand} ${listing.model}`} 
                  className="w-12 h-12 object-cover rounded-lg border border-gray-200"
                  loading="lazy"
                />
              ))}
              {listing.images.length > 4 && (
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-500 border border-gray-200">
                  +{listing.images.length - 4}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Edit price modal (simple inline) */}
      {editing && (
        <div className="mt-3 p-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={newPrice}
              onChange={(e) => setNewPrice(Number(e.target.value))}
              className="w-32 p-2 border rounded"
            />
            <button
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  const updated = await updateListing(listing.id, { asking_price_kes: newPrice });
                  toast.success('Price updated');
                  setEditing(false);
                } catch (err) {
                  console.error(err);
                  toast.error('Failed to update price');
                }
              }}
              className="px-3 py-1 rounded bg-[var(--brand)] text-white text-sm"
            >Save</button>
            <button onClick={(e) => { e.stopPropagation(); setEditing(false); }} className="px-3 py-1 rounded border">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
});

TradeInCard.displayName = 'TradeInCard';