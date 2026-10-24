"use client";

import React, { useState, useEffect } from "react";
import { MapPin, Phone, Clock, Mail, MessageSquare, Navigation, ExternalLink, Send } from "lucide-react";
import { siteSettings as defaultSettings } from "@/lib/data";
import { SiteSettings } from "@/lib/types";
import { getSiteSettings } from "@/lib/firestore-client";

export default function ContactClient({ initialSettings }: { initialSettings?: SiteSettings }) {
  const [settings, setSettings] = useState<SiteSettings>(initialSettings || defaultSettings);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    contact: "",
    message: "",
  });
  const [sentSuccess, setSentSuccess] = useState(false);

  useEffect(() => {
    if (!initialSettings) {
      getSiteSettings().then((data) => {
        if (data) {
          setSettings((prev) => ({
            ...prev,
            ...data,
            business_hours: {
              ...prev.business_hours,
              ...(data.business_hours || {}),
            },
          }));
        }
      }).catch(() => {});
    }
  }, [initialSettings]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contact.trim() || !formData.message.trim()) return;
    
    // Auto redirect to WhatsApp with pre-filled message
    const msg = `Hello ${settings.store_name || "1place.lk"},\n\n*Name:* ${formData.firstName} ${formData.lastName}\n*Contact:* ${formData.contact}\n*Message:* ${formData.message}`;
    const waUrl = `https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, "_blank");
    setSentSuccess(true);
    setTimeout(() => setSentSuccess(false), 5000);
  };

  return (
    <div className="bg-background min-h-screen font-outfit">
      {/* Header Banner */}
      <div className="border-b border-border bg-card/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-14 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-foreground/5 border border-foreground/10 text-xs font-bold uppercase tracking-wider mb-3">
            <span>Official Store Helpline &amp; Location</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
            Contact {settings.store_name}
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            {settings.tagline || "Experience genuine devices, official warranties, and express nationwide delivery."}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-12">
        <div className="grid lg:grid-cols-12 gap-10">
          
          {/* Contact Details (5 Cols) */}
          <div className="lg:col-span-5 space-y-8">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-foreground">Get in Touch</h2>
              <p className="text-muted-foreground text-xs sm:text-sm mt-1">
                Reach out to our customer care team or visit our flagship store directly.
              </p>
            </div>
            
            <div className="space-y-6">
              {/* Location */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 text-purple-600 dark:text-purple-400">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm mb-1">Our Flagship Store</h3>
                  <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed max-w-sm">
                    {settings.address}
                  </p>
                  {settings.google_maps_link && (
                    <a
                      href={settings.google_maps_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline mt-1.5"
                    >
                      <Navigation className="w-3.5 h-3.5" /> Get Directions on Google Maps
                    </a>
                  )}
                </div>
              </div>

              {/* Phone & Hotline */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm mb-1">Phone &amp; WhatsApp Hotline</h3>
                  <a
                    href={`tel:${settings.phone}`}
                    className="text-muted-foreground text-xs sm:text-sm font-mono font-bold hover:text-foreground block"
                  >
                    {settings.phone}
                  </a>
                  {settings.secondary_phone && (
                    <a
                      href={`tel:${settings.secondary_phone}`}
                      className="text-muted-foreground text-xs font-mono block mt-0.5"
                    >
                      Hotline: {settings.secondary_phone}
                    </a>
                  )}
                  <a
                    href={`https://wa.me/${settings.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline mt-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Chat directly on WhatsApp
                  </a>
                </div>
              </div>

              {/* Email Address */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 text-blue-600 dark:text-blue-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm mb-1">Customer Support Email</h3>
                  <a
                    href={`mailto:${settings.email}`}
                    className="text-muted-foreground text-xs sm:text-sm font-medium hover:text-foreground block"
                  >
                    {settings.email}
                  </a>
                </div>
              </div>

              {/* Working Hours */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm mb-1">Store Business Hours</h3>
                  <p className="text-muted-foreground text-xs sm:text-sm">
                    <strong className="text-foreground">Mon – Sat:</strong> {settings.business_hours?.weekdays || "9:00 AM – 9:00 PM"}
                  </p>
                  <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
                    <strong className="text-foreground">Sunday:</strong> {settings.business_hours?.sunday || "10:00 AM – 7:00 PM"}
                  </p>
                  {settings.business_hours?.online_support && (
                    <p className="text-emerald-600 dark:text-emerald-400 text-xs font-bold mt-1">
                      ✓ {settings.business_hours.online_support}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form / Message (7 Cols) */}
          <div className="lg:col-span-7 bg-card p-6 sm:p-8 rounded-3xl border border-border shadow-sm space-y-6">
            <div>
              <h3 className="text-xl font-extrabold text-foreground">Send us an Inquiry</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Fill in your details below and our team will get back to you immediately.
              </p>
            </div>

            {sentSuccess && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs font-bold text-emerald-600 dark:text-emerald-400">
                ✓ Message sent! Opening WhatsApp chat for instant reply...
              </div>
            )}

            <form onSubmit={handleSendMessage} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">First Name</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-foreground/10 outline-none transition-all"
                    placeholder="John"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Last Name</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-foreground/10 outline-none transition-all"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email / Phone Number *</label>
                <input
                  type="text"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  required
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-foreground/10 outline-none transition-all"
                  placeholder="077 414 1118 or email@example.com"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Your Message / Device Inquiry *</label>
                <textarea
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-foreground/10 outline-none transition-all resize-none"
                  placeholder="I would like to inquire about price / warranty / repairs for..."
                />
              </div>

              <button
                type="submit"
                className="w-full bg-foreground text-background py-4 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-foreground/90 transition-all active:scale-[0.98] shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" /> Send Direct Message via WhatsApp
              </button>
            </form>
          </div>

        </div>

        {/* Full width Google Map */}
        <div className="mt-14 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4 text-purple-500" /> Interactive Store Map
            </h3>
            {settings.google_maps_link && (
              <a
                href={settings.google_maps_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <span>Open in Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          <div className="h-[360px] sm:h-[420px] rounded-3xl overflow-hidden border border-border relative shadow-sm bg-neutral-900">
            <iframe 
              src={settings.google_maps_embed}
              width="100%" 
              height="100%" 
              style={{ border: 0 }} 
              allowFullScreen={true} 
              loading="lazy" 
              referrerPolicy="no-referrer-when-downgrade"
              className="absolute inset-0 w-full h-full border-0"
              title="1PLACE.LK Colombo Flagship Store Location"
            />
          </div>
        </div>

      </div>
    </div>
  );
}
