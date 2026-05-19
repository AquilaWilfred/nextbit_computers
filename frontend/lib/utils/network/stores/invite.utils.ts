export function generateInviteToken(): string {
  return Math.random().toString(36).substring(2, 18).toUpperCase();
}

export function getInviteLink(token: string): string {
  return `${window.location.origin}/join-network?token=${token}`;
}

export function validateInviteForm(form: { storeName: string; email: string }): boolean {
  return !!form.storeName.trim() && !!form.email.trim();
}