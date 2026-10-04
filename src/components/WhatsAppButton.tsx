"use client";

import React, { useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";

export const WhatsAppButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("Namaste Ravina Sarees, I would like personalized assistance with choosing a saree.");

  const whatsappNumber = "917780756009"; // Official WhatsApp Concierge

  const handleSend = () => {
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${whatsappNumber}?text=${encoded}`, "_blank");
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 font-sans">
      {/* Popover Chat Prompt */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 bg-white border border-brand-border rounded-2xl shadow-luxury p-4 text-brand-text animate-scaleUp">
          <div className="flex items-center justify-between pb-3 border-b border-brand-border">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
                RS
              </div>
              <div>
                <p className="text-xs font-semibold text-brand-text font-poppins">Ravina Saree Concierge</p>
                <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                  ● Online | Open 24×7
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-neutral-400 hover:text-brand-text p-1 rounded-full hover:bg-neutral-100 transition-colors"
              aria-label="Close chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="py-3">
            <p className="text-xs text-neutral-600 bg-brand-ivory p-2.5 rounded-xl border border-brand-border leading-relaxed font-light">
              Namaste! Looking for bridal styling, pure zari certification, or custom handloom order?
              Chat with our drape stylists directly on WhatsApp.
            </p>
            <textarea
              rows={2}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-2.5 w-full bg-white border border-brand-border rounded-xl p-2.5 text-xs text-brand-text placeholder-neutral-400 focus:outline-none focus:border-brand-gold resize-none shadow-sm"
            />
          </div>

          <button
            onClick={handleSend}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors shadow-md font-poppins"
          >
            <Send className="w-3.5 h-3.5" />
            Start WhatsApp Chat
          </button>
        </div>
      )}

      {/* Floating Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-full shadow-luxury hover:scale-105 transition-all duration-300 border-2 border-white"
        aria-label="WhatsApp Stylist Chat"
      >
        <MessageCircle className="w-7 h-7" />
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-brand-gold rounded-full border-2 border-white animate-ping" />
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-brand-gold rounded-full border-2 border-white" />
      </button>
    </div>
  );
};
