import { createTransport } from "nodemailer";

const transporter = createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: Number(process.env.EMAIL_SERVER_PORT),
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

const from = process.env.EMAIL_FROM ?? "noreply@example.com";
const appName = process.env.APP_NAME ?? "SaaS App";

export async function sendPaymentFailedEmail(
  to: string,
  userName: string | null
) {
  const name = userName ?? "there";
  const billingUrl = `${process.env.NEXTAUTH_URL}/dashboard/billing`;

  await transporter.sendMail({
    from,
    to,
    subject: `[${appName}] Action required: Payment failed`,
    text: [
      `Hi ${name},`,
      "",
      `We were unable to process your latest payment for ${appName}.`,
      "",
      "To avoid any interruption to your service, please update your payment method:",
      billingUrl,
      "",
      "If you believe this is an error, please contact our support team.",
      "",
      `— The ${appName} Team`,
    ].join("\n"),
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <h2>Payment failed</h2>
        <p>Hi ${name},</p>
        <p>We were unable to process your latest payment for <strong>${appName}</strong>.</p>
        <p>To avoid any interruption to your service, please update your payment method:</p>
        <p style="margin: 24px 0;">
          <a href="${billingUrl}"
             style="background: #2563eb; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">
            Update payment method
          </a>
        </p>
        <p style="color: #6b7280; font-size: 14px;">
          If you believe this is an error, please contact our support team.
        </p>
        <p style="color: #6b7280; font-size: 14px;">&mdash; The ${appName} Team</p>
      </div>
    `.trim(),
  });
}
