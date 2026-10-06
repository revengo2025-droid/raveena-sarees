// =============================================================================
// Email Service Abstraction
// =============================================================================

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export interface EmailService {
  sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }>;
  sendOrderConfirmation(order: any): Promise<void>;
  sendShippingNotification(order: any): Promise<void>;
  sendPasswordReset(email: string, resetLink: string): Promise<void>;
}

class ConsoleEmailService implements EmailService {
  async sendEmail(options: SendEmailOptions) {
    console.log(`[Email Console Fallback] To: ${Array.isArray(options.to) ? options.to.join(", ") : options.to}`);
    console.log(`[Email Console Fallback] Subject: ${options.subject}`);
    return { success: true, messageId: `msg_${Date.now()}` };
  }

  async sendOrderConfirmation(order: any) {
    const html = `
      <div style="font-family: serif; padding: 20px; color: #111;">
        <h1 style="color: #991b1b;">Raveena Sarees — Order Confirmed</h1>
        <p>Dear ${order.customer_name || "Valued Customer"},</p>
        <p>Thank you for shopping with Raveena Sarees. Your royal handloom order <strong>#${order.order_number}</strong> has been received.</p>
        <p><strong>Order Total:</strong> ₹${Number(order.total_amount).toLocaleString("en-IN")}</p>
        <p><strong>Delivery Address:</strong> ${typeof order.shipping_address === "string" ? order.shipping_address : JSON.stringify(order.shipping_address)}</p>
        <p>Our master weavers are meticulously inspecting your silk sarees before secure pan-India dispatch.</p>
      </div>
    `;
    await this.sendEmail({
      to: order.customer_email,
      subject: `Order Confirmed: #${order.order_number} — Raveena Sarees`,
      html,
    });
  }

  async sendShippingNotification(order: any) {
    await this.sendEmail({
      to: order.customer_email,
      subject: `Your Raveena Sarees Order #${order.order_number} is on the way!`,
      html: `<p>Your parcel has been dispatched with ${order.courier_partner || "BlueDart Express"}. Tracking: ${order.tracking_number || "Pending"}</p>`,
    });
  }

  async sendPasswordReset(email: string, resetLink: string) {
    await this.sendEmail({
      to: email,
      subject: "Reset your Raveena Sarees Password",
      html: `<p>Click here to reset your password: <a href="${resetLink}">${resetLink}</a></p>`,
    });
  }
}

class ResendEmailService implements EmailService {
  private apiKey: string;
  private from: string;

  constructor(apiKey: string, fromEmail: string, fromName = "Raveena Sarees") {
    this.apiKey = apiKey;
    this.from = `${fromName} <${fromEmail}>`;
  }

  async sendEmail(options: SendEmailOptions) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: this.from,
          to: Array.isArray(options.to) ? options.to : [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Resend API error:", errorText);
        return { success: false, error: errorText };
      }

      const data = await res.json();
      return { success: true, messageId: data.id };
    } catch (err: any) {
      console.error("Resend send error:", err);
      return { success: false, error: err.message };
    }
  }

  async sendOrderConfirmation(order: any) {
    const html = `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <div style="text-align: center; border-bottom: 2px solid #C8A24D; padding-bottom: 16px; margin-bottom: 24px;">
          <h1 style="color: #630b1c; margin: 0; font-size: 24px; letter-spacing: 2px;">RAVEENA SAREES</h1>
          <p style="color: #6b7280; font-size: 12px; margin-top: 4px; letter-spacing: 1px; text-transform: uppercase;">Royal Handlooms of India</p>
        </div>
        <h2 style="font-size: 18px; color: #111827;">Thank you for your order, ${order.customer_name || "Esteemed Client"}!</h2>
        <p style="color: #4b5563; font-size: 14px; line-height: 1.6;">
          Your order <strong>#${order.order_number}</strong> has been successfully placed. We are preparing your authentic handloom pieces for dispatch.
        </p>
        <div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; margin: 20px 0;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #6b7280; font-size: 13px;">Total Amount:</span>
            <strong style="color: #111827; font-size: 15px;">₹${Number(order.total_amount).toLocaleString("en-IN")}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #6b7280; font-size: 13px;">Payment Status:</span>
            <span style="color: #059669; font-weight: 600; font-size: 13px; text-transform: uppercase;">${order.payment_status}</span>
          </div>
        </div>
        <p style="color: #6b7280; font-size: 12px; text-align: center; margin-top: 32px;">
          For concierge assistance, WhatsApp us at +91-7780756009 or reply to this email.
        </p>
      </div>
    `;

    await this.sendEmail({
      to: order.customer_email,
      subject: `Confirmed: Order #${order.order_number} — Raveena Sarees`,
      html,
    });
  }

  async sendShippingNotification(order: any) {
    const html = `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #630b1c;">Your Sarees Have Been Dispatched!</h2>
        <p>Dear ${order.customer_name || "Valued Client"},</p>
        <p>Your order <strong>#${order.order_number}</strong> is in transit with <strong>${order.courier_partner || "BlueDart Express"}</strong>.</p>
        ${order.tracking_number ? `<p><strong>Tracking Number:</strong> ${order.tracking_number}</p>` : ""}
        ${order.tracking_url ? `<p><a href="${order.tracking_url}" style="background-color: #C8A24D; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Track Your Package</a></p>` : ""}
      </div>
    `;

    await this.sendEmail({
      to: order.customer_email,
      subject: `Shipped: Order #${order.order_number} — Raveena Sarees`,
      html,
    });
  }

  async sendPasswordReset(email: string, resetLink: string) {
    const html = `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #630b1c;">Reset Your Password</h2>
        <p>We received a request to reset your password for your Raveena Sarees account.</p>
        <p><a href="${resetLink}" style="background-color: #630b1c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a></p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">If you didn't request this, you can safely ignore this message.</p>
      </div>
    `;

    await this.sendEmail({
      to: email,
      subject: "Reset your Raveena Sarees Password",
      html,
    });
  }
}

export function getEmailService(): EmailService {
  const apiKey = process.env.EMAIL_API_KEY;
  const fromEmail = process.env.EMAIL_FROM_ADDRESS;
  const fromName = process.env.EMAIL_FROM_NAME || "Raveena Sarees";

  if (apiKey && fromEmail && !apiKey.includes("re_xxxxxxxx")) {
    return new ResendEmailService(apiKey, fromEmail, fromName);
  }

  return new ConsoleEmailService();
}
