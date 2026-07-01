/**
 * Invoice PDF Generation
 *
 * Uses the browser's native print API (window.print) with a styled HTML
 * invoice template. No heavy dependencies (puppeteer/pdfkit) needed.
 *
 * For server-side PDF generation (e.g., for email attachments), install
 * puppeteer: npm install puppeteer
 *
 * Usage:
 *   import { generateInvoicePDF, printInvoice } from '@/lib/billing/invoice-pdf'
 *   printInvoice(invoiceData)  // opens print dialog
 */

export interface InvoiceData {
  invoiceNumber: string
  tenantName: string
  tenantCountry?: string
  plan: string
  billingCycle: string
  items: Array<{ description: string; amount: number; quantity: number; total: number }>
  subtotal: number
  tax: number
  total: number
  currency: string
  status: string
  dueDate: string
  paidAt?: string
  createdAt: string
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', UGX: 'USh', GHS: 'GH₵', KES: 'KSh',
}

function formatMoney(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] || ''
  return `${symbol} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Generate a printable HTML invoice and open the browser print dialog.
 */
export function printInvoice(invoice: InvoiceData) {
  const html = generateInvoiceHTML(invoice)
  const printWindow = window.open('', '_blank', 'width=800,height=600')
  if (!printWindow) {
    alert('Please allow pop-ups to print invoices')
    return
  }
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => {
    printWindow.print()
  }, 500)
}

/**
 * Download invoice as HTML file (can be opened in any browser and printed to PDF).
 */
export function downloadInvoiceHTML(invoice: InvoiceData) {
  const html = generateInvoiceHTML(invoice)
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `invoice-${invoice.invoiceNumber}.html`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Generate the HTML for an invoice.
 */
function generateInvoiceHTML(invoice: InvoiceData): string {
  const statusColor = invoice.status === 'PAID' ? '#059669' : invoice.status === 'OVERDUE' ? '#dc2626' : '#f59e0b'
  const date = new Date(invoice.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const dueDate = new Date(invoice.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Invoice ${invoice.invoiceNumber}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; padding: 40px; max-width: 800px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 3px solid #059669; padding-bottom: 20px; }
  .logo { font-size: 28px; font-weight: bold; color: #059669; }
  .logo-sub { font-size: 12px; color: #666; margin-top: 2px; }
  .invoice-meta { text-align: right; }
  .invoice-number { font-size: 24px; font-weight: bold; }
  .invoice-date { font-size: 13px; color: #666; margin-top: 4px; }
  .status-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; color: white; background: ${statusColor}; margin-top: 8px; }
  .bill-to { margin-bottom: 30px; }
  .bill-to-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 4px; }
  .bill-to-name { font-size: 18px; font-weight: 600; }
  .bill-to-country { font-size: 13px; color: #666; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
  th { text-align: left; padding: 12px; background: #f8f9fa; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; border-bottom: 2px solid #e5e7eb; }
  td { padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
  .text-right { text-align: right; }
  .totals { margin-left: auto; width: 300px; }
  .totals-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
  .totals-total { border-top: 2px solid #1a1a1a; margin-top: 8px; padding-top: 12px; font-size: 18px; font-weight: bold; }
  .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #999; }
  .footer a { color: #059669; text-decoration: none; }
  @media print { body { padding: 20px; } .no-print { display: none; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">🌱 Agrobase V3</div>
      <div class="logo-sub">MobiPay AgroSys Limited</div>
    </div>
    <div class="invoice-meta">
      <div class="invoice-number">INVOICE</div>
      <div class="invoice-date">#${invoice.invoiceNumber}</div>
      <div class="invoice-date">Issued: ${date}</div>
      <div class="invoice-date">Due: ${dueDate}</div>
      <div class="status-badge">${invoice.status}</div>
    </div>
  </div>

  <div class="bill-to">
    <div class="bill-to-label">Billed To</div>
    <div class="bill-to-name">${invoice.tenantName}</div>
    ${invoice.tenantCountry ? `<div class="bill-to-country">${invoice.tenantCountry}</div>` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th class="text-right">Qty</th>
        <th class="text-right">Amount</th>
        <th class="text-right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.items.map(item => `
        <tr>
          <td>${item.description}</td>
          <td class="text-right">${item.quantity}</td>
          <td class="text-right">${formatMoney(item.amount, invoice.currency)}</td>
          <td class="text-right">${formatMoney(item.total, invoice.currency)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row">
      <span>Subtotal</span>
      <span>${formatMoney(invoice.subtotal, invoice.currency)}</span>
    </div>
    ${invoice.tax > 0 ? `
    <div class="totals-row">
      <span>Tax</span>
      <span>${formatMoney(invoice.tax, invoice.currency)}</span>
    </div>
    ` : ''}
    <div class="totals-row totals-total">
      <span>Total</span>
      <span>${formatMoney(invoice.total, invoice.currency)}</span>
    </div>
    ${invoice.status === 'PAID' && invoice.paidAt ? `
    <div class="totals-row" style="color: #059669; font-weight: 600;">
      <span>Paid on ${new Date(invoice.paidAt).toLocaleDateString('en-GB')}</span>
      <span>✓</span>
    </div>
    ` : ''}
  </div>

  <div class="footer">
    <p>Thank you for your business!</p>
    <p style="margin-top: 8px;">Agrobase V3 by MobiPay AgroSys Limited · <a href="https://mobipay-agrobase.vercel.app">mobipay-agrobase.vercel.app</a></p>
    <p style="margin-top: 4px;">Questions? Email support@agrobase.co</p>
  </div>

  <div class="no-print" style="text-align: center; margin-top: 30px;">
    <button onclick="window.print()" style="padding: 10px 24px; background: #059669; color: white; border: none; border-radius: 6px; font-size: 14px; cursor: pointer;">Print / Save as PDF</button>
  </div>
</body>
</html>`
}
