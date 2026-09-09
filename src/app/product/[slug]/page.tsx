"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Star,
  Heart,
  ShoppingBag,
  Share2,
  Truck,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  MessageCircle,
  Award,
  ChevronRight,
  Send,
  ArrowRight,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { ProductCard } from "@/components/ProductCard";
import {
  formatINR,
  calculateDiscountPercentage,
  validateIndianPincode,
  formatDate,
} from "@/lib/utils";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const {
    products,
    categories,
    addToCart,
    toggleWishlist,
    isInWishlist,
    addToRecentlyViewed,
    recentlyViewed,
    reviews,
    addReview,
    showToast,
  } = useApp();

  const product = products.find((p) => p.slug === slug);
  const categoryObj = product
    ? categories.find(
        (c) =>
          c.id === product.categoryId ||
          c.slug === product.categoryId ||
          c.name.toLowerCase() === product.categoryName.toLowerCase()
      )
    : undefined;

  // States
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [activeTab, setActiveTab] = useState<
    "description" | "specifications" | "care" | "shipping" | "reviews"
  >("description");

  // Pincode check
  const [pincode, setPincode] = useState("");
  const [pincodeResult, setPincodeResult] = useState<{
    isValid: boolean;
    city?: string;
    state?: string;
    deliveryDays?: number;
  } | null>(null);

  // Review submission state
  const [reviewName, setReviewName] = useState("");
  const [reviewCity, setReviewCity] = useState("Telangana");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Track recently viewed
  useEffect(() => {
    if (product) {
      addToRecentlyViewed(product);
      if (!selectedColor && product.availableColors?.length > 0) {
        setSelectedColor(product.primaryColor || product.availableColors[0]);
      }
    }
  }, [product]);

  if (!product) {
    return (
      <div className="min-h-[70vh] bg-brand-white flex flex-col items-center justify-center p-8 text-center text-brand-text">
        <h2 className="text-2xl font-serif mb-2">Saree Not Found</h2>
        <p className="text-xs text-neutral-500 mb-6 font-light">
          The requested saree creation could not be found in our atelier.
        </p>
        <Link
          href="/shop"
          className="btn-primary px-6 py-2.5 text-xs rounded-full font-poppins font-semibold shadow-md"
        >
          Return to Catalog
        </Link>
      </div>
    );
  }

  const isWishlisted = isInWishlist(product.id);
  const discountPercent = calculateDiscountPercentage(product.price, product.discountPrice);
  const currentColor = selectedColor || product.primaryColor;

  // Filter reviews for this product
  const productReviews = reviews.filter(
    (r) => r.productId === product.id && r.status === "approved"
  );

  // Related products from same category
  const relatedProducts = products
    .filter((p) => p.categoryId === product.categoryId && p.id !== product.id)
    .slice(0, 4);

  // Pincode Check
  const handlePincodeCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pincode.trim()) return;
    const res = validateIndianPincode(pincode);
    setPincodeResult(res);
  };

  const handleBuyNow = () => {
    addToCart(product, 1, currentColor);
    router.push("/checkout");
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product.name,
        text: product.description,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast("Saree link copied to clipboard", "info");
    }
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `Admire this handwoven masterpiece from Ravina Sarees: ${product.name} - ${window.location.href}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewName || !reviewComment) {
      showToast("Please fill in your name and comment.", "error");
      return;
    }
    setIsSubmittingReview(true);
    addReview({
      productId: product.id,
      userName: reviewName,
      userCity: reviewCity,
      rating: reviewRating,
      title: reviewTitle,
      comment: reviewComment,
      verifiedPurchase: true,
    });
    setReviewName("");
    setReviewComment("");
    setReviewTitle("");
    setIsSubmittingReview(false);
  };

  return (
    <div className="min-h-screen bg-brand-white text-brand-text py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto font-sans">
      {/* 1. Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-neutral-500 mb-8 overflow-x-auto whitespace-nowrap pb-2 font-poppins">
        <Link href="/" className="hover:text-brand-gold">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
        <Link href="/shop" className="hover:text-brand-gold">
          Sarees
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
        <Link href={`/category/${categoryObj?.slug || product.categoryId}`} className="hover:text-brand-gold">
          {product.categoryName}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
        <span className="text-brand-text font-medium truncate max-w-xs">{product.name}</span>
      </nav>

      {/* 2. Main PDP Grid: Gallery & Info */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Gallery Column (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Main Large Image with Zoom */}
          <div className="relative aspect-[3/4] w-full rounded-3xl overflow-hidden bg-brand-ivory border border-brand-border shadow-luxury group">
            <img
              src={product.images[selectedImageIndex] || product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105 cursor-zoom-in"
            />

            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
              <span className="bg-brand-gold text-white font-bold text-[10px] uppercase tracking-wider px-3 py-1 rounded-full shadow-md flex items-center gap-1 font-poppins">
                <Award className="w-3.5 h-3.5" /> Pure Silk Mark
              </span>
              {discountPercent > 0 && (
                <span className="bg-brand-maroon text-white font-semibold text-[10px] uppercase tracking-wider px-3 py-1 rounded-full shadow-md font-poppins">
                  Save {discountPercent}%
                </span>
              )}
            </div>

            {/* Wishlist Floating Button */}
            <button
              onClick={() => toggleWishlist(product.id)}
              className={`absolute top-4 right-4 p-3 rounded-full backdrop-blur-md transition-all shadow-md ${
                isWishlisted
                  ? "bg-brand-maroon text-white scale-110"
                  : "bg-white/80 text-neutral-600 hover:text-brand-maroon hover:bg-white"
              }`}
              aria-label="Wishlist Saree"
            >
              <Heart className={`w-5 h-5 ${isWishlisted ? "fill-white" : ""}`} />
            </button>
          </div>

          {/* Thumbnail Gallery Strip */}
          {product.images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`w-20 sm:w-24 aspect-[3/4] rounded-2xl overflow-hidden border-2 transition-all shrink-0 ${
                    selectedImageIndex === idx
                      ? "border-brand-gold scale-105 shadow-md ring-2 ring-brand-gold/30"
                      : "border-brand-border opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Details & Actions Column (5 cols on lg) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            {/* Category & SKU */}
            <div className="flex items-center justify-between text-xs text-neutral-500 uppercase tracking-widest font-poppins">
              <span className="text-brand-gold font-semibold">{product.categoryName}</span>
              <span className="font-mono">SKU: {product.sku}</span>
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-serif text-brand-text font-normal leading-snug">
              {product.name}
            </h1>

            {/* Ratings Summary */}
            <div className="flex items-center gap-3">
              <div className="flex items-center text-brand-gold">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.floor(product.rating)
                        ? "fill-brand-gold text-brand-gold"
                        : "text-neutral-300"
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs font-semibold text-brand-text">
                {product.rating} / 5.0
              </span>
              <button
                onClick={() => setActiveTab("reviews")}
                className="text-xs text-brand-maroon hover:underline font-poppins font-medium"
              >
                ({product.reviewCount} Verified Reviews)
              </button>
            </div>

            {/* Price & Discount */}
            <div className="p-4 bg-brand-ivory border border-brand-border rounded-2xl shadow-sm">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold font-serif text-brand-maroon">
                  {formatINR(product.discountPrice || product.price)}
                </span>
                {product.discountPrice && (
                  <>
                    <span className="text-base text-neutral-400 line-through">
                      {formatINR(product.price)}
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-0.5 bg-brand-maroon text-white rounded-full font-poppins">
                      {discountPercent}% OFF
                    </span>
                  </>
                )}
              </div>
              <p className="text-[11px] text-neutral-500 mt-1 font-light">
                Inclusive of all taxes (GST) • Complimentary Insured Express Pan-India Shipping
              </p>
            </div>

            {/* Color Shades Selector */}
            {product.availableColors && product.availableColors.length > 0 && (
              <div className="space-y-2 pt-2">
                <label className="text-xs uppercase tracking-wider font-semibold text-brand-text block font-poppins">
                  Select Shade: <strong className="text-brand-maroon">{currentColor}</strong>
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.availableColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`px-3.5 py-1.5 text-xs rounded-full border transition-all font-poppins ${
                        currentColor === color
                          ? "bg-brand-gold text-white font-bold border-brand-gold shadow-sm"
                          : "bg-white text-neutral-700 border-brand-border hover:border-brand-gold/60"
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Saree Specs Pills */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-2">
              <div className="p-2.5 bg-brand-ivory border border-brand-border rounded-xl">
                <span className="text-[10px] uppercase text-neutral-500 block font-poppins">Fabric</span>
                <span className="font-medium text-brand-text">{product.fabric}</span>
              </div>
              <div className="p-2.5 bg-brand-ivory border border-brand-border rounded-xl">
                <span className="text-[10px] uppercase text-neutral-500 block font-poppins">Zari Type</span>
                <span className="font-medium text-brand-text">{product.zariType}</span>
              </div>
              <div className="p-2.5 bg-brand-ivory border border-brand-border rounded-xl">
                <span className="text-[10px] uppercase text-neutral-500 block font-poppins">Saree Length</span>
                <span className="font-medium text-brand-text">{product.sareeLength}</span>
              </div>
              <div className="p-2.5 bg-brand-ivory border border-brand-border rounded-xl">
                <span className="text-[10px] uppercase text-neutral-500 block font-poppins">Blouse Piece</span>
                <span className="font-medium text-brand-maroon">
                  {product.blouseIncluded ? "Included (0.8m)" : "Not Included"}
                </span>
              </div>
            </div>

            {/* Pincode Delivery Estimator */}
            <div className="p-4 bg-white border border-brand-border rounded-2xl space-y-3 shadow-card">
              <div className="flex items-center gap-2 text-xs font-semibold text-brand-text font-poppins">
                <Truck className="w-4 h-4 text-brand-gold" /> Check Delivery & COD Availability
              </div>
              <form onSubmit={handlePincodeCheck} className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Enter 6-digit Pincode (e.g. 504224)"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="flex-1 bg-brand-ivory border border-brand-border rounded-full px-3.5 py-2 text-xs text-brand-text placeholder-neutral-400 focus:outline-none focus:border-brand-gold"
                />
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-gold hover:bg-brand-maroon text-white text-xs font-semibold rounded-full transition-colors font-poppins shadow-sm"
                >
                  Verify
                </button>
              </form>

              {pincodeResult && (
                <div
                  className={`text-xs p-3 rounded-xl border ${
                    pincodeResult.isValid
                      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                      : "bg-red-50 border-red-200 text-red-900"
                  }`}
                >
                  {pincodeResult.isValid ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        Delivery to <strong>{pincodeResult.city}, {pincodeResult.state}</strong> in{" "}
                        <strong>{pincodeResult.deliveryDays} business day(s)</strong>. Cash on Delivery & Express Air Courier available.
                      </span>
                    </div>
                  ) : (
                    <span>Please enter a valid 6-digit Indian PIN code.</span>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons: Add to Bag & Buy Now */}
            <div className="space-y-3 pt-2">
              <div className="flex gap-3">
                <button
                  onClick={() => addToCart(product, 1, currentColor)}
                  className="flex-1 py-4 bg-brand-ivory hover:bg-white border border-brand-gold text-brand-maroon hover:text-brand-gold font-bold text-xs uppercase tracking-widest rounded-full transition-all flex items-center justify-center gap-2 shadow-sm font-poppins"
                >
                  <ShoppingBag className="w-4 h-4 text-brand-gold" />
                  Add to Royal Bag
                </button>

                <button
                  onClick={handleBuyNow}
                  className="btn-primary flex-1 py-4 text-xs font-bold uppercase tracking-widest rounded-full shadow-md flex items-center justify-center gap-2 font-poppins"
                >
                  Buy Now <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Share & WhatsApp */}
              <div className="flex items-center justify-between text-xs pt-1 font-poppins">
                <button
                  onClick={handleShare}
                  className="text-neutral-500 hover:text-brand-text flex items-center gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5 text-brand-gold" /> Share Saree
                </button>
                <button
                  onClick={handleWhatsAppShare}
                  className="text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5 font-medium"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> Share on WhatsApp
                </button>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-brand-border text-center text-[10px] text-neutral-600 font-poppins">
              <div className="p-2.5 bg-brand-ivory rounded-xl border border-brand-border">
                <ShieldCheck className="w-4 h-4 text-brand-gold mx-auto mb-1" />
                <span>100% Silk Mark Authenticated</span>
              </div>
              <div className="p-2.5 bg-brand-ivory rounded-xl border border-brand-border">
                <RotateCcw className="w-4 h-4 text-brand-gold mx-auto mb-1" />
                <span>7-Day Easy Exchange</span>
              </div>
              <div className="p-2.5 bg-brand-ivory rounded-xl border border-brand-border">
                <Sparkles className="w-4 h-4 text-brand-gold mx-auto mb-1" />
                <span>Handloom Certified</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. TABS SECTION */}
      <section className="mt-16 pt-8 border-t border-brand-border">
        {/* Tab Headers */}
        <div className="flex border-b border-brand-border overflow-x-auto gap-4 sm:gap-8 pb-3 font-poppins">
          {[
            { id: "description", label: "Story & Weave Description" },
            { id: "specifications", label: "Fabric & Zari Specs" },
            { id: "care", label: "Care & Preservation" },
            { id: "shipping", label: "Shipping & Returns" },
            { id: "reviews", label: `Reviews (${productReviews.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`text-xs sm:text-sm font-semibold uppercase tracking-wider pb-2 relative whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "text-brand-maroon font-bold"
                  : "text-neutral-500 hover:text-brand-text"
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand-maroon" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content Panels */}
        <div className="py-8 text-xs sm:text-sm text-neutral-700 leading-relaxed max-w-4xl">
          {activeTab === "description" && (
            <div className="space-y-4">
              <h3 className="text-xl font-serif text-brand-text">The Artisan Narrative</h3>
              <p className="font-light">{product.description}</p>
              <p className="font-light">
                Each saree in our atelier undergoes a rigorous 4-step quality audit:
                warp-weft tension inspection, pure gold zari lustre appraisal, fall-and-pico readiness, and certified
                Silk Mark tagging.
              </p>
            </div>
          )}

          {activeTab === "specifications" && (
            <div className="space-y-4">
              <h3 className="text-xl font-serif text-brand-text">Detailed Masterloom Specifications</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-brand-ivory p-6 rounded-2xl border border-brand-border">
                <div>
                  <span className="text-neutral-500 uppercase text-[10px] block font-poppins">Product Code</span>
                  <span className="text-brand-text font-medium">{product.sku}</span>
                </div>
                <div>
                  <span className="text-neutral-500 uppercase text-[10px] block font-poppins">Primary Fabric</span>
                  <span className="text-brand-text font-medium">{product.fabric}</span>
                </div>
                <div>
                  <span className="text-neutral-500 uppercase text-[10px] block font-poppins">Zari & Metallic Thread</span>
                  <span className="text-brand-text font-medium">{product.zariType}</span>
                </div>
                <div>
                  <span className="text-neutral-500 uppercase text-[10px] block font-poppins">Weaving Craft</span>
                  <span className="text-brand-text font-medium">{product.weaveType}</span>
                </div>
                <div>
                  <span className="text-neutral-500 uppercase text-[10px] block font-poppins">Saree Dimensions</span>
                  <span className="text-brand-text font-medium">{product.sareeLength} (Standard 6-Yard)</span>
                </div>
                <div>
                  <span className="text-neutral-500 uppercase text-[10px] block font-poppins">Unstitched Blouse</span>
                  <span className="text-brand-maroon font-medium">{product.blouseLength}</span>
                </div>
                <div>
                  <span className="text-neutral-500 uppercase text-[10px] block font-poppins">Occasion</span>
                  <span className="text-brand-text font-medium">{product.occasion}</span>
                </div>
                <div>
                  <span className="text-neutral-500 uppercase text-[10px] block font-poppins">Artisan Provenance</span>
                  <span className="text-brand-text font-medium">Kanchipuram / Varanasi / Telangana</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "care" && (
            <div className="space-y-4">
              <h3 className="text-xl font-serif text-brand-text">Heirloom Saree Care Guide</h3>
              <p className="font-light">{product.careInstructions}</p>
              <ul className="list-disc pl-5 space-y-2 text-neutral-600 font-light">
                <li>Always dry clean to protect the pure silk fibres and gold zari sheen.</li>
                <li>Store folded in a breathable cotton or muslin bag. Avoid plastic covers.</li>
                <li>Refold every 3 to 4 months along different crease lines to prevent zari wear.</li>
                <li>Do not spray perfumes, deodorants, or water directly onto the zari borders.</li>
              </ul>
            </div>
          )}

          {activeTab === "shipping" && (
            <div className="space-y-4">
              <h3 className="text-xl font-serif text-brand-text">Pan-India Express Shipping & 7-Day Returns</h3>
              <p className="font-light">
                <strong>Express Air Shipping:</strong> All orders are dispatched via BlueDart Express Air Courier within 24-48 hours. Transit insurance is included at zero extra cost.
              </p>
              <p className="font-light">
                <strong>Local Deliveries:</strong> Express dispatch available across Telangana & South India.
              </p>
              <p className="font-light">
                <strong>7-Day Returns & Exchanges:</strong> If you are not completely enchanted by your saree, request a doorstep return pickup or exchange within 7 days of delivery.
              </p>
            </div>
          )}

          {activeTab === "reviews" && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-brand-ivory p-6 rounded-2xl border border-brand-border">
                <div>
                  <h3 className="text-xl font-serif text-brand-text">Customer Reviews</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center text-brand-gold">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-brand-gold" />
                      ))}
                    </div>
                    <span className="text-xs text-brand-text font-bold">
                      {product.rating} based on {productReviews.length} reviews
                    </span>
                  </div>
                </div>
              </div>

              {/* Review List */}
              <div className="space-y-4">
                {productReviews.length === 0 ? (
                  <p className="text-neutral-500 italic font-light">
                    Be the first royal patron to review this masterpiece.
                  </p>
                ) : (
                  productReviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="bg-white p-5 rounded-2xl border border-brand-border shadow-card space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-brand-text text-xs">{rev.userName}</span>
                          <span className="text-[10px] text-brand-maroon bg-brand-ivory px-2 py-0.5 rounded-full border border-brand-border font-poppins">
                            Verified Buyer ({rev.userCity})
                          </span>
                        </div>
                        <span className="text-[10px] text-neutral-400 font-mono">{formatDate(rev.createdAt)}</span>
                      </div>
                      <div className="flex items-center text-brand-gold">
                        {[...Array(rev.rating)].map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-brand-gold" />
                        ))}
                      </div>
                      {rev.title && <h4 className="text-xs font-bold text-brand-text font-serif">{rev.title}</h4>}
                      <p className="text-xs text-neutral-600 font-light">{rev.comment}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Write Review Form */}
              <div className="bg-brand-ivory p-6 rounded-2xl border border-brand-border space-y-4 shadow-card">
                <h4 className="font-serif text-base text-brand-text font-semibold">Write a Certified Review</h4>
                <form onSubmit={handleSubmitReview} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] uppercase text-neutral-500 font-poppins block mb-1">
                        Your Full Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Radhika Sharma"
                        value={reviewName}
                        onChange={(e) => setReviewName(e.target.value)}
                        className="w-full bg-white border border-brand-border rounded-xl px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-gold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-neutral-500 font-poppins block mb-1">
                        City / Location
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Hyderabad / Bengaluru"
                        value={reviewCity}
                        onChange={(e) => setReviewCity(e.target.value)}
                        className="w-full bg-white border border-brand-border rounded-xl px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-gold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase text-neutral-500 font-poppins block mb-1">
                      Rating
                    </label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          className="p-1 text-brand-gold"
                        >
                          <Star
                            className={`w-5 h-5 ${
                              star <= reviewRating ? "fill-brand-gold" : "text-neutral-300"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase text-neutral-500 font-poppins block mb-1">
                      Review Headline
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Truly regal silk with exquisite zari work"
                      value={reviewTitle}
                      onChange={(e) => setReviewTitle(e.target.value)}
                      className="w-full bg-white border border-brand-border rounded-xl px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-gold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase text-neutral-500 font-poppins block mb-1">
                      Your Detailed Experience
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Share your thoughts on the weave quality, silk fall, color, and packaging..."
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      className="w-full bg-white border border-brand-border rounded-xl p-3 text-xs text-brand-text focus:outline-none focus:border-brand-gold resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="btn-primary px-6 py-2.5 text-xs font-semibold rounded-full font-poppins shadow-md flex items-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" /> Submit Review
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 4. RELATED SAREES */}
      {relatedProducts.length > 0 && (
        <section className="mt-16 pt-12 border-t border-brand-border">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl sm:text-2xl font-serif text-brand-text">
              You May Also Admire
            </h2>
            <Link
              href={`/category/${product.categoryId}`}
              className="text-xs text-brand-maroon hover:text-brand-gold uppercase tracking-wider font-semibold font-poppins"
            >
              View More from {product.categoryName} &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* 5. RECENTLY VIEWED */}
      {recentlyViewed.length > 1 && (
        <section className="mt-16 pt-12 border-t border-brand-border">
          <h2 className="text-lg sm:text-xl font-serif text-brand-text mb-6">
            Recently Explored by You
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {recentlyViewed
              .filter((p) => p.id !== product.id)
              .slice(0, 6)
              .map((p) => (
                <Link
                  key={p.id}
                  href={`/product/${p.slug}`}
                  className="group bg-white rounded-2xl overflow-hidden border border-brand-border hover:border-brand-gold transition-all p-2 shadow-card"
                >
                  <img
                    src={p.images[0]}
                    alt={p.name}
                    className="aspect-[3/4] w-full object-cover rounded-xl mb-2"
                  />
                  <h4 className="text-[11px] text-brand-text line-clamp-1 font-medium group-hover:text-brand-maroon">
                    {p.name}
                  </h4>
                  <span className="text-[10px] text-brand-maroon font-bold font-serif">
                    {formatINR(p.discountPrice || p.price)}
                  </span>
                </Link>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
