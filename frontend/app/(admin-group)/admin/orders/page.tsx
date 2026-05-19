"use client";

import { useState, useMemo } from "react";
import { useOrders } from "@/hooks/orders/useOrders";
import { useOrderFilters } from "@/hooks/orders/useOrderFilters";
import { useOrderSort } from "@/hooks/orders/useOrderSort";
import { useOrderActions } from "@/hooks/orders/useOrderActions";
import { useAgents } from "@/hooks/orders/useAgents";
import { useSettings } from "@/hooks/orders/useSettings";
import { useInvoice } from "@/hooks/orders/useInvoice";
import { OrdersHeader } from "@/components/orders/OrdersHeader";
import { OrdersFilters } from "@/components/orders/OrdersFilters";
import { OrdersTable } from "@/components/orders/OrdersTable";
import { Pagination } from "@/components/orders/Pagination";
import { OrderDetailsModal } from "@/components/orders/OrderDetailsModal";
import { Order } from "@/types/orders.types";

export default function AdminOrdersPage() {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [assignAgentId, setAssignAgentId] = useState("");

  const { searchTerm, setSearchTerm, debouncedSearch, statusFilter, setStatusFilter, page, setPage, itemsPerPage, setItemsPerPage, resetFilters } = useOrderFilters();
  const { orders, isLoading, updateOrderOptimistically, refetch } = useOrders(debouncedSearch, statusFilter);
  const { sortConfig, sortedOrders, handleSort } = useOrderSort(orders);
  const { updatingOrderId, assigningDelivery, updateStatus, assignDelivery, updateTracking } = useOrderActions(refetch);
  const { agents } = useAgents();
  const { settings } = useSettings();
  const { generateInvoice } = useInvoice(settings);

  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return sortedOrders.slice(start, start + itemsPerPage);
  }, [sortedOrders, page, itemsPerPage]);

  const totalPages = Math.ceil(sortedOrders.length / itemsPerPage);
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const handleStatusChange = (orderId: number, newStatus: string) => {
    updateStatus(orderId, newStatus);
    updateOrderOptimistically(orderId, { status: newStatus });
  };

  const handleAssignDelivery = async () => {
    if (!selectedOrder || !assignAgentId) return;
    const success = await assignDelivery(selectedOrder.id, parseInt(assignAgentId));
    if (success) {
      setAssignAgentId("");
      refetch();
    }
  };

  const activeOrder = useMemo(
    () => (selectedOrder ? orders.find((o) => o.id === selectedOrder.id) || selectedOrder : null),
    [selectedOrder, orders]
  );

  return (
    <div>
      <div className="space-y-6">
        <OrdersHeader />
        <OrdersFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          onReset={resetFilters}
        />
        <OrdersTable
          orders={paginatedOrders}
          isLoading={isLoading}
          sortConfig={sortConfig}
          updatingOrderId={updatingOrderId}
          onSort={handleSort}
          onStatusChange={handleStatusChange}
          onView={setSelectedOrder}
          onInvoice={generateInvoice}
          onTracking={updateTracking}
        />
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={sortedOrders.length}
          startIndex={startIndex}
          endIndex={endIndex}
          itemsPerPage={itemsPerPage}
          onPageChange={setPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>

      {activeOrder && (
        <OrderDetailsModal
          order={activeOrder}
          agents={agents}
          selectedAgentId={assignAgentId}
          assignAgentId={assignAgentId}
          isAssigning={assigningDelivery}
          onAgentChange={setAssignAgentId}
          onAssign={handleAssignDelivery}
          onClose={() => {
            setSelectedOrder(null);
            setAssignAgentId("");
          }}
        />
      )}
    </div>
  );
}