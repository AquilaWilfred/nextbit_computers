// app/(public)/listings/page.tsx (updated)
"use client";

import { useState, useCallback } from 'react';
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useTradeInListings } from '@/hooks/listings/useTradeInListings';
import { useTradeInStats } from '@/hooks/listings/useTradeInStats';
import { useTradeInForm } from '@/hooks/listings/useTradeInForm';
import { useImageUpload } from '@/hooks/listings/useImageUpload';
import { tradeInService } from '@/lib/services/listing.service';
import { 
  TradeInHeader, 
  TradeInStats, 
  HowItWorks, 
  StatusFilters, 
  TradeInListings, 
  TradeInFormModal, 
  TradeInSkeleton 
} from '@/components/listings';
import { toast } from 'sonner';

export default function TradeInPage() {
  const [showForm, setShowForm] = useState(false);
  
  const { listings, loading: listingsLoading, counts, statusFilter, setStatusFilter, refetch: refetchListings } = useTradeInListings();
  const { stats, loading: statsLoading, refetch: refetchStats } = useTradeInStats();
  const { formData, submitting, setSubmitting, updateField, getSubmitData, resetForm } = useTradeInForm();
  const { selectedImages, imagePreviews, addImages, removeImage, clearImages, primaryIndex, setPrimary } = useImageUpload();

  const isLoading = listingsLoading || statsLoading;

  const handleSubmit = useCallback(async () => {
    const submitData = getSubmitData();
    if (!submitData) return;

    setSubmitting(true);
    try {
      const formDataObj = new FormData();
      formDataObj.append('device_type', submitData.device_type);
      formDataObj.append('brand', submitData.brand);
      formDataObj.append('model', submitData.model);
      formDataObj.append('condition', submitData.condition);
      formDataObj.append('asking_price_kes', submitData.asking_price_kes.toString());
      formDataObj.append('drop_branch', submitData.drop_branch);
      if (submitData.specs) formDataObj.append('specs', submitData.specs);
      if (submitData.location) formDataObj.append('location', submitData.location);
      
      selectedImages.forEach((image) => {
        formDataObj.append('images', image);
      });
      
      await tradeInService.createListing(formDataObj);
      
      toast.success(`Trade-in submitted with ${selectedImages.length} image(s). Your listing will appear after verification.`);
      setShowForm(false);
      resetForm();
      clearImages();
      refetchListings();
      refetchStats();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [getSubmitData, selectedImages, setSubmitting, resetForm, clearImages, refetchListings, refetchStats]);

  if (isLoading) {
    return <TradeInSkeleton />;
  }

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <TradeInHeader onListDevice={() => setShowForm(true)} />

        <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          Your listing earnings are reflected directly in your NextBit Visa wallet balance. Use Wallet transaction history to track each credit event by ID and description.
        </div>

        <TradeInStats 
          stats={stats} 
          pendingCount={counts.pending} 
        />
        
        <HowItWorks />
        
        <StatusFilters 
          activeFilter={statusFilter}
          onFilterChange={setStatusFilter}
          counts={counts}
        />
        
        <TradeInListings listings={listings} />
      </div>
      <Footer />

      <TradeInFormModal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          clearImages();
          resetForm();
        }}
        onSubmit={handleSubmit}
        submitting={submitting}
        formData={formData}
        onFieldChange={updateField}
        images={selectedImages}
        previews={imagePreviews}
        onAddImages={addImages}
        onRemoveImage={removeImage}
        primaryIndex={primaryIndex}
        onSetPrimary={setPrimary}
      />
    </>
  );
}