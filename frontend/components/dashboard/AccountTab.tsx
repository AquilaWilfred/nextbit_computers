import { Badge } from "@/components/ui/badge";

interface AccountTabProps {
  user: { name?: string; email?: string; role?: string; phone?: string; createdAt?: string; lastSignedIn?: string } | null;
}

export function AccountTab({ user }: AccountTabProps) {
  const details = [
    { label: "Name", value: user?.name },
    { label: "Email", value: user?.email },
    { label: "Phone", value: user?.phone },
    { label: "Member Since", value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : undefined },
    { label: "Last Sign In", value: user?.lastSignedIn ? new Date(user.lastSignedIn).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : undefined },
  ];

  // Temporarily in AccountTab, remove after
    console.log("user:", JSON.stringify(user, null, 2));

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-bold">Account Settings</h1>
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-full bg-[var(--brand)]/10 flex items-center justify-center" aria-hidden="true">
            <span className="font-display font-bold text-xl text-[var(--brand)]">
              {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
            </span>
          </div>
          <div>
            <p className="font-display font-bold text-lg">{user?.name ?? "User"}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <Badge className="text-xs mt-1 capitalize">{user?.role ?? "user"}</Badge>
          </div>
        </div>
        <dl className="space-y-3 text-sm">
          {details.map(({ label, value }, i, arr) => (
            <div key={label} className={`flex justify-between py-2 ${i < arr.length - 1 ? "border-b border-border" : ""}`}>
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-medium">{value ?? "—"}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}