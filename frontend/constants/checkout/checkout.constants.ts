import { MapPin, Package, CreditCard, Smartphone} from "lucide-react";
import { PaymentMethod, Step, ShippingFormData} from "@/types/checkout/checkout.types";

export const STEPS: { id: Step; label: string; icon: React.ElementType }[] = [
  { id: "shipping", label: "Shipping", icon: MapPin },
  { id: "review", label: "Review", icon: Package },
  { id: "payment", label: "Payment", icon: CreditCard },
];

export const AVAILABLE_PAYMENT_METHODS = [
  {
    id: "stripe" as PaymentMethod,
    label: "Credit / Debit Card",
    sub: "Visa, Mastercard, Amex",
    icon: CreditCard,
  },
  {
    id: "mpesa" as PaymentMethod,
    label: "M-Pesa",
    sub: "Mobile money payment",
    icon: Smartphone,
  },
  {
    id: "paypal" as PaymentMethod,
    label: "PayPal",
    sub: "Pay with your PayPal account",
    icon: Package,
  },
];

export const DEFAULT_SHIPPING_FORM: ShippingFormData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address: "",
  county: "",
  city: "",
  postalCode: "",
  country: "United States",
  saveAddress: false,
};

export const COUNTRIES = [
  "Kenya",
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "South Africa",
  "Nigeria",
  "Germany",
  "France",
];