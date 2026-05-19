"use client";

import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { useBranches } from "@/hooks/branches/useBranches";
import { useBranchForm } from "@/hooks/branches/useBranchForm";
import { BranchCard } from "@/components/branches/BranchCard";
import { BranchForm } from "@/components/branches/BranchForm";
import { BranchEmptyState } from "@/components/branches/BranchEmptyState";

export default function AdminBranchesPage() {
  const {
    branches,
    loading,
    deletingId,
    fetchBranches,
    deleteBranch,
  } = useBranches();

  const {
    showForm,
    editingId,
    form,
    locating,
    submitting,
    openAddForm,
    openEditForm,
    closeForm,
    updateFormField,
    updateHour,
    addHourRow,
    removeHourRow,
    setLocation,
    detectLocation,
    submitForm,
  } = useBranchForm(fetchBranches);

  return (
    <div>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Branch Locations</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage your store branches and their locations
            </p>
          </div>
          <Button
            onClick={openAddForm}
            className="bg-[var(--brand)] text-white hover:opacity-90 gap-2"
          >
            <Plus size={16} /> Add Branch
          </Button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--brand)]" />
          </div>
        ) : !branches.length ? (
          <BranchEmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {branches.map((branch) => (
              <BranchCard
                key={branch.id}
                branch={branch}
                onEdit={openEditForm}
                onDelete={deleteBranch}
                isDeleting={deletingId === branch.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Form Modal */}
      <BranchForm
        isOpen={showForm}
        editingId={editingId}
        form={form}
        locating={locating}
        submitting={submitting}
        onClose={closeForm}
        onSubmit={submitForm}
        onUpdateField={updateFormField}
        onUpdateHour={updateHour}
        onAddHourRow={addHourRow}
        onRemoveHourRow={removeHourRow}
        onSetLocation={setLocation}
        onDetectLocation={detectLocation}
      />
    </div>
  );
}