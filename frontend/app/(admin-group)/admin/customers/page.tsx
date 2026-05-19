"use client";

import { useState } from "react";
import { useDebounce } from "@/hooks/customers/useDebounce";
import { useCustomers } from "@/hooks/customers/useCustomers";
import { useCustomerSort } from "@/hooks/customers/useCustomerSort";
import { useCustomerPagination } from "@/hooks/customers/useCustomerPagination";
import { usePasswordReset } from "@/hooks/customers/usePasswordReset";
import { useAICampaign } from "@/hooks/customers/useAICampaign";
import { CustomersHeader } from "@/components/customers/CustomersHeader";
import { CustomerStats } from "@/components/customers/CustomerStats";
import { CustomerSearch } from "@/components/customers/CustomerSearch";
import { CustomersTable } from "@/components/customers/CustomersTable";
import { TablePagination } from "@/components/customers/TablePagination";
import { CustomerDetailModal } from "@/components/customers/CustomerDetailModal";
import { Customer } from "@/types/customers.types";

export default function AdminCustomersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  const debouncedSearch = useDebounce(searchTerm, 300);
  const { customers, isLoading, wsConnected } = useCustomers(debouncedSearch);
  const { sortConfig, sortedCustomers, handleSort } = useCustomerSort(customers);
  const { resettingEmail, resetPassword } = usePasswordReset();
  const { isPending: isCampaignPending, triggerCampaign } = useAICampaign();
  
  const {
    page,
    itemsPerPage,
    setItemsPerPage,
    startIndex,
    endIndex,
    totalPages,
    paginate,
    goToNextPage,
    goToPreviousPage,
  } = useCustomerPagination(sortedCustomers.length, debouncedSearch);

  const paginatedCustomers = paginate(sortedCustomers);

  const handleResetPassword = async (email: string) => {
    await resetPassword(email);
  };

  return (
    <div>
      <div className="space-y-6">
        <CustomersHeader
          wsConnected={wsConnected}
          isCampaignPending={isCampaignPending}
          onTriggerCampaign={triggerCampaign}
        />

        <CustomerStats customers={customers} />

        <CustomerSearch value={searchTerm} onChange={setSearchTerm} />

        <CustomersTable
          customers={customers}
          isLoading={isLoading}
          sortConfig={sortConfig}
          onSort={handleSort}
          onViewCustomer={setSelectedCustomer}
          paginatedCustomers={paginatedCustomers}
        />

        {!isLoading && customers.length > 0 && (
          <TablePagination
            startIndex={startIndex}
            endIndex={endIndex}
            totalItems={sortedCustomers.length}
            page={page}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={setItemsPerPage}
            onPreviousPage={goToPreviousPage}
            onNextPage={goToNextPage}
          />
        )}
      </div>

      <CustomerDetailModal
        customer={selectedCustomer}
        isResetting={resettingEmail === selectedCustomer?.email}
        onClose={() => setSelectedCustomer(null)}
        onResetPassword={handleResetPassword}
      />
    </div>
  );
}