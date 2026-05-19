"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePayments } from "@/hooks/payments/usePayments";
import { usePayouts } from "@/hooks/payments/usePayouts";
import { usePaymentMethods } from "@/hooks/payments/usePaymentMethods";
import { useMpesaSettings } from "@/hooks/payments/useMpesaSettings";
import { usePaymentFilters } from "@/hooks/payments/usePaymentFilters";
import { usePayoutFilters } from "@/hooks/payments/usePayoutFilters";
import { usePaymentActions } from "@/hooks/payments/usePaymentActions";
import { PaymentsHeader } from "@/components/payments/PaymentsHeader";
import { PaymentsStatsCards } from "@/components/payments/PaymentsStatsCards";
import { PayoutsStatsCards } from "@/components/payments/PayoutsStatsCards";
import { PaymentMethodsConfig } from "@/components/payments/PaymentMethodsConfig";
import { MpesaConfigForm } from "@/components/payments/MpesaConfigForm";
import { PaymentsFilters } from "@/components/payments/PaymentsFilters";
import { PaymentsTable } from "@/components/payments/PaymentsTable";
import { PayoutsFilters } from "@/components/payments/PayoutsFilters";
import { PayoutsTable } from "@/components/payments/PayoutsTable";
import { PayoutsChart } from "@/components/payments/PayoutsChart";
import { PaymentDetailsModal } from "@/components/payments/PaymentDetailsModal";
import { useExportFormat } from "@/hooks/payments/useExportFormat";
import { sortPayments } from "@/lib/utils/pay.utils";

export default function AdminPaymentsPage() {
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const { payments, isLoading: paymentsLoading, refetch: refetchPayments } = usePayments();
  const { payouts, isLoading: payoutsLoading, refetch: refetchPayouts } = usePayouts();
  const { methods, toggling, toggleMethod } = usePaymentMethods();
  const { settings, saving, updateSetting, saveSettings } = useMpesaSettings();
  const { exportFormat, setExportFormat, handleExport: handleExportBase } = useExportFormat();
  const { approvingId, rejectingId, refunding, approvePayout, rejectPayout, refundPayment } = usePaymentActions(() => {
    refetchPayments();
    refetchPayouts();
  });

  const {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    page,
    setPage,
    itemsPerPage,
    setItemsPerPage,
    filteredPayments,
  } = usePaymentFilters(payments);

  const {
    statusFilter: payoutStatusFilter,
    setStatusFilter: setPayoutStatusFilter,
    startDate: payoutStartDate,
    setStartDate: setPayoutStartDate,
    endDate: payoutEndDate,
    setEndDate: setPayoutEndDate,
    page: payoutsPage,
    setPage: setPayoutsPage,
    itemsPerPage: payoutsItemsPerPage,
    setItemsPerPage: setPayoutsItemsPerPage,
    filteredPayouts,
  } = usePayoutFilters(payouts);

  const sortedPayments = useMemo(() => sortPayments(filteredPayments, sortConfig), [filteredPayments, sortConfig]);
  const paginatedPayments = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return sortedPayments.slice(start, start + itemsPerPage);
  }, [sortedPayments, page, itemsPerPage]);

  const paginatedPayouts = useMemo(() => {
    const start = (payoutsPage - 1) * payoutsItemsPerPage;
    return filteredPayouts.slice(start, start + payoutsItemsPerPage);
  }, [filteredPayouts, payoutsPage, payoutsItemsPerPage]);

  const handleSort = (key: string) => {
    setSortConfig((current) => ({
      key,
      direction: current?.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleExportPayments = () => {
    if (!filteredPayments.length) return toast.error("No payment data to export.");
    handleExportBase(filteredPayments, "payments-export");
  };

  const handleExportPayouts = () => {
    if (!filteredPayouts.length) return toast.error("No payout data to export.");
    handleExportBase(filteredPayouts, "payouts-export");
  };

  return (
    <div>
      <div className="space-y-6">
        <PaymentsHeader />

        <Tabs defaultValue="customer_payments" className="w-full space-y-6">
          <TabsList>
            <TabsTrigger value="customer_payments">Customer Payments</TabsTrigger>
            <TabsTrigger value="driver_payouts">Driver Payouts</TabsTrigger>
          </TabsList>

          {/* Customer Payments Tab */}
          <TabsContent value="customer_payments" className="space-y-6 m-0">
            <PaymentsStatsCards payments={payments} />
            <PaymentMethodsConfig methods={methods} toggling={toggling} onToggle={toggleMethod} />
            <MpesaConfigForm settings={settings} saving={saving} onUpdate={updateSetting} onSave={saveSettings} />
            <PaymentsFilters
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              startDate={startDate}
              onStartDateChange={setStartDate}
              endDate={endDate}
              onEndDateChange={setEndDate}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              exportFormat={exportFormat}
              onExportFormatChange={setExportFormat}
              onExport={handleExportPayments}
            />
            <PaymentsTable
              payments={paginatedPayments}
              isLoading={paymentsLoading}
              sortConfig={sortConfig}
              page={page}
              totalPages={Math.ceil(sortedPayments.length / itemsPerPage)}
              totalItems={sortedPayments.length}
              startIndex={(page - 1) * itemsPerPage}
              endIndex={page * itemsPerPage}
              itemsPerPage={itemsPerPage}
              onSort={handleSort}
              onPageChange={setPage}
              onItemsPerPageChange={setItemsPerPage}
              onViewPayment={setSelectedPayment}
            />
          </TabsContent>

          {/* Driver Payouts Tab */}
          <TabsContent value="driver_payouts" className="space-y-6 m-0">
            <PayoutsStatsCards payouts={payouts} />
            <PayoutsChart data={[]} />
            <PayoutsFilters
              startDate={payoutStartDate}
              onStartDateChange={setPayoutStartDate}
              endDate={payoutEndDate}
              onEndDateChange={setPayoutEndDate}
              statusFilter={payoutStatusFilter}
              onStatusChange={setPayoutStatusFilter}
              exportFormat={exportFormat}
              onExportFormatChange={setExportFormat}
              onExport={handleExportPayouts}
            />
            <PayoutsTable
              payouts={paginatedPayouts}
              isLoading={payoutsLoading}
              approvingId={approvingId}
              rejectingId={rejectingId}
              page={payoutsPage}
              totalPages={Math.ceil(filteredPayouts.length / payoutsItemsPerPage)}
              totalItems={filteredPayouts.length}
              startIndex={(payoutsPage - 1) * payoutsItemsPerPage}
              endIndex={payoutsPage * payoutsItemsPerPage}
              itemsPerPage={payoutsItemsPerPage}
              onPageChange={setPayoutsPage}
              onItemsPerPageChange={setPayoutsItemsPerPage}
              onApprove={approvePayout}
              onReject={rejectPayout}
            />
          </TabsContent>
        </Tabs>

        <PaymentDetailsModal
          payment={selectedPayment}
          refunding={refunding}
          onClose={() => setSelectedPayment(null)}
          onRefund={() => selectedPayment && refundPayment(selectedPayment.orderId)}
        />
      </div>
    </div>
  );
}