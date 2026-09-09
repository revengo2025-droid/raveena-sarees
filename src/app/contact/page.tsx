"use client";

import React, { useState } from "react";
import { MapPin, Phone, Mail, Clock, MessageCircle, Send, CheckCircle2 } from "lucide-react";
import { useApp } from "@/lib/store";

export default function ContactPage() {
  const { showToast } = useApp();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("Bridal Styling Appointment");
  const [message, setMessage] = useState("");
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) {
      showToast("Please fill in your name, email, and message.", "error");
      return;
    }
    setIsSent(true);
    showToast("Your message has been sent to our Ravina Sarees concierge.", "success");
  };

  return (
    <div className="min-h-screen bg-brand-white text-brand-text py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
        <span className="text-xs font-semibold text-brand-gold uppercase tracking-[0.3em] block font-poppins">
          Telangana Flagship Boutique
        </span>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-brand-text font-normal">
          Connect with Our Concierge
        </h1>
        <p className="text-xs sm:text-sm text-neutral-600 font-light">
          Book private bridal appointments, inquire about custom handloom weaves, or connect with our master drape stylists.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Contact Info (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-brand-ivory border border-brand-border rounded-3xl p-6 sm:p-8 space-y-6 shadow-card">
            <h2 className="text-lg font-serif text-brand-text font-semibold border-b border-brand-border pb-4">
              Atelier Information
            </h2>

            <div className="space-y-5 text-xs">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 bg-white text-brand-gold rounded-xl border border-brand-border shadow-sm shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-brand-text uppercase text-[11px] font-poppins">Boutique & Atelier Address</h3>
                  <p className="text-neutral-600 mt-1 leading-relaxed font-light">
                    Marthadi, Bejjur, Komaram Bheem Asifabad, Telangana – 504224, India
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="p-2.5 bg-white text-brand-gold rounded-xl border border-brand-border shadow-sm shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-brand-text uppercase text-[11px] font-poppins">Concierge Phone</h3>
                  <p className="text-neutral-600 mt-1 font-light">
                    <a href="tel:+918688472300" className="hover:text-brand-maroon transition-colors">
                      +91 8688472300
                    </a>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="p-2.5 bg-white text-brand-gold rounded-xl border border-brand-border shadow-sm shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-brand-text uppercase text-[11px] font-poppins">Official Email</h3>
                  <p className="text-neutral-600 mt-1 font-light">
                    <a href="mailto:ravieenasarees@gmail.com" className="hover:text-brand-maroon transition-colors">
                      ravieenasarees@gmail.com
                    </a>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="p-2.5 bg-white text-brand-gold rounded-xl border border-brand-border shadow-sm shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-brand-text uppercase text-[11px] font-poppins">Business Hours</h3>
                  <p className="text-neutral-600 mt-1 font-light">Open 24×7 (Always Open)</p>
                </div>
              </div>
            </div>

            {/* Direct WhatsApp Button */}
            <div className="pt-2">
              <a
                href="https://wa.me/918688472300?text=Namaste%20Ravina%20Sarees,%20I%20would%20like%20to%20inquire%20about%20sarees."
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-full flex items-center justify-center gap-2 transition-colors shadow-md font-poppins"
              >
                <MessageCircle className="w-4 h-4" /> Chat Instantly on WhatsApp
              </a>
            </div>
          </div>
        </div>

        {/* Inquiry Form (7 cols) */}
        <div className="lg:col-span-7">
          <div className="bg-white border border-brand-border rounded-3xl p-6 sm:p-8 space-y-6 shadow-luxury">
            <h2 className="text-lg font-serif text-brand-text font-semibold border-b border-brand-border pb-4">
              Send an Inquiry or Book an Appointment
            </h2>

            {isSent ? (
              <div className="py-12 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h3 className="text-xl font-serif text-brand-text">Inquiry Received</h3>
                <p className="text-xs text-neutral-600 max-w-sm mx-auto leading-relaxed font-light">
                  Thank you, <strong>{name}</strong>. Our Ravina Sarees bridal styling concierge will connect with you shortly.
                </p>
                <button
                  onClick={() => setIsSent(false)}
                  className="mt-4 px-6 py-2 bg-brand-ivory text-brand-maroon hover:text-brand-gold border border-brand-border text-xs rounded-full font-poppins font-semibold transition-colors"
                >
                  Send Another Note
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase text-neutral-500 font-medium block mb-1 font-poppins">
                      Your Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ananya Reddy"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-brand-ivory border border-brand-border rounded-xl px-3.5 py-2.5 text-brand-text focus:outline-none focus:border-brand-gold shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-neutral-500 font-medium block mb-1 font-poppins">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="ananya@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-brand-ivory border border-brand-border rounded-xl px-3.5 py-2.5 text-brand-text focus:outline-none focus:border-brand-gold shadow-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase text-neutral-500 font-medium block mb-1 font-poppins">
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      placeholder="+91 86884 72300"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-brand-ivory border border-brand-border rounded-xl px-3.5 py-2.5 text-brand-text focus:outline-none focus:border-brand-gold shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-neutral-500 font-medium block mb-1 font-poppins">
                      Purpose of Inquiry
                    </label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full bg-brand-ivory border border-brand-border rounded-xl px-3.5 py-2.5 text-brand-text focus:outline-none focus:border-brand-gold shadow-sm"
                    >
                      <option value="Bridal Styling Appointment">Bridal Styling Appointment</option>
                      <option value="Bespoke Blouse Stitching">Bespoke Blouse Stitching</option>
                      <option value="Custom Handloom Weave Order">Custom Handloom Weave Order</option>
                      <option value="Order Tracking & BlueDart Inquiry">Order Tracking & BlueDart Inquiry</option>
                      <option value="Bulk Wedding Trousseau Gifting">Bulk Wedding Trousseau Gifting</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase text-neutral-500 font-medium block mb-1 font-poppins">
                    Your Message / Specific Requirements *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Tell us about the saree you are looking for, wedding date, color preferences, or appointment timing..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full bg-brand-ivory border border-brand-border rounded-xl p-3 text-brand-text focus:outline-none focus:border-brand-gold shadow-sm resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary px-8 py-3.5 text-xs font-bold uppercase tracking-widest rounded-full shadow-md flex items-center gap-2 font-poppins"
                >
                  <Send className="w-3.5 h-3.5" /> Submit Inquiry
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
