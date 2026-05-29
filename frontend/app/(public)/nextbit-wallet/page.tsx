// 06-pages/app/(public)/nextbit-wallet/page.tsx

"use client";

import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';
import { useCardsData } from '@/hooks/nextbit-wallet/useCardsData';
import { useCardApplication } from '@/hooks/nextbit-wallet/useCardApplication';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import {
  CardsHero,
  CardsStats,
  CardProductCard,
  VirtualCardSection,
  RecentTransactions,
  ApplicationsList,
  ApplicationModal,
  CardsSkeleton,
} from '@/components/nextbit-wallet';

export default function NextbitWalletPage() {
  const { user } = useAuth();
  const { products, applications, virtualCard, transactions, stats, loading, refetch } = useCardsData();
  const [showApplicationForm, setShowApplicationForm] = useState(false);

  const {
    submitting,
    selectedCard,
    formData,
    setSelectedCard,
    setFormData,
    updateFormField,
    submitApplication,
    resetForm,
  } = useCardApplication({
    onSuccess: () => {
      setShowApplicationForm(false);
      refetch();
    },
  });

  const selectedProduct = products.find(p => p.id === selectedCard);
  const cardsIssued = applications.filter(a => a.status === "approved" || a.status === "active").length;
  const cardholderName = user?.full_name || user?.email?.split("@")[0] || "Cardholder";

  const handleApplyClick = useCallback((productId: string) => {
    setSelectedCard(productId);
    setFormData(prev => ({
      ...prev,
      full_name: prev.full_name ?? user?.full_name ?? '',
      phone: prev.phone ?? user?.phone ?? '',
      email: prev.email ?? user?.email ?? '',
    }));
    setShowApplicationForm(true);
  }, [setSelectedCard, setFormData, user]);

  const handleCloseModal = useCallback(() => {
    setShowApplicationForm(false);
    resetForm();
  }, [resetForm]);

  const isFieldDisabled = useCallback((field: string) => {
    if (field === 'full_name' && user?.full_name) return true;
    if (field === 'phone' && user?.phone) return true;
    if (field === 'email' && user?.email) return true;
    return false;
  }, [user]);

  if (loading) {
    return <CardsSkeleton />;
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
        <div className="container mx-auto px-4 py-8">
          <CardsHero />
          <CardsStats stats={stats} cardsIssued={cardsIssued} />

          {virtualCard && (
            <VirtualCardSection 
              virtualCard={virtualCard} 
              cardholderName={cardholderName}
              onStatusChange={refetch}
            />
          )}

          {/* Card Products */}
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              Choose Your Card
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {products.map(product => (
                <CardProductCard 
                  key={product.id} 
                  product={product} 
                  onApply={handleApplyClick} 
                />
              ))}
            </div>
          </div>

          {virtualCard && transactions.length > 0 && (
            <RecentTransactions transactions={transactions} />
          )}

          <ApplicationsList applications={applications} />
        </div>
      </div>
      <Footer />

      <ApplicationModal
        isOpen={showApplicationForm}
        productName={selectedProduct?.name || ''}
        formData={formData}
        submitting={submitting}
        onClose={handleCloseModal}
        onSubmit={submitApplication}
        onFieldChange={updateFormField}
        isFieldDisabled={isFieldDisabled}
      />
    </>
  );
}