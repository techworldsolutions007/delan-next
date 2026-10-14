// index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Resend } = require("resend");
const { handleGoogleShoppingFeed } = require("./googleShoppingFeed");

const app = express();
const resend = new Resend(process.env.RESEND_API_KEY);

app.use(express.json({ limit: "32kb" }));

/* =========================
   CORS (dev + prod)
========================= */
const DEFAULT_ALLOWED = [
  "http://localhost:5173",
  "https://delan.in",
  "https://www.delan.in",
];

// Optional .env override: CORS_ORIGINS="https://delan.in,https://www.delan.in,https://delan-one.vercel.app"
const fromEnv = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

const ALLOWED_ORIGINS = (fromEnv.length ? fromEnv : DEFAULT_ALLOWED).map(o =>
  o.replace(/\/$/, "")
);

const corsOptionsDelegate = (req, cb) => {
  const originHeader = req.header("Origin") || "";
  const origin = originHeader.replace(/\/$/, "");

  if (!origin) {
    return cb(null, {
      origin: false,
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type"],
      optionsSuccessStatus: 204,
      maxAge: 86400
    });
  }

  const isAllowed = ALLOWED_ORIGINS.includes(origin);
  cb(null, {
    origin: isAllowed,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
    credentials: false,
    optionsSuccessStatus: 204,
    maxAge: 86400
  });
};

const corsMiddleware = cors(corsOptionsDelegate);
app.use(corsMiddleware);
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    return corsMiddleware(req, res, () => res.sendStatus(204));
  }
  next();
});

/* =========================
   Health
========================= */
app.get("/healthz", (_req, res) => res.send("ok"));

/* =========================
   Utils
========================= */
const esc = (s = "") =>
  String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FROM_FORMAT_RE = /^\s*(?:[^<]*<[^>]+>|[^<>\s]+@[^<>\s]+)\s*$/;

function normalizeFrom(rawFrom, displayName) {
  if (!rawFrom) return null;
  const val = rawFrom.trim();

  const angleOnly = /^<([^>]+)>$/.exec(val);
  if (angleOnly) return `"${displayName}" <${angleOnly[1]}>`;

  if (val.includes("<") && val.includes(">")) return val;

  if (EMAIL_RE.test(val)) return `"${displayName}" <${val}>`;

  return null;
}

// Branded, mobile-friendly HTML email (no "Submitted from")
function buildHtmlEmail({
  brand,
  name,
  email,
  phone,
  message,
  sentAt,
  logoUrl,
  accent = "#5a1f36"
}) {
  const replyHref = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(`Re: ${brand}`)}`;

  return `
  <div style="background:#f5f6f8;margin:0;padding:24px 0;">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e9ebee;border-radius:12px;overflow:hidden;">
      <!-- Header -->
      <div style="background:${accent};padding:18px 20px;display:flex;align-items:center;gap:12px;">
        ${
          logoUrl
            ? `<img src="${esc(logoUrl)}" alt="${esc(brand)}" width="28" height="28" style="display:block;border-radius:6px;object-fit:cover;" />`
            : ""
        }
        <div style="color:#fff;font-weight:700;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:18px;letter-spacing:.2px;">
          ${esc(brand)}
        </div>
      </div>

      <!-- Body -->
      <div style="padding:20px 22px 6px;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111;line-height:1.55;">
        <p style="margin:0 0 12px 0;font-size:15px;color:#222;">
          You received a new message from your website.
        </p>

        <!-- Info table -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr>
            <td style="padding:8px 0;color:#6b7280;width:140px;">Name</td>
            <td style="padding:8px 0;color:#111;">${esc(name)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6b7280;">Email</td>
            <td style="padding:8px 0;">
              <a href="mailto:${esc(email)}" style="color:${accent};text-decoration:none;">${esc(email)}</a>
            </td>
          </tr>
          ${
            phone
              ? `<tr>
                  <td style="padding:8px 0;color:#6b7280;">Phone</td>
                  <td style="padding:8px 0;color:#111;">${esc(phone)}</td>
                 </tr>`
              : ""
          }
          <tr>
            <td style="padding:8px 0;color:#6b7280;vertical-align:top;">Message</td>
            <td style="padding:8px 0;">
              <div style="white-space:pre-wrap;background:#fafafa;border:1px solid #eef0f3;padding:14px;border-radius:10px;color:#111;">
                ${esc(message)}
              </div>
            </td>
          </tr>
        </table>

        <!-- CTA -->
        <div style="margin:18px 0 8px;">
          <a href="${replyHref}" style="display:inline-block;background:${accent};color:#fff;padding:10px 14px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;">
            Reply to ${esc(name)}
          </a>
        </div>
      </div>

      <!-- Divider -->
      <div style="height:1px;background:#eef0f3;margin:0 22px;"></div>

      <!-- Footer meta -->
      <div style="padding:10px 22px 16px;color:#6b7280;font-size:12px;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        Submitted: ${esc(sentAt)}
      </div>
    </div>

    <div style="text-align:center;color:#9ca3af;font-size:12px;margin-top:12px;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      Powered by Resend • ${esc(brand)}
    </div>
  </div>
  `;
}

/* =========================
   Route
========================= */
app.post("/api/resend-contact", async (req, res) => {
  try {
    const {
      name = "",
      email = "",
      phone = "",
      message = "",
      trap = ""
      // pageURL removed
    } = req.body || {};

    // Honeypot: pretend success (don't send)
    if (trap) return res.json({ ok: true, id: "honeypot" });

    // Basic validation
    if (!name.trim() || !email.trim() || !message.trim()) {
      return res.status(400).json({ error: "Please fill in your name, email, and message." });
    }
    if (!EMAIL_RE.test(email.trim())) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }

    // Branding
    const DISPLAY_NAME = "Delan Contact Form";
    const SUBJECT_PREFIX = process.env.SUBJECT_PREFIX || DISPLAY_NAME;

    // From/To
    const from = normalizeFrom(process.env.RESEND_FROM, DISPLAY_NAME);
    const to = process.env.RESEND_TO;

    if (!from || !FROM_FORMAT_RE.test(from)) {
      return res.status(500).json({
        error:
          'RESEND_FROM is invalid. Use email@example.com, "<email@example.com>", or "Name <email@example.com>". ' +
          'Example: RESEND_FROM="Delan Contact Form <onboarding@resend.dev>"'
      });
    }
    if (!to) {
      return res.status(500).json({ error: "Server email configuration is incomplete (missing RESEND_TO)." });
    }

    const subject = `${SUBJECT_PREFIX}: Message from ${name.trim()}`;
    const sentAt = new Date().toLocaleString();

    // Build email (no "submitted from")
    const html = buildHtmlEmail({
      brand: DISPLAY_NAME,
      name,
      email,
      phone,
      message,
      sentAt,
      logoUrl: process.env.LOGO_URL || "",
      accent: "#5a1f36"
    });

    const text = [
      `${DISPLAY_NAME} — New website message`,
      `Name: ${name}`,
      `Email: ${email}`,
      phone ? `Phone: ${phone}` : null,
      "",
      "Message:",
      message,
      "",
      `Submitted: ${sentAt}`
    ]
      .filter(Boolean)
      .join("\n");

    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
      text,
      reply_to: email
    });

    if (error) return res.status(502).json({ error: error.message || "Failed to send message." });

    res.json({ ok: true, id: data?.id || null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Something went wrong while sending." });
  }
});

/* =========================
   Google Shopping Feed
========================= */
app.get("/google-shopping-feed.xml", handleGoogleShoppingFeed);

/* =========================
   Server
========================= */
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  const DISPLAY_NAME = "Delan Contact Form";
  const normalized =
    (process.env.RESEND_FROM && normalizeFrom(process.env.RESEND_FROM, DISPLAY_NAME)) || "(missing)";
  console.log("Using FROM:", normalized);
  console.log("CORS allowlist:", ALLOWED_ORIGINS);
});
