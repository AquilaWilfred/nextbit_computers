import { SavedAddress, ShippingFormData } from "@/types/checkout/checkout.types";

export function useAddresses() {
  const loadAddress = (
    addr: SavedAddress,
    setShipping: React.Dispatch<React.SetStateAction<ShippingFormData>>
  ) => {
    if (!addr) return;
    const parts = addr.fullName.split(" ");
    setShipping((s) => ({
      ...s,
      firstName: parts[0] || "",
      lastName: parts.slice(1).join(" "),
      phone: addr.phone,
      county: addr.county || "",
      address: addr.addressLine,
      city: addr.city,
      postalCode: addr.postalCode ?? "",
      country: addr.country,
    }));
  };

  return { loadAddress };
}