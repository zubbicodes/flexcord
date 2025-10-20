// Lightweight export helpers using CDN ESM imports to avoid bundling deps

export async function exportToXLSX(
  filename: string,
  sheets: Array<{ name: string; rows: Record<string, any>[] }>,
) {
  const XLSX = await import("https://esm.sh/xlsx@0.18.5");
  const wb = XLSX.utils.book_new();
  sheets.forEach((sheet) => {
    const ws = XLSX.utils.json_to_sheet(sheet.rows);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31));
  });
  const out = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, out);
}

export async function exportTableToPDF(
  filename: string,
  title: string,
  columns: string[],
  rows: (string | number)[][],
) {
  const jsPDF = (await import("https://esm.sh/jspdf@2.5.1")).default;
  const autoTable = (await import("https://esm.sh/jspdf-autotable@3.8.2")).default;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  doc.setFontSize(12);
  doc.text(title, 40, 40);
  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: 60,
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [33, 150, 243] },
  });
  const out = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  doc.save(out);
}


