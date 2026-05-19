export type ExportFormat = "csv" | "excel" | "pdf";

const STORAGE_KEY = "last_export_format";
const VALID_FORMATS: ExportFormat[] = ["csv", "excel", "pdf"];

export function getSavedExportFormat(defaultFormat: ExportFormat = "csv"): ExportFormat {
  if (typeof window === "undefined") {
    return defaultFormat;
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw && VALID_FORMATS.includes(raw as ExportFormat)) {
    return raw as ExportFormat;
  }
  return defaultFormat;
}

export function setSavedExportFormat(format: ExportFormat) {
  if (typeof window === "undefined") {
    return;
  }
  if (VALID_FORMATS.includes(format)) {
    window.localStorage.setItem(STORAGE_KEY, format);
  }
}

function quoteCsvCell(value: string) {
  if (value == null) {
    return "";
  }
  const escaped = value.replace(/"/g, '""');
  if (escaped.includes(",") || escaped.includes("\n") || escaped.includes("\"") || escaped.includes("\r")) {
    return `"${escaped}"`;
  }
  return escaped;
}

function buildCsv(rows: string[][]) {
  return rows.map((row) => row.map((cell) => quoteCsvCell(cell)).join(",")).join("\r\n");
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function makePdfBlob(lines: string[]) {
  const encoder = new TextEncoder();
  const contentLines = [
    "BT",
    "/F1 12 Tf",
    "50 760 Td",
    ...lines.map((line, index) => {
      const escaped = escapePdfText(line);
      const lineFragment = `(${escaped}) Tj`;
      if (index === lines.length - 1) {
        return lineFragment;
      }
      return `${lineFragment}\n0 -14 Td`;
    }),
    "ET",
  ];
  const contentStream = contentLines.join("\n");
  const streamLength = encoder.encode(contentStream).length;

  const header = "%PDF-1.3\n";
  const objects = [
    `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`,
    `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`,
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`,
    `4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`,
    `5 0 obj\n<< /Length ${streamLength} >>\nstream\n${contentStream}endstream\nendobj\n`,
  ];

  let offset = encoder.encode(header).length;
  const offsets = objects.map((obj) => {
    const current = offset;
    offset += encoder.encode(obj).length;
    return current;
  });

  const xrefStart = offset;
  const xrefLines = [
    "xref",
    "0 6",
    "0000000000 65535 f ",
    ...offsets.map((off) => `${off.toString().padStart(10, "0")} 00000 n `),
  ];
  const xref = xrefLines.join("\n") + "\n";
  offset += encoder.encode(xref).length;

  const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  const fullContent = header + objects.join("") + xref + trailer;
  return new Blob([fullContent], { type: "application/pdf" });
}

export function downloadTableExport(
  baseName: string,
  format: ExportFormat,
  rows: string[][]
) {
  const dateSuffix = new Date().toISOString().split("T")[0];
  const extension = format === "csv" ? "csv" : format === "excel" ? "xls" : "pdf";
  const fileName = `${baseName}-${dateSuffix}.${extension}`;

  let blob: Blob;
  if (format === "pdf") {
    const lines = rows.map((row) => row.join(" | "));
    blob = makePdfBlob(lines);
  } else {
    const csvText = buildCsv(rows);
    const mimeType = format === "excel" ? "application/vnd.ms-excel;charset=utf-8" : "text/csv;charset=utf-8";
    blob = new Blob([csvText], { type: mimeType });
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
