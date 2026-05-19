import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Branch, BranchFormData, HourRow } from "@/types/branches.types";
import { DEFAULT_FORM, DEFAULT_HOURS } from "@/constants/branches.constants";
import { apiFetch } from "@/lib/utils/branchUtilApis";

export function useBranchForm(onSuccess: () => void) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<BranchFormData>({ ...DEFAULT_FORM });
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const openAddForm = useCallback(() => {
    setEditingId(null);
    setForm({ ...DEFAULT_FORM, hours: DEFAULT_HOURS });
    setShowForm(true);
  }, []);

  const openEditForm = useCallback((branch: Branch) => {
    setEditingId(branch.id);
    setForm({
      name: branch.name,
      address: branch.address,
      phone: branch.phone ?? "",
      email: branch.email ?? "",
      lat: branch.lat,
      lng: branch.lng,
      isMain: branch.isMain,
      active: branch.active,
      hours: branch.hours?.length ? branch.hours : DEFAULT_HOURS,
    });
    setShowForm(true);
  }, []);

  const closeForm = useCallback(() => {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...DEFAULT_FORM });
  }, []);

  const updateFormField = useCallback(<K extends keyof BranchFormData>(
    field: K,
    value: BranchFormData[K]
  ) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateHour = useCallback((index: number, field: keyof HourRow, value: string) => {
    setForm(prev => ({
      ...prev,
      hours: prev.hours.map((hour, i) =>
        i === index ? { ...hour, [field]: value } : hour
      ),
    }));
  }, []);

  const addHourRow = useCallback(() => {
    setForm(prev => ({
      ...prev,
      hours: [...prev.hours, { label: "", value: "" }],
    }));
  }, []);

  const removeHourRow = useCallback((index: number) => {
    setForm(prev => ({
      ...prev,
      hours: prev.hours.filter((_, i) => i !== index),
    }));
  }, []);

  const setLocation = useCallback((lat: number, lng: number) => {
    setForm(prev => ({
      ...prev,
      lat: lat.toFixed(7),
      lng: lng.toFixed(7),
    }));
  }, []);

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }
    
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
        toast.success("Location detected!");
      },
      () => {
        setLocating(false);
        toast.error("Could not detect location");
      }
    );
  }, [setLocation]);

  const submitForm = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    const lat = form.lat.trim();
    const lng = form.lng.trim();
    
    if (!lat || !lng) {
      toast.error("Please set a location");
      return;
    }
    if (Number.isNaN(Number(lat)) || Number.isNaN(Number(lng))) {
      toast.error("Invalid coordinates");
      return;
    }

    setSubmitting(true);
    try {
      const payload = { ...form, lat, lng };
      
      if (editingId !== null) {
        await apiFetch(`/api/admin/branches/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast.success("Branch updated!");
      } else {
        await apiFetch("/api/admin/branches", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Branch added!");
      }
      
      closeForm();
      onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  }, [form, editingId, closeForm, onSuccess]);

  return {
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
  };
}