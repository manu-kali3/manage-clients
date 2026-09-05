import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM = process.env.EMAIL_FROM ?? "Brevan Events <onboarding@resend.dev>";
export const CONTACT_EMAIL = "brevansoftwares@gmail.com";

export interface EmailInput {
  type: string;
  to: string;
  subject: string;
  text: string;
}

/** Sends via Resend when configured. Never throws. */
export async function sendEmail(input: EmailInput): Promise<boolean> {
  if (!resend) {
    console.error("admin email: RESEND_API_KEY is not configured");
    return false;
  }
  const { error } = await resend.emails.send({
    from: FROM,
    to: [input.to],
    subject: input.subject,
    text: input.text,
  });
  if (error) {
    console.error("admin email: Resend error:", error);
    return false;
  }
  return true;
}

export function ticketConfirmation(input: {
  to: string;
  name: string;
  eventTitle: string;
  eventDate: string;
  quantity: number;
  amount: number;
  status: string;
  streamUrl?: string;
  ticketCode?: string;
  receiptUrl?: string;
}): EmailInput {
  const lines = [
    `Hi ${input.name || "there"},`,
    "",
    `Your ticket for "${input.eventTitle}" is confirmed.`,
    "",
    `Date: ${input.eventDate}`,
    `Tickets: ${input.quantity}`,
    `Amount: ${input.amount > 0 ? `KES ${input.amount}` : "Free"}`,
    `Status: ${input.status === "paid" ? "Paid" : input.status === "free" ? "Free booking" : "Pending payment"}`,
  ];
  if (input.ticketCode) {
    lines.push("", `Ticket code: ${input.ticketCode}`);
  }
  if (input.receiptUrl) {
    lines.push("", `View your ticket & barcode receipt: ${input.receiptUrl}`);
  }
  if (input.streamUrl) {
    lines.push("", `Online event link: ${input.streamUrl}`);
  }
  lines.push("", "Need help? Email brevansoftwares@gmail.com.", "The Brevan Events Team");

  return {
    type: "ticket-confirmation",
    to: input.to,
    subject: `Your ticket: ${input.eventTitle}`,
    text: lines.join("\n"),
  };
}

export function ownerPaymentNotice(input: {
  method: string;
  eventTitle: string;
  customer: string;
  email: string;
  phone: string;
  amount: number;
  status: string;
}): EmailInput {
  return {
    type: "payment-notice",
    to: CONTACT_EMAIL,
    subject: `Payment ${input.status}: ${input.eventTitle}`,
    text: [
      `A payment was ${input.status} on Brevan Events.`,
      "",
      `Event: ${input.eventTitle}`,
      `Method: ${input.method}`,
      `Amount: KES ${input.amount}`,
      `Customer: ${input.customer}`,
      `Email: ${input.email}`,
      `Phone: ${input.phone}`,
    ].join("\n"),
  };
}
