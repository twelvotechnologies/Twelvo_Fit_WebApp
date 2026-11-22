/**
 * WhatsApp Integration Utilities
 * GymERP - Automatic Invoice & Receipt Sharing via WhatsApp Web
 */

export interface ReceiptShareData {
  receiptNo: string;
  memberName: string;
  memberPhone?: string;
  plan: string;
  planCategory?: string;
  amount: number;
  tax?: number;
  total: number;
  paymentDate: string;
  paymentMode: string;
  referenceNo?: string;
}

/**
 * Format currency in Indian Rupees format (e.g. ₹2,500)
 */
function formatRupees(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Generate a beautifully structured WhatsApp receipt invoice message with markdown bolding
 */
export function generateReceiptInvoiceWhatsAppText(
  receipt: ReceiptShareData,
  gymName = 'Twelvo Gym & Fitness'
): string {
  const lines: string[] = [
    `🏋️ *${gymName.toUpperCase()}*`,
    `📄 *OFFICIAL PAYMENT RECEIPT / INVOICE*`,
    `══════════════════════════`,
    `🧾 *Receipt No:* ${receipt.receiptNo}`,
    `📅 *Payment Date:* ${receipt.paymentDate}`,
    `✅ *Status:* PAID & VERIFIED`,
    ``,
    `👤 *MEMBER DETAILS*`,
    `• *Name:* ${receipt.memberName}`,
    receipt.memberPhone ? `• *Phone:* ${receipt.memberPhone}` : '',
    ``,
    `📋 *PLAN & SUBSCRIPTION*`,
    `• *Plan:* ${receipt.plan}`,
    receipt.planCategory ? `• *Category:* ${receipt.planCategory}` : '',
    ``,
    `💰 *PAYMENT BREAKDOWN*`,
    `• *Base Amount:* ${formatRupees(receipt.amount)}`,
    receipt.tax && receipt.tax > 0
      ? `• *GST:* ${formatRupees(receipt.tax)}`
      : `• *GST:* ₹0 (Exempt / No GST)`,
    `• *NET TOTAL PAID:* ${formatRupees(receipt.total)}`,
    `• *Payment Mode:* ${receipt.paymentMode}`,
    receipt.referenceNo ? `• *Transaction Ref:* ${receipt.referenceNo}` : '',
    `══════════════════════════`,
    `Thank you for your payment! Keep pushing your fitness goals. 💪🔥`,
    `For any billing queries or support, please contact the front desk.`,
  ];

  return lines.filter((l) => l !== '').join('\n');
}

/**
 * Clean phone number and ensure country code format
 */
export function cleanPhoneNumber(phone?: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9]/g, '');
  // If standard 10-digit Indian mobile number without country code
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  return cleaned;
}

/**
 * Opens WhatsApp Web directly in a new browser tab with pre-filled recipient and message
 */
export function openWhatsAppWeb(phone: string | undefined, message: string): void {
  const cleaned = cleanPhoneNumber(phone);
  const encodedText = encodeURIComponent(message);
  
  // Directly targeting web.whatsapp.com as requested by user
  const url = cleaned
    ? `https://web.whatsapp.com/send?phone=${cleaned}&text=${encodedText}`
    : `https://web.whatsapp.com/send?text=${encodedText}`;

  window.open(url, '_blank', 'noopener,noreferrer');
}
