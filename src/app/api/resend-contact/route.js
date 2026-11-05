import { Resend } from "resend";
import { NextResponse } from "next/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const esc = (s = "") =>
  String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

function buildHtmlEmail({ name, email, phone, message, sentAt, accent = "#5a1f36" }) {
  const brand = "Delan Contact Form";
  const replyHref = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(`Re: ${brand}`)}`;
  return `
  <div style="background:#f5f6f8;margin:0;padding:24px 0;">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e9ebee;border-radius:12px;overflow:hidden;">
      <div style="background:${accent};padding:18px 20px;">
        <div style="color:#fff;font-weight:700;font-family:ui-sans-serif,system-ui,sans-serif;font-size:18px;">
          ${esc(brand)}
        </div>
      </div>
      <div style="padding:20px 22px 6px;font-family:ui-sans-serif,system-ui,sans-serif;color:#111;line-height:1.55;">
        <p style="margin:0 0 12px 0;font-size:15px;color:#222;">You received a new message from your website.</p>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:8px 0;color:#6b7280;width:140px;">Name</td><td style="padding:8px 0;color:#111;">${esc(name)}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;">Email</td><td style="padding:8px 0;"><a href="mailto:${esc(email)}" style="color:${accent};text-decoration:none;">${esc(email)}</a></td></tr>
          ${phone ? `<tr><td style="padding:8px 0;color:#6b7280;">Phone</td><td style="padding:8px 0;color:#111;">${esc(phone)}</td></tr>` : ""}
          <tr>
            <td style="padding:8px 0;color:#6b7280;vertical-align:top;">Message</td>
            <td style="padding:8px 0;"><div style="white-space:pre-wrap;background:#fafafa;border:1px solid #eef0f3;padding:14px;border-radius:10px;color:#111;">${esc(message)}</div></td>
          </tr>
        </table>
        <div style="margin:18px 0 8px;">
          <a href="${replyHref}" style="display:inline-block;background:${accent};color:#fff;padding:10px 14px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;">Reply to ${esc(name)}</a>
        </div>
      </div>
      <div style="height:1px;background:#eef0f3;margin:0 22px;"></div>
      <div style="padding:10px 22px 16px;color:#6b7280;font-size:12px;font-family:ui-sans-serif,system-ui,sans-serif;">Submitted: ${esc(sentAt)}</div>
    </div>
  </div>`;
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      name = "",
      email = "",
      phone = "",
      message = "",
      trap = "",
    } = body;

    if (trap) return NextResponse.json({ ok: true, id: "honeypot" });

    if (!name.trim() || !email.trim() || !message.trim()) {
      return NextResponse.json(
        { error: "Please fill in your name, email, and message." },
        { status: 400 }
      );
    }
    if (!EMAIL_RE.test(email.trim())) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM;
    const to = process.env.RESEND_TO;

    if (!apiKey || !from || !to) {
      console.error("Missing RESEND_API_KEY, RESEND_FROM, or RESEND_TO env vars");
      return NextResponse.json(
        { error: "Server email configuration is incomplete." },
        { status: 500 }
      );
    }

    const resend = new Resend(apiKey);
    const SUBJECT_PREFIX = process.env.SUBJECT_PREFIX || "Delan Contact Form";
    const subject = `${SUBJECT_PREFIX}: Message from ${name.trim()}`;
    const sentAt = new Date().toLocaleString();

    const html = buildHtmlEmail({ name, email, phone, message, sentAt });
    const text = [
      "Delan Contact Form — New website message",
      `Name: ${name}`,
      `Email: ${email}`,
      phone ? `Phone: ${phone}` : null,
      "",
      "Message:",
      message,
      "",
      `Submitted: ${sentAt}`,
    ]
      .filter(Boolean)
      .join("\n");

    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
      text,
      reply_to: email,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to send message." },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, id: data?.id ?? null });
  } catch (e) {
    console.error("resend-contact error:", e);
    return NextResponse.json(
      { error: "Something went wrong while sending." },
      { status: 500 }
    );
  }
}
