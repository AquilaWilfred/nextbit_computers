"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Building2, FileText, Upload, CheckCircle2,
  ChevronRight, ChevronLeft, X, Eye, Loader2,
  ShieldCheck, AlertCircle, Info,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CompanyInfo {
  companyName: string;
  kraPin: string;
  registrationNumber: string;
  vatNumber: string;
  industry: string;
  website: string;
  physicalAddress: string;
  postalAddress: string;
  city: string;
  country: string;
}

interface PrimaryContact {
  fullName: string;
  title: string;
  email: string;
  phone: string;
  department: string;
}

interface FinanceContact {
  fullName: string;
  email: string;
  phone: string;
}

interface UploadedDoc {
  key: string;
  file: File;
  previewUrl: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Company Info",  icon: Building2 },
  { label: "Contacts",      icon: FileText },
  { label: "Documents",     icon: Upload },
  { label: "Review",        icon: CheckCircle2 },
];

const INDUSTRIES = [
  "Banking & Financial Services",
  "Telecommunications",
  "Government & Public Sector",
  "Education & Research",
  "Healthcare",
  "Media & Publishing",
  "Retail & FMCG",
  "Manufacturing",
  "NGO / Non-profit",
  "Technology",
  "Other",
];

const REQUIRED_DOCS: {
  key: string;
  label: string;
  desc: string;
  required: boolean;
}[] = [
  {
    key: "cert_of_incorporation",
    label: "Certificate of Incorporation",
    desc: "Issued by the Registrar of Companies (Kenya)",
    required: true,
  },
  {
    key: "kra_pin_cert",
    label: "KRA PIN Certificate",
    desc: "Company KRA PIN Certificate from iTax",
    required: true,
  },
  {
    key: "cr12",
    label: "CR12 — Current Directors",
    desc: "Recent CR12 from the Business Registration Service (within 3 months)",
    required: true,
  },
  {
    key: "vat_cert",
    label: "VAT Registration Certificate",
    desc: "If your company is VAT-registered",
    required: false,
  },
  {
    key: "bank_reference",
    label: "Bank Reference Letter",
    desc: "From your primary business bank, on bank letterhead",
    required: false,
  },
  {
    key: "company_profile",
    label: "Company Profile",
    desc: "Overview of your business and expected procurement volumes",
    required: false,
  },
];

const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_FILE_MB = 5;

// ─── Step 1: Company Information ──────────────────────────────────────────────

function CompanyInfoStep({
  data,
  onChange,
}: {
  data: CompanyInfo;
  onChange: (d: CompanyInfo) => void;
}) {
  const field = (
    label: string,
    key: keyof CompanyInfo,
    placeholder: string,
    required = true,
    type = "text"
  ) => (
    <div className="space-y-1.5" key={key}>
      <label className="text-xs font-medium text-muted-foreground">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <Input
        type={type}
        placeholder={placeholder}
        value={data[key]}
        onChange={(e) => onChange({ ...data, [key]: e.target.value })}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-4">
        {field("Company Name", "companyName", "e.g. Safaricom PLC")}
        {field("KRA PIN", "kraPin", "e.g. P051234567B")}
        {field("Registration Number", "registrationNumber", "e.g. CPR/2020/123456")}
        {field("VAT Number", "vatNumber", "e.g. P051234567B", false)}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Industry <span className="text-red-500">*</span>
        </label>
        <select
          className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          value={data.industry}
          onChange={(e) => onChange({ ...data, industry: e.target.value })}
        >
          <option value="">Select industry…</option>
          {INDUSTRIES.map((i) => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {field("Website", "website", "https://company.co.ke", false)}
        {field("City", "city", "e.g. Nairobi")}
      </div>

      {field("Physical Address", "physicalAddress", "Street address, building, floor")}
      {field("Postal Address", "postalAddress", "e.g. P.O. Box 12345 - 00100 Nairobi", false)}

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Country</label>
        <select
          className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          value={data.country}
          onChange={(e) => onChange({ ...data, country: e.target.value })}
        >
          {["Kenya", "Uganda", "Tanzania", "Rwanda", "Ethiopia", "Other"].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ─── Step 2: Contacts ─────────────────────────────────────────────────────────

function ContactsStep({
  primary,
  finance,
  onPrimary,
  onFinance,
}: {
  primary: PrimaryContact;
  finance: FinanceContact;
  onPrimary: (d: PrimaryContact) => void;
  onFinance: (d: FinanceContact) => void;
}) {
  const pField = (label: string, key: keyof PrimaryContact, placeholder: string) => (
    <div className="space-y-1.5" key={key}>
      <label className="text-xs font-medium text-muted-foreground">{label} <span className="text-red-500">*</span></label>
      <Input
        placeholder={placeholder}
        value={primary[key]}
        onChange={(e) => onPrimary({ ...primary, [key]: e.target.value })}
      />
    </div>
  );

  const fField = (label: string, key: keyof FinanceContact, placeholder: string) => (
    <div className="space-y-1.5" key={key}>
      <label className="text-xs font-medium text-muted-foreground">{label} <span className="text-red-500">*</span></label>
      <Input
        placeholder={placeholder}
        value={finance[key]}
        onChange={(e) => onFinance({ ...finance, [key]: e.target.value })}
      />
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">1</span>
          Primary Contact (Procurement Manager / Authorised Signatory)
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          {pField("Full Name", "fullName", "e.g. Jane Mwangi")}
          {pField("Title / Role", "title", "e.g. Head of Procurement")}
          {pField("Work Email", "email", "jane@company.co.ke")}
          {pField("Phone Number", "phone", "+254 700 000 000")}
          {pField("Department", "department", "e.g. Finance & Procurement")}
        </div>
      </div>

      <div className="border-t border-border pt-6">
        <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs flex items-center justify-center font-bold">2</span>
          Finance / Accounts Contact (for invoices &amp; payment)
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          {fField("Full Name", "fullName", "e.g. John Ochieng")}
          {fField("Finance Email", "email", "accounts@company.co.ke")}
          {fField("Phone Number", "phone", "+254 700 000 000")}
        </div>
      </div>

      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          The primary contact will receive the account activation email and can invite additional
          users. The finance contact receives all invoices and payment reminders.
        </p>
      </div>
    </div>
  );
}

// ─── Step 3: Document Upload ──────────────────────────────────────────────────

function DocumentsStep({
  docs,
  onDocs,
}: {
  docs: Record<string, UploadedDoc>;
  onDocs: (d: Record<string, UploadedDoc>) => void;
}) {
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleFile = (key: string, file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Only PDF, JPG and PNG files are accepted.");
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      toast.error(`File must be under ${MAX_FILE_MB}MB.`);
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    onDocs({ ...docs, [key]: { key, file, previewUrl } });
  };

  const handleRemove = (key: string) => {
    const next = { ...docs };
    if (next[key]) URL.revokeObjectURL(next[key].previewUrl);
    delete next[key];
    onDocs(next);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Upload clear scans or photos. All documents must be valid and not expired. Documents
          marked <span className="text-red-500 font-semibold">*</span> are required — your
          application cannot proceed without them. Max {MAX_FILE_MB}MB per file (PDF, JPG, PNG).
        </p>
      </div>

      <div className="space-y-3">
        {REQUIRED_DOCS.map((doc) => {
          const uploaded = docs[doc.key];
          return (
            <div
              key={doc.key}
              className={`rounded-xl border p-4 transition-colors ${
                uploaded
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-border hover:border-primary/30"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  uploaded ? "bg-emerald-500/10" : "bg-muted"
                }`}>
                  {uploaded
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    : <FileText className="w-5 h-5 text-muted-foreground" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold">{doc.label}</p>
                    {doc.required
                      ? <span className="text-red-500 text-xs font-bold">*required</span>
                      : <span className="text-muted-foreground text-xs">optional</span>
                    }
                  </div>
                  <p className="text-xs text-muted-foreground">{doc.desc}</p>
                  {uploaded && (
                    <p className="text-xs text-emerald-600 mt-1 truncate">
                      {uploaded.file.name} ({(uploaded.file.size / 1024).toFixed(0)} KB)
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {uploaded && (
                    <>
                      <a
                        href={uploaded.previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        title="Preview"
                      >
                        <Eye className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => handleRemove(doc.key)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-600"
                        title="Remove"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant={uploaded ? "outline" : "default"}
                    className="gap-1.5"
                    onClick={() => inputRefs.current[doc.key]?.click()}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {uploaded ? "Replace" : "Upload"}
                  </Button>
                  <input
                    ref={(el) => { inputRefs.current[doc.key] = el; }}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(doc.key, f);
                      e.target.value = "";
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 4: Review & Submit ──────────────────────────────────────────────────

function ReviewStep({
  companyInfo,
  primary,
  finance,
  docs,
}: {
  companyInfo: CompanyInfo;
  primary: PrimaryContact;
  finance: FinanceContact;
  docs: Record<string, UploadedDoc>;
}) {
  const section = (title: string, rows: [string, string][]) => (
    <Card className="p-5 border border-border">
      <h3 className="font-semibold text-sm mb-3">{title}</h3>
      <div className="space-y-2">
        {rows.filter(([, v]) => v).map(([label, value]) => (
          <div key={label} className="flex gap-3 text-sm">
            <span className="text-muted-foreground w-40 shrink-0">{label}</span>
            <span className="font-medium">{value}</span>
          </div>
        ))}
      </div>
    </Card>
  );

  const missingRequired = REQUIRED_DOCS.filter((d) => d.required && !docs[d.key]);

  return (
    <div className="space-y-4">
      {missingRequired.length > 0 && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-600">Missing required documents</p>
            <ul className="mt-1 space-y-0.5">
              {missingRequired.map((d) => (
                <li key={d.key} className="text-xs text-muted-foreground">· {d.label}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {section("Company information", [
        ["Company name", companyInfo.companyName],
        ["KRA PIN", companyInfo.kraPin],
        ["Registration no.", companyInfo.registrationNumber],
        ["VAT number", companyInfo.vatNumber],
        ["Industry", companyInfo.industry],
        ["Physical address", companyInfo.physicalAddress],
        ["City", companyInfo.city],
        ["Country", companyInfo.country],
        ["Website", companyInfo.website],
      ])}

      {section("Primary contact", [
        ["Full name", primary.fullName],
        ["Title", primary.title],
        ["Email", primary.email],
        ["Phone", primary.phone],
        ["Department", primary.department],
      ])}

      {section("Finance contact", [
        ["Full name", finance.fullName],
        ["Email", finance.email],
        ["Phone", finance.phone],
      ])}

      <Card className="p-5 border border-border">
        <h3 className="font-semibold text-sm mb-3">Documents</h3>
        <div className="space-y-2">
          {REQUIRED_DOCS.map((d) => (
            <div key={d.key} className="flex items-center gap-3 text-sm">
              {docs[d.key]
                ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                : <X className="w-4 h-4 text-red-500 shrink-0" />
              }
              <span className={docs[d.key] ? "font-medium" : "text-muted-foreground"}>
                {d.label}
              </span>
              {!d.required && !docs[d.key] && (
                <span className="text-[10px] text-muted-foreground">(optional)</span>
              )}
            </div>
          ))}
        </div>
      </Card>

      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          By submitting this application you confirm that all information provided is accurate and
          complete, and that the documents uploaded are authentic. NextBit reserves the right to
          reject applications with falsified information. Your data will be processed in accordance
          with our Privacy Policy.
        </p>
      </div>
    </div>
  );
}

// ─── Success Screen ───────────────────────────────────────────────────────────

function SuccessScreen({ refNumber }: { refNumber: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
        <ShieldCheck className="w-8 h-8 text-emerald-500" />
      </div>
      <h2 className="text-xl font-bold mb-2">Application Submitted</h2>
      <p className="text-muted-foreground text-sm max-w-md mb-6 leading-relaxed">
        Your B2B account application has been received. Our team will verify your documents and
        respond within <strong>2–3 business days</strong>. You will receive an email update at the
        address you provided.
      </p>
      <div className="rounded-xl border border-border bg-muted/30 px-6 py-4 mb-8">
        <p className="text-xs text-muted-foreground mb-1">Application reference</p>
        <p className="font-mono font-bold text-lg tracking-wider">{refNumber}</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function B2BRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [refNumber, setRefNumber] = useState("");
  const [showApplyModal, setShowApplyModal] = useState(false);

  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    companyName: "", kraPin: "", registrationNumber: "", vatNumber: "",
    industry: "", website: "", physicalAddress: "", postalAddress: "",
    city: "", country: "Kenya",
  });

  const [primary, setPrimary] = useState<PrimaryContact>({
    fullName: "", title: "", email: "", phone: "", department: "",
  });

  const [finance, setFinance] = useState<FinanceContact>({
    fullName: "", email: "", phone: "",
  });

  const [docs, setDocs] = useState<Record<string, UploadedDoc>>({});

  const resetForm = () => {
    setStep(0);
    setSubmitted(false);
    setCompanyInfo({
      companyName: "", kraPin: "", registrationNumber: "", vatNumber: "",
      industry: "", website: "", physicalAddress: "", postalAddress: "",
      city: "", country: "Kenya",
    });
    setPrimary({ fullName: "", title: "", email: "", phone: "", department: "" });
    setFinance({ fullName: "", email: "", phone: "" });
    setDocs({});
  };

  const validateStep = (): boolean => {
    if (step === 0) {
      if (!companyInfo.companyName || !companyInfo.kraPin || !companyInfo.registrationNumber || !companyInfo.industry || !companyInfo.physicalAddress || !companyInfo.city) {
        toast.error("Please fill in all required fields.");
        return false;
      }
    }
    if (step === 1) {
      if (!primary.fullName || !primary.title || !primary.email || !primary.phone || !primary.department) {
        toast.error("Please fill in all primary contact fields.");
        return false;
      }
      if (!finance.fullName || !finance.email || !finance.phone) {
        toast.error("Please fill in all finance contact fields.");
        return false;
      }
    }
    if (step === 2) {
      const missing = REQUIRED_DOCS.filter((d) => d.required && !docs[d.key]);
      if (missing.length > 0) {
        toast.error(`Please upload: ${missing.map((d) => d.label).join(", ")}`);
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    setStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    const missing = REQUIRED_DOCS.filter((d) => d.required && !docs[d.key]);
    if (missing.length > 0) {
      toast.error("Missing required documents. Please go back and upload them.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("companyInfo", JSON.stringify(companyInfo));
      formData.append("primaryContact", JSON.stringify(primary));
      formData.append("financeContact", JSON.stringify(finance));
      Object.values(docs).forEach((d) => {
        formData.append(`doc_${d.key}`, d.file, d.file.name);
      });

      const res = await fetch("/api/b2b/register", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error();
      const data = await res.json();
      setRefNumber(data.referenceNumber ?? "NB-" + Date.now());
      setSubmitted(true);
      toast.success("Application submitted successfully!");
    } catch {
      toast.error("Submission failed. Please try again or contact support.");
    } finally {
      setSubmitting(false);
    }
  };

  const StepIndicators = () => (
    <div className="flex items-center">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const active = i === step;
        const done = i < step;
        return (
          <div key={s.label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors ${
                done ? "bg-primary border-primary" :
                active ? "border-primary bg-primary/10" :
                "border-border bg-muted"
              }`}>
                {done
                  ? <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                  : <Icon className={`w-4 h-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                }
              </div>
              <span className={`text-[11px] mt-1.5 font-medium whitespace-nowrap ${active ? "text-primary" : "text-muted-foreground"}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mb-4 transition-colors ${done ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 bg-background z-20">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Building2 className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-sm">NextBit</span>
        </Link>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          Secure B2B Registration
        </div>
      </header>

      <div className="max-w-[min(100vw-4rem,1200px)] mx-auto px-6 py-10">
        {/* Title */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold mb-2">Apply for a Corporate Account</h1>
          <p className="text-muted-foreground text-sm">
            Get access to credit terms, LPO management, VAT invoicing, and bulk pricing.
          </p>
        </div>

        {/* Corporate Account Application Card */}
        <Card className="bg-gradient-to-br from-blue-500/5 to-purple-500/5 border border-blue-200/20 p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-sm text-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Corporate Account Application
              </p>
              <p className="text-xs text-muted-foreground mt-2 max-w-md">
                Need to register a new corporate entity? Submit an application to get started with LPO management,
                supplier integration, and tax reporting.
              </p>
            </div>

            <Dialog
              open={showApplyModal}
              onOpenChange={(open) => {
                setShowApplyModal(open);
                if (!open) resetForm();
              }}
            >
              <DialogTrigger asChild>
                <Button className="gap-2 whitespace-nowrap">
                  <ShieldCheck className="w-4 h-4" />
                  Apply Now
                </Button>
              </DialogTrigger>

              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Apply for Corporate Account
                  </DialogTitle>
                  <DialogDescription>
                    Get access to credit terms, LPO management, VAT invoicing, and bulk pricing.
                  </DialogDescription>
                </DialogHeader>

                {submitted ? (
                  <>
                    <SuccessScreen refNumber={refNumber} />
                    <div className="flex justify-center pb-4">
                      <Button variant="outline" onClick={() => setShowApplyModal(false)}>
                        Close
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-6">
                    <StepIndicators />

                    {step === 0 && (
                      <CompanyInfoStep data={companyInfo} onChange={setCompanyInfo} />
                    )}
                    {step === 1 && (
                      <ContactsStep
                        primary={primary}
                        finance={finance}
                        onPrimary={setPrimary}
                        onFinance={setFinance}
                      />
                    )}
                    {step === 2 && (
                      <DocumentsStep docs={docs} onDocs={setDocs} />
                    )}
                    {step === 3 && (
                      <ReviewStep
                        companyInfo={companyInfo}
                        primary={primary}
                        finance={finance}
                        docs={docs}
                      />
                    )}

                    {/* Navigation */}
                    <div className="flex justify-between pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={handleBack}
                        disabled={step === 0}
                        className="gap-2"
                      >
                        <ChevronLeft className="w-4 h-4" /> Back
                      </Button>
                      {step < STEPS.length - 1 ? (
                        <Button onClick={handleNext} className="gap-2">
                          Continue <ChevronRight className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button
                          onClick={handleSubmit}
                          disabled={submitting}
                          className="gap-2 min-w-32"
                        >
                          {submitting ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
                          ) : (
                            <><ShieldCheck className="w-4 h-4" /> Submit Application</>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Already have an account?{" "}
          <Link href="/b2b/login" className="text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}