import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Heart, MessageCircle, PackageCheck, PackageSearch, RotateCcw, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { SITE } from "@/lib/site";
import { MotionProvider } from "@/components/motion/MotionProvider";
import { Float, Reveal } from "@/components/motion/Reveal";

// ─────────────────────────────────────────────────────────────────────────────
// Everything on this page is something the store really does or offers. To add the founder's own words, a founding
// year or artisan names, add them to CHAPTERS below: only publish facts you can stand behind.
// ─────────────────────────────────────────────────────────────────────────────
const CHAPTERS = [
  {
    eyebrow: "Why we exist",
    title: "A saree is never just a garment",
    body: [
      "It is the one you wear to a wedding, the one you save for a festival, the one a daughter borrows years later. We built Raveena Sarees to make choosing those sarees feel as good as wearing them.",
      "So we keep the collection curated rather than crowded: silks, party wear, designer drapes and bridal pieces that we would be glad to see in our own homes.",
    ],
    image: "/images/collections/silk-sarees.jpg",
    alt: "Richly woven silk sarees folded in deep colours",
  },
  {
    eyebrow: "How we choose",
    title: "Honest details, so there are no surprises",
    body: [
      "Every saree page tells you the fabric, the zari, the weave, the length, the blouse piece and how to care for it. What you read is what we send.",
      "Each piece is checked and carefully packed before it leaves us, and you hear from us the moment it ships.",
    ],
    image: "/images/collections/handloom-silks.jpg",
    alt: "Close view of handloom silk with a woven border",
  },
  {
    eyebrow: "From Telangana, to you",
    title: "Rooted in Telangana, delivered across India",
    body: [
      `We are based in Telangana and send sarees to homes all over India. Questions before you buy? Message us on WhatsApp at ${SITE.phoneDisplay} and a real person will help you choose.`,
    ],
    image: "/images/collections/wedding-sarees.jpg",
    alt: "A wedding saree in red and gold",
  },
];

const VALUES = [
  { icon: Sparkles, title: "Curated, not crowded", text: "A focused collection of sarees we are proud of, instead of an endless catalogue." },
  { icon: PackageSearch, title: "Honest details", text: "Fabric, zari, weave, length, blouse and care instructions on every page." },
  { icon: PackageCheck, title: "Packed with care", text: "Every saree is checked and packed before it is handed to the courier." },
  { icon: MessageCircle, title: "People who reply", text: "Help by WhatsApp and email, before and after your order." },
];

const PROMISES = [
  { icon: RotateCcw, big: `${SITE.returnWindowDays} days`, small: "to request a return after delivery" },
  { icon: Truck, big: "Pan-India", small: "delivery to your doorstep" },
  { icon: ShieldCheck, big: "Razorpay", small: "secure online payments" },
  { icon: Heart, big: "WhatsApp", small: "support whenever you need it" },
];

const COLLECTIONS = [
  { href: "/category/silk-sarees", name: "Silk Sarees", image: "/images/collections/silk-sarees.jpg" },
  { href: "/category/wedding-sarees", name: "Wedding Sarees", image: "/images/collections/wedding-sarees.jpg" },
  { href: "/category/party-wear-sarees", name: "Party Wear", image: "/images/collections/party-wear.jpg" },
  { href: "/category/banarasi-sarees", name: "Banarasi", image: "/images/collections/banarasi-heritage.jpg" },
];

export default function AboutPage() {
  return (
    <MotionProvider>
      <div className="bg-brand-white text-brand-text font-sans overflow-x-clip">
        {/* ── Hero (rendered immediately: no scroll animation above the fold) ── */}
        <section className="relative isolate bg-maroon-gradient text-white">
          <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-70 [background:radial-gradient(60%_50%_at_20%_0%,rgba(200,162,77,0.28),transparent_70%),radial-gradient(50%_60%_at_90%_100%,rgba(200,162,77,0.18),transparent_70%)]" />
          <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-[0.07] [background-image:repeating-linear-gradient(45deg,#fff_0_1px,transparent_1px_14px)]" />

          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
            <Float distance={8} duration={6} className="inline-block">
              <Image src="/images/logo/raveena-mark.png" alt="" width={96} height={96} priority className="h-20 w-20 sm:h-24 sm:w-24 rounded-full object-cover ring-2 ring-brand-gold/70 shadow-[0_0_40px_rgba(200,162,77,0.35)]" />
            </Float>
            <p className="mt-6 text-[11px] sm:text-xs uppercase tracking-[0.35em] text-brand-goldLight font-poppins animate-fadeInUp">Our Story</p>
            <h1 className="mt-3 text-4xl sm:text-6xl font-serif font-normal leading-[1.1] animate-fadeInUp">
              Woven with grace.
              <span className="block text-brand-goldLight italic">Chosen with care.</span>
            </h1>
            <div aria-hidden="true" className="mx-auto mt-6 flex items-center justify-center gap-3 text-brand-gold">
              <span className="h-px w-16 bg-gradient-to-r from-transparent to-brand-gold" />
              <Sparkles className="w-4 h-4" />
              <span className="h-px w-16 bg-gradient-to-l from-transparent to-brand-gold" />
            </div>
            <p className="mt-6 max-w-2xl mx-auto text-base sm:text-lg text-white/85 font-light leading-relaxed">
              {SITE.name} is a Telangana-based saree store for weddings, festivals, parties and the everyday: silks, party wear, designer
              drapes and bridal pieces, delivered across India.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/shop" className="w-full sm:w-auto px-8 min-h-[48px] inline-flex items-center justify-center gap-2 rounded-full bg-brand-gold hover:bg-brand-goldLight text-brand-text text-xs font-bold uppercase tracking-widest font-poppins shadow-gold transition-colors">
                Explore the collection <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
              <Link href="/contact" className="w-full sm:w-auto px-8 min-h-[48px] inline-flex items-center justify-center rounded-full border border-white/40 hover:border-brand-goldLight hover:text-brand-goldLight text-xs font-bold uppercase tracking-widest font-poppins transition-colors">
                Talk to us
              </Link>
            </div>
          </div>
          <svg aria-hidden="true" className="block w-full h-8 sm:h-12 text-brand-white" viewBox="0 0 1440 48" preserveAspectRatio="none">
            <path fill="currentColor" d="M0 48V24c240 24 480 24 720 0s480-24 720 0v24z" />
          </svg>
        </section>

        {/* ── Story chapters ── */}
        <section aria-label="Our story" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 space-y-16 sm:space-y-24">
          {CHAPTERS.map((c, i) => (
            <article key={c.title} className={`grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-center ${i % 2 ? "lg:[&>*:first-child]:order-2" : ""}`}>
              <Reveal y={36} className="relative">
                <div aria-hidden="true" className={`absolute -inset-3 rounded-[2rem] bg-brand-goldPale/70 ${i % 2 ? "rotate-2" : "-rotate-2"}`} />
                <div className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-modal">
                  <Image src={c.image} alt={c.alt} fill sizes="(min-width: 1024px) 560px, 92vw" className="object-cover transition-transform duration-[900ms] ease-luxury hover:scale-105" />
                </div>
              </Reveal>
              <Reveal delay={0.1} className="space-y-4">
                <p className="text-[11px] uppercase tracking-[0.3em] text-brand-gold font-poppins font-semibold">{c.eyebrow}</p>
                <h2 className="text-3xl sm:text-4xl font-serif font-normal leading-tight">{c.title}</h2>
                {c.body.map((p) => (
                  <p key={p} className="text-[15px] sm:text-base text-neutral-600 font-light leading-8">{p}</p>
                ))}
              </Reveal>
            </article>
          ))}
        </section>

        {/* ── Values ── */}
        <section aria-labelledby="values-heading" className="bg-brand-ivory border-y border-brand-border py-14 sm:py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <Reveal className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
              <p className="text-[11px] uppercase tracking-[0.3em] text-brand-gold font-poppins font-semibold">What we stand for</p>
              <h2 id="values-heading" className="mt-2 text-3xl sm:text-4xl font-serif font-normal">The way we work</h2>
            </Reveal>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {VALUES.map(({ icon: Icon, title, text }, i) => (
                <Reveal as="li" key={title} delay={i * 0.08} className="group h-full">
                  <div className="h-full p-6 bg-white border border-brand-border rounded-3xl shadow-card hover:shadow-cardHover hover:-translate-y-1 hover:border-brand-gold/60 transition-all duration-300 space-y-3">
                    <span className="inline-flex w-12 h-12 items-center justify-center rounded-2xl bg-brand-goldPale text-brand-goldDark group-hover:bg-brand-gold group-hover:text-white transition-colors">
                      <Icon className="w-6 h-6" aria-hidden="true" />
                    </span>
                    <h3 className="font-serif text-lg font-semibold">{title}</h3>
                    <p className="text-sm text-neutral-600 leading-relaxed">{text}</p>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Collections ── */}
        <section aria-labelledby="collections-heading" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <Reveal className="text-center max-w-2xl mx-auto mb-10">
            <p className="text-[11px] uppercase tracking-[0.3em] text-brand-gold font-poppins font-semibold">Begin here</p>
            <h2 id="collections-heading" className="mt-2 text-3xl sm:text-4xl font-serif font-normal">Find the saree for your moment</h2>
          </Reveal>
          <ul className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {COLLECTIONS.map((c, i) => (
              <Reveal as="li" key={c.href} delay={i * 0.07}>
                <Link href={c.href} className="group relative block aspect-[3/4] overflow-hidden rounded-3xl shadow-card focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold">
                  <Image src={c.image} alt="" fill sizes="(min-width: 1024px) 280px, 46vw" className="object-cover transition-transform duration-[900ms] ease-luxury group-hover:scale-110" />
                  <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <span className="absolute inset-x-0 bottom-0 p-4 sm:p-5 flex items-end justify-between gap-2 text-white">
                    <span className="font-serif text-base sm:text-xl leading-tight">{c.name}</span>
                    <span className="w-9 h-9 shrink-0 rounded-full bg-white/15 backdrop-blur flex items-center justify-center group-hover:bg-brand-gold transition-colors">
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
                    </span>
                  </span>
                </Link>
              </Reveal>
            ))}
          </ul>
        </section>

        {/* ── Promises ── */}
        <section aria-label="Our promises" className="bg-maroon-gradient text-white py-12 sm:py-16">
          <ul className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 text-center">
            {PROMISES.map(({ icon: Icon, big, small }, i) => (
              <Reveal as="li" key={big} delay={i * 0.08} className="space-y-2">
                <Icon className="w-6 h-6 mx-auto text-brand-goldLight" aria-hidden="true" />
                <p className="text-2xl sm:text-3xl font-serif text-brand-goldLight">{big}</p>
                <p className="text-xs sm:text-sm text-white/80 leading-snug">{small}</p>
              </Reveal>
            ))}
          </ul>
        </section>

        {/* ── Closing ── */}
        <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
          <Reveal className="max-w-3xl mx-auto text-center space-y-5">
            <Image src="/images/logo/raveena-mark.png" alt="" width={64} height={64} className="mx-auto h-14 w-14 rounded-full object-cover ring-1 ring-brand-gold/60" />
            <h2 className="text-3xl sm:text-4xl font-serif font-normal leading-tight">
              Let us help you find <span className="italic text-brand-maroon">the one</span>.
            </h2>
            <p className="text-neutral-600 font-light leading-8">
              Write to <a href={`mailto:${SITE.email}`} className="text-brand-maroon underline underline-offset-4">{SITE.email}</a> or message us on WhatsApp at{" "}
              <a href={`https://wa.me/${SITE.whatsappNumber}`} className="text-brand-maroon underline underline-offset-4">{SITE.phoneDisplay}</a>. We are happy to help.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link href="/shop" className="btn-primary w-full sm:w-auto px-9 min-h-[50px] inline-flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest rounded-full shadow-md font-poppins">
                Shop sarees <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
              <Link href="/contact" className="w-full sm:w-auto px-9 min-h-[50px] inline-flex items-center justify-center rounded-full border border-brand-gold text-brand-maroon text-xs font-bold uppercase tracking-widest font-poppins hover:bg-brand-ivory transition-colors">
                Contact us
              </Link>
            </div>
          </Reveal>
        </section>
      </div>
    </MotionProvider>
  );
}
