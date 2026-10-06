import Link from "next/link";
import { ArrowRight, PackageSearch, RotateCcw, ShieldCheck } from "lucide-react";
import { SITE } from "@/lib/site";

const POINTS = [
  {
    icon: PackageSearch,
    title: "Clear product details",
    text: "Every saree page lists the fabric, zari, weave, length, blouse details and care instructions, so you know what you are buying.",
  },
  {
    icon: ShieldCheck,
    title: "Secure ordering",
    text: "Pay online through Razorpay or choose cash on delivery where offered, and follow your order from your account.",
  },
  {
    icon: RotateCcw,
    title: "Simple returns",
    text: `If something is not right, you can ask for a return within ${SITE.returnWindowDays} days of delivery. Our policies spell out exactly how it works.`,
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-brand-white text-brand-text font-sans">
      <section className="py-14 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto text-center space-y-5">
        <h1 className="text-3xl sm:text-5xl font-serif font-normal leading-tight">About {SITE.name}</h1>
        <p className="text-base sm:text-lg text-neutral-600 font-light leading-relaxed">
          {SITE.name} is an online saree store based in Telangana, India. We offer a curated selection of sarees for weddings,
          festivals, parties and everyday wear, delivered across India.
        </p>
      </section>

      <section aria-labelledby="how-heading" className="py-14 bg-brand-ivory border-y border-brand-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 id="how-heading" className="text-2xl sm:text-3xl font-serif font-normal text-center mb-10">How we work</h2>
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            {POINTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="p-6 bg-white border border-brand-border rounded-2xl shadow-card space-y-3">
                <Icon className="w-6 h-6 text-brand-gold" aria-hidden="true" />
                <h3 className="font-serif text-lg font-semibold">{title}</h3>
                <p className="text-sm text-neutral-600 leading-relaxed">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-14 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto text-center space-y-5">
        <h2 className="text-2xl sm:text-3xl font-serif font-normal">Questions? We are happy to help.</h2>
        <p className="text-sm sm:text-base text-neutral-600 font-light">
          Write to <a href={`mailto:${SITE.email}`} className="text-brand-maroon underline">{SITE.email}</a> or message us on WhatsApp at{" "}
          <a href={`https://wa.me/${SITE.whatsappNumber}`} className="text-brand-maroon underline">{SITE.phoneDisplay}</a>.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link href="/shop" className="btn-primary w-full sm:w-auto px-8 min-h-[48px] inline-flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest rounded-full shadow-md font-poppins">
            Shop Sarees <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/contact" className="w-full sm:w-auto px-8 min-h-[48px] inline-flex items-center justify-center rounded-full border border-brand-gold text-brand-maroon text-xs font-bold uppercase tracking-widest font-poppins hover:bg-brand-ivory">
            Contact Us
          </Link>
        </div>
      </section>
    </div>
  );
}
