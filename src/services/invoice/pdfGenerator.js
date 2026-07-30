import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { computeLines, splitTax } from '../../business/invoice/calculations.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
}

function fmt(n) {
  if (n === undefined || n === null) return '0.00';
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function addCompanyHeader(doc, company, invoice) {
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  if (company?.logo) {
    try {
      doc.addImage(company.logo, 'JPEG', margin, y, 50, 20);
    } catch {
      try { doc.addImage(company.logo, 'PNG', margin, y, 50, 20); } catch {}
    }
    y += 24;
  }

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(company?.name || '', margin, y);

  y += 7;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  if (company?.address) { doc.text(company.address, margin, y); y += 5; }
  if (company?.gstin) { doc.text(`GSTIN: ${company.gstin}`, margin, y); y += 12; }
  doc.setTextColor(0);

  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', pageW - margin, margin + 10, { align: 'right' });

  const invX = pageW - margin - 70;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  let iy = margin + 16;
  const rows = [
    ['Invoice No:', invoice.invoice_number || ''],
    ['Date:', fmtDate(invoice.invoice_date)],
    ['Due Date:', fmtDate(invoice.due_date)],
  ];
  for (const [l, v] of rows) {
    doc.setFont('helvetica', 'bold');
    doc.text(l, invX, iy);
    doc.setFont('helvetica', 'normal');
    doc.text(v, invX + 60, iy, { align: 'right' });
    iy += 6;
  }

  return Math.max(iy + 5, y + 5);
}

function addCustomerSection(doc, invoice, y) {
  const margin = 15;
  doc.setDrawColor(200);
  doc.setFillColor(245, 245, 250);
  doc.roundedRect(margin, y, 180, 38, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To', margin + 5, y + 7);
  doc.setFont('helvetica', 'normal');
  const c = invoice.customer || {};
  let cy = y + 14;
  const lines = [c.name || c.company || '', c.address || '', `GSTIN: ${c.gstin || ''}`, `${c.state || ''} ${c.city || ''}`].filter(Boolean);
  for (const l of lines) {
    doc.text(l, margin + 5, cy);
    cy += 5;
  }
  return y + 42;
}

function addItemsTable(doc, invoice, y) {
  const margin = 15;
  const { rows } = computeLines(invoice);
  const pageW = doc.internal.pageSize.getWidth();

  const body = rows.map((r, i) => [
    i + 1,
    r.name || '',
    Number(r.quantity) || 0,
    fmt(r.unitPrice),
    r.discountValue ? `${r.discountValue}${r.discountType === 'percent' ? '%' : ''}` : '-',
    `${r.taxRate || 0}%`,
    fmt(r.lineTotal),
  ]);

  doc.autoTable({
    startY: y + 3,
    margin: { left: margin, right: margin },
    tableWidth: pageW - margin * 2,
    head: [['#', 'Description', 'Qty', 'Rate', 'Disc', 'Tax', 'Amount']],
    body,
    theme: 'grid',
    headStyles: { fillColor: [80, 60, 210], fontSize: 9, fontStyle: 'bold', halign: 'center' },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 24, halign: 'right' },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 18, halign: 'center' },
      6: { cellWidth: 28, halign: 'right' },
    },
    didDrawPage: (data) => { y = data.cursor.y; },
  });

  return y + 5;
}

function addTotals(doc, invoice, y) {
  const margin = 15;
  const pageW = doc.internal.pageSize.getWidth();
  const x = pageW - margin - 80;
  const { subtotal, lineDiscountTotal, taxableAmount } = computeLines(invoice);
  const discountTotal = lineDiscountTotal + (Number(invoice.discount_total) || 0);

  doc.setFontSize(9);
  let ty = y;

  const items = [
    ['Subtotal', fmt(subtotal)],
  ];
  if (discountTotal > 0) items.push(['Discount', `-${fmt(discountTotal)}`]);
  items.push(['Taxable Amount', fmt(taxableAmount)]);
  if (invoice.cgst_total > 0) items.push(['CGST', fmt(invoice.cgst_total)]);
  if (invoice.sgst_total > 0) items.push(['SGST', fmt(invoice.sgst_total)]);
  if (invoice.igst_total > 0) items.push(['IGST', fmt(invoice.igst_total)]);
  const chargesTotal = Number(invoice.additional_charges_total) || 0;
  if (chargesTotal > 0) items.push(['Other Charges', fmt(chargesTotal)]);

  for (const [l, v] of items) {
    doc.text(l, x, ty);
    doc.text(v, pageW - margin, ty, { align: 'right' });
    ty += 6;
  }

  doc.setDrawColor(80, 60, 210);
  doc.setLineWidth(0.8);
  doc.line(x, ty, pageW - margin, ty);
  ty += 6;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Total Amount:', x, ty);
  doc.text(`₹ ${fmt(invoice.grand_total)}`, pageW - margin, ty, { align: 'right' });
  ty += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  if (Number(invoice.amount_paid) > 0) {
    doc.setTextColor(200, 50, 50);
    doc.text('Amount Paid:', x, ty);
    doc.text(`₹ ${fmt(invoice.amount_paid)}`, pageW - margin, ty, { align: 'right' });
    ty += 6;
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text('Balance Due:', x, ty);
    doc.text(`₹ ${fmt(invoice.balance_due)}`, pageW - margin, ty, { align: 'right' });
    ty += 8;
    doc.setFont('helvetica', 'normal');
  }

  return ty + 5;
}

function addNotesTerms(doc, invoice, y) {
  const margin = 15;
  const pageH = doc.internal.pageSize.getHeight();

  if (y > pageH - 60) { doc.addPage(); y = margin; }

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');

  const notes = invoice.notes || [];
  const terms = invoice.terms || [];

  if (notes.length) {
    doc.text('Notes:', margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80);
    for (const n of notes) {
      const text = n.content || n.text || '';
      const lines = doc.splitTextToSize(text, 170);
      for (const l of lines) { doc.text(l, margin, y); y += 4; }
    }
    y += 4;
  }

  if (terms.length) {
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text('Terms & Conditions:', margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80);
    for (const t of terms) {
      const text = t.content || t.text || '';
      const lines = doc.splitTextToSize(text, 170);
      for (const l of lines) { doc.text(l, margin, y); y += 4; }
    }
    y += 4;
  }

  doc.setTextColor(0);
  return y;
}

function addBankSignature(doc, invoice, y) {
  const margin = 15;
  const pageH = doc.internal.pageSize.getHeight();

  if (y > pageH - 50) { doc.addPage(); y = margin; }

  const bank = invoice.selectedBank || invoice.bank || {};
  if (bank.bank_name) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Bank Details:', margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80);
    const bLines = [
      bank.bank_name,
      bank.account_number ? `A/C: ${bank.account_number}` : '',
      bank.ifsc ? `IFSC: ${bank.ifsc}` : '',
      bank.branch ? `Branch: ${bank.branch}` : '',
      bank.upi_id ? `UPI: ${bank.upi_id}` : '',
    ].filter(Boolean);
    for (const l of bLines) { doc.text(l, margin, y); y += 5; }
    doc.setTextColor(0);
  }

  const sig = invoice.selectedSignature || invoice.signature || {};
  if (sig.name) {
    const sigX = 120;
    doc.setFont('helvetica', 'bold');
    doc.text('Authorised Signatory:', sigX, y - 25);
    if (sig.image_url) {
      try {
        doc.addImage(sig.image_url, 'JPEG', sigX, y - 22, 30, 15);
      } catch {
        try { doc.addImage(sig.image_url, 'PNG', sigX, y - 22, 30, 15); } catch {}
      }
    }
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80);
    doc.text(sig.name, sigX, y - 5);
    doc.setTextColor(0);
  }

  return y + 10;
}

function addFooter(doc, invoice) {
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(invoice.company?.name || '', margin, pageH - 15);
  doc.text(`© ${new Date().getFullYear()}. All rights reserved.`, pageW - margin, pageH - 15, { align: 'right' });
  doc.setTextColor(0);
}

export function generateInvoicePdf(invoice) {
  const doc = new jsPDF('p', 'mm', 'a4');
  let y = addCompanyHeader(doc, invoice.company, invoice);
  y = addCustomerSection(doc, invoice, y);
  y = addItemsTable(doc, invoice, y);
  y = addTotals(doc, invoice, y);
  y = addNotesTerms(doc, invoice, y);
  addBankSignature(doc, invoice, y);
  addFooter(doc, invoice);
  return doc;
}

export async function downloadInvoicePdf(invoice) {
  const doc = generateInvoicePdf(invoice);
  doc.save(`Invoice_${invoice.invoice_number || invoice.id || 'download'}.pdf`);
}

export async function downloadInvoicePdfBlob(invoice) {
  const doc = generateInvoicePdf(invoice);
  return doc.output('blob');
}

export function generateSimpleDocPdf(title, label, invoice) {
  const doc = new jsPDF('p', 'mm', 'a4');
  let y = addCompanyHeader(doc, invoice.company, invoice);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 15, y);
  y += 10;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Reference: ${invoice.invoice_number || ''}`, 15, y);
  y += 6;
  doc.text(`Date: ${fmtDate(invoice.invoice_date)}`, 15, y);
  y += 6;
  doc.text(`Customer: ${invoice.customer?.name || invoice.customer?.company || ''}`, 15, y);
  y += 10;

  const { rows } = computeLines(invoice);
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;

  const body = rows.map((r, i) => [
    i + 1,
    r.name || '',
    Number(r.quantity) || 0,
    r.unit || '',
  ]);

  doc.autoTable({
    startY: y,
    margin: { left: margin, right: margin },
    tableWidth: pageW - margin * 2,
    head: [['#', 'Description', 'Qty', 'Unit']],
    body,
    theme: 'grid',
    headStyles: { fillColor: [80, 60, 210], fontSize: 9, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 20, halign: 'center' },
    },
  });

  addFooter(doc, invoice);
  return doc;
}
