'use client';
// src/Contact.jsx
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function Contact() {
  const [status, setStatus] = useState("idle"); // idle | sending | ok | error
  const [error, setError] = useState("");
  const [messageValue, setMessageValue] = useState("");
  const maxChars = 1000;

  // How long the success message stays visible before resetting UI
  const SUCCESS_VISIBLE_MS = 4000;

  // Auto-reset UI to default after showing success
  useEffect(() => {
    if (status !== "ok") return;
    const t = setTimeout(() => {
      setStatus("idle");
      setError("");
    }, SUCCESS_VISIBLE_MS);
    return () => clearTimeout(t);
  }, [status]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (status === "sending") return;

    setStatus("sending");

    // capture the form element BEFORE any await
    const formEl = e.currentTarget;
    const form = new FormData(formEl);

    const payload = {
      name: (form.get("contact[name]") || "").trim(),
      email: (form.get("contact[email]") || "").trim(),
      phone: (form.get("contact[phone]") || "").trim(),
      message: (form.get("contact[body]") || "").trim(),
      trap: (form.get("contact[website]") || "").trim(), // Honeypot
      pageURL: window.location.href,
    };

    // Honeypot: pretend success (then auto-reset via useEffect)
    if (payload.trap) {
      setStatus("ok");
      formEl.reset();
      setMessageValue("");
      return;
    }

    // Basic validation
    if (!payload.name || !payload.email || !payload.message) {
      setStatus("error");
      setError("Please fill in your name, email, and message.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      setStatus("error");
      setError("Please enter a valid email address.");
      return;
    }

    // In production (Vercel) the rewrite routes /api/resend-contact to delan-server.
    // For local dev without `vercel dev`, set NEXT_PUBLIC_API_BASE_URL=http://localhost:3001.
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

    try {
      const resp = await fetch(`${API_BASE}/api/resend-contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || "Failed to send message.");

      // Success: show message, clear fields, then auto-reset to default (handled by useEffect)
      setStatus("ok");
      formEl.reset();
      setMessageValue("");
    } catch (err) {
      setStatus("error");
      setError(err?.message || "Something went wrong while sending.");
    }
  }

  const isSending = status === "sending";

  return (
    <div className="min-h-screen flex flex-col items-center bg-white px-4 pt-16 md:pt-24">
      <h1 className="cormorant-garamond-700 text-primary text-3xl md:text-4xl lg:text-5xl uppercase mb-2 text-center">
        Contact Delan — We&apos;re Here to Help
      </h1>
      <p className="text-sm text-gray-500 mb-8 text-center">We usually respond within 1–2 business days.</p>

      <div className="w-full max-w-4xl montserrat-500">
        <form
          onSubmit={handleSubmit}
          className="rounded-xl bg-gray-50 border border-gray-100 p-8 shadow-sm montserrat-500"
          noValidate
        >
          {/* Honeypot field */}
          <input
            type="text"
            name="contact[website]"
            tabIndex="-1"
            autoComplete="off"
            aria-hidden="true"
            className="absolute left-[-9999px] h-0 w-0 opacity-0"
          />

          <p className="mb-6 text-center text-gray-600">Fill out the form and our team will get back to you.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-1.5">
              <Label htmlFor="name">
                Name <span className="text-pink-600">*</span>
              </Label>
              <Input
                id="name"
                name="contact[name]"
                required
                placeholder="Enter your name"
                className="bg-white focus-visible:ring-2 focus-visible:ring-[#5a1f36]"
                autoComplete="name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">
                Email <span className="text-pink-600">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                name="contact[email]"
                required
                placeholder="Enter your email"
                className="bg-white focus-visible:ring-2 focus-visible:ring-[#5a1f36]"
                autoComplete="email"
                aria-describedby={status === "error" ? "email-help" : undefined}
                aria-invalid={status === "error" && error.toLowerCase().includes("email") ? "true" : "false"}
              />
              <p id="email-help" className="text-xs text-gray-500">
                We’ll only use this to contact you about your inquiry.
              </p>
            </div>
          </div>

          <div className="space-y-1.5 mb-6">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input
              id="phone"
              name="contact[phone]"
              type="tel"
              placeholder="Enter your phone number"
              className="bg-white focus-visible:ring-2 focus-visible:ring-[#5a1f36]"
              autoComplete="tel"
            />
          </div>

          <div className="space-y-1.5 mb-2">
            <Label htmlFor="message">
              Message <span className="text-pink-600">*</span>
            </Label>
            <Textarea
              id="message"
              name="contact[body]"
              rows={5}
              required
              placeholder="Type your message here."
              className="bg-white focus-visible:ring-2 focus-visible:ring-[#5a1f36]"
              maxLength={maxChars}
              value={messageValue}
              onChange={(e) => setMessageValue(e.target.value)}
            />
            <div className="text-xs text-gray-500 text-right">{messageValue.length}/{maxChars}</div>
          </div>

          <Button
            type="submit"
            disabled={isSending}
            aria-disabled={isSending}
            className="w-full h-12 bg-[#5a1f36] hover:bg-[#7a274b] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <span className="inline-flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
                  <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" />
                </svg>
                Sending…
              </span>
            ) : "Send Message"}
          </Button>

          {/* Live region for status messages */}
          <div className="min-h-6" aria-live="polite" aria-atomic="true">
            {status === "ok" && (
              <p className="mt-4 text-center text-sm font-medium text-green-700">
                Thanks! We’ll get back to you shortly.
              </p>
            )}
            {status === "error" && (
              <p className="mt-4 text-center text-sm font-medium text-red-700">{error}</p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
