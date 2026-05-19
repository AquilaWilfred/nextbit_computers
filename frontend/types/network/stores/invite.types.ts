export interface InviteForm {
  storeName: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  message: string;
}

export type InviteFormKey = keyof InviteForm;