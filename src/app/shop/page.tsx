"use client";

import React, { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Filter,
  X,
  SlidersHorizontal,
  Sparkles,
  RotateCcw,
  LayoutGrid,
  Grid,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { ProductCard } from "@/components/ProductCard";
import { formatINR } from "@/lib/utils";

function ShopContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const initialCategory = searchParams.get("category") || "";

  const { products, categories } = useApp();

  // Filter States
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialCategory ? [initialCategory] : []
  );
  const [selectedFabrics, setSelectedFabrics] = useState<string[]>([]);
  const [selectedOccasions, setSelectedOccasions] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const highestPrice = useMemo(() => {
    return products.length > 0 ? Math.max(5000, ...products.map((p) => p.price)) : 5000;
  }, [products]);

  const [maxPrice, setMaxPrice] = useState<number>(5000);
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>("featured");
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState<boolean>(false);
  const [columns, setColumns] = useState<3 | 4>(3);

  // Sync URL query updates
  useEffect(() => {
    if (initialQuery) setSearchQuery(initialQuery);
    if (initialCategory) setSelectedCategories([initialCategory]);
  }, [initialQuery, initialCategory]);

  const distinctFabrics = useMemo(() => {
    return [
      "Soft Silk",
      "Metallic Tissue",
      "Mulberry Silk",
      "Pure Silk",
      "Katan Silk",
      "Tussar Silk",
      "Organza Silk",
    ];
  }, []);

  const distinctOccasions = [
    "Bridal / Wedding",
    "Grand Festive",
    "Evening Party",
    "Reception",
    "Daily Classic / Puja",
  ];

  const distinctColors = [
    { name: "Rani Pink", hex: "#E0115F" },
    { name: "Turquoise Blue", hex: "#20B2AA" },
    { name: "Crimson Red", hex: "#990011" },
    { name: "Emerald Green", hex: "#0E4D36" },
    { name: "Royal Gold", hex: "#C8A24D" },
    { name: "Peacock Blue", hex: "#005F73" },
    { name: "Obsidian Black", hex: "#111111" },
    { name: "Lavender Blush", hex: "#B39DDB" },
    { name: "Ivory Cream", hex: "#FAF8F5" },
    { name: "Royal Purple", hex: "#4A154B" },
  ];

  // Toggle helpers
  const toggleCategory = (slug: string) => {
    setSelectedCategories((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const toggleFabric = (fabric: string) => {
    setSelectedFabrics((prev) =>
      prev.includes(fabric) ? prev.filter((f) => f !== fabric) : [...prev, fabric]
    );
  };

  const toggleOccasion = (occ: string) => {
    setSelectedOccasions((prev) =>
      prev.includes(occ) ? prev.filter((o) => o !== occ) : [...prev, occ]
    );
  };

  const toggleColor = (colorName: string) => {
    setSelectedColors((prev) =>
      prev.includes(colorName) ? prev.filter((c) => c !== colorName) : [...prev, colorName]
    );
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedCategories([]);
    setSelectedFabrics([]);
    setSelectedOccasions([]);
    setSelectedColors([]);
    setMaxPrice(highestPrice);
    setInStockOnly(false);
  };

  // Filter logic
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Search query
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchTitle = p.name.toLowerCase().includes(q);
          const matchDesc = p.description.toLowerCase().includes(q);
          const matchCat = p.categoryName.toLowerCase().includes(q);
          const matchFabric = p.fabric.toLowerCase().includes(q);
          if (!matchTitle && !matchDesc && !matchCat && !matchFabric) return false;
        }

        // Category filter
        if (selectedCategories.length > 0) {
          const categorySlug = categories.find((c) => c.id === p.categoryId)?.slug;
          if (!categorySlug || !selectedCategories.includes(categorySlug)) return false;
        }

        // Fabric filter
        if (selectedFabrics.length > 0) {
          const matchesFabric = selectedFabrics.some((f) =>
            p.fabric.toLowerCase().includes(f.toLowerCase().replace(" silk", ""))
          );
          if (!matchesFabric) return false;
        }

        // Occasion filter
        if (selectedOccasions.length > 0) {
          const matchesOcc = selectedOccasions.some((occ) =>
            p.occasion.toLowerCase().includes(occ.toLowerCase())
          );
          if (!matchesOcc) return false;
        }

        // Color filter
        if (selectedColors.length > 0) {
          const matchesColor = selectedColors.some((c) =>
            p.availableColors.some((col) => col.toLowerCase().includes(c.toLowerCase().split(" ")[0]))
          );
          if (!matchesColor) return false;
        }

        // Price filter
        const effectivePrice = p.discountPrice || p.price;
        if (effectivePrice > maxPrice) return false;

        // In-stock
        if (inStockOnly && p.stock <= 0) return false;

        return true;
      })
      .sort((a, b) => {
        const priceA = a.discountPrice || a.price;
        const priceB = b.discountPrice || b.price;

        if (sortBy === "price-asc") return priceA - priceB;
        if (sortBy === "price-desc") return priceB - priceA;
        if (sortBy === "rating") return b.rating - a.rating;
        if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (sortBy === "bestseller") return (b.isBestseller ? 1 : 0) - (a.isBestseller ? 1 : 0);
        return 0; // default featured
      });
  }, [
    products,
    categories,
    searchQuery,
    selectedCategories,
    selectedFabrics,
    selectedOccasions,
    selectedColors,
    maxPrice,
    inStockOnly,
    sortBy,
  ]);

  const hasActiveFilters =
    searchQuery ||
    selectedCategories.length > 0 ||
    selectedFabrics.length > 0 ||
    selectedOccasions.length > 0 ||
    selectedColors.length > 0 ||
    maxPrice < highestPrice ||
    inStockOnly;

  return (
    <div className="min-h-screen bg-brand-white py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto font-sans text-brand-text">
      {/* 1. Header & Breadcrumbs */}
      <div className="mb-8 border-b border-brand-border pb-6">
        <div className="flex items-center gap-2 text-xs text-neutral-500 mb-2 font-poppins">
          <span>Home</span>
          <span>/</span>
          <span className="text-brand-gold font-semibold">All Sarees Catalog</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-serif text-brand-text font-normal">
              The Royal Saree Collection
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1 font-light">
              Authentic handlooms woven with pure tested zari and heirloom mulberry silk artistry.
            </p>
          </div>
          <span className="text-xs text-brand-maroon bg-brand-ivory px-4 py-2 rounded-full border border-brand-border self-start sm:self-auto font-semibold font-poppins shadow-sm">
            {filteredProducts.length} Handwoven Masterpieces Found
          </span>
        </div>
      </div>

      {/* 2. Top Filter Controls & Active Pills */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 bg-brand-ivory p-4 rounded-2xl border border-brand-border shadow-sm">
        {/* Mobile Filter Button */}
        <button
          onClick={() => setIsMobileFilterOpen(true)}
          className="lg:hidden flex items-center gap-2 px-4 py-2 bg-white text-brand-text text-xs font-semibold rounded-full border border-brand-border shadow-sm font-poppins"
        >
          <Filter className="w-4 h-4 text-brand-gold" /> Filters ({selectedCategories.length + selectedFabrics.length + selectedOccasions.length + selectedColors.length})
        </button>

        {/* Active Filter Pills */}
        <div className="flex-1 flex flex-wrap items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-[11px] text-neutral-500 hover:text-brand-maroon flex items-center gap-1 font-semibold uppercase tracking-wider mr-2 font-poppins"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          )}

          {searchQuery && (
            <span className="inline-flex items-center gap-1.5 bg-white text-brand-maroon border border-brand-gold/40 px-3 py-1 rounded-full text-xs shadow-sm font-medium">
              Search: &quot;{searchQuery}&quot;
              <button onClick={() => setSearchQuery("")}>
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedCategories.map((cat) => (
            <span
              key={cat}
              className="inline-flex items-center gap-1.5 bg-white text-brand-maroon border border-brand-gold/40 px-3 py-1 rounded-full text-xs shadow-sm font-medium"
            >
              {cat}
              <button onClick={() => toggleCategory(cat)}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {selectedFabrics.map((f) => (
            <span
              key={f}
              className="inline-flex items-center gap-1.5 bg-white text-brand-text border border-brand-border px-3 py-1 rounded-full text-xs shadow-sm font-medium"
            >
              {f}
              <button onClick={() => toggleFabric(f)}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {selectedColors.map((c) => (
            <span
              key={c}
              className="inline-flex items-center gap-1.5 bg-white text-brand-text border border-brand-border px-3 py-1 rounded-full text-xs shadow-sm font-medium"
            >
              {c}
              <button onClick={() => toggleColor(c)}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>

        {/* Sort & Grid Columns */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500 hidden sm:inline font-poppins">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white border border-brand-border text-brand-text text-xs rounded-full px-3.5 py-2 focus:outline-none focus:border-brand-gold font-poppins shadow-sm"
            >
              <option value="featured">Featured Curations</option>
              <option value="bestseller">Best Sellers</option>
              <option value="newest">Newest Drops</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>

          <div className="hidden md:flex items-center gap-1 border-l border-brand-border pl-3">
            <button
              onClick={() => setColumns(3)}
              className={`p-1.5 rounded-lg transition-colors ${columns === 3 ? "bg-brand-gold text-white" : "text-neutral-400 hover:text-brand-text"}`}
              aria-label="3 columns"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setColumns(4)}
              className={`p-1.5 rounded-lg transition-colors ${columns === 4 ? "bg-brand-gold text-white" : "text-neutral-400 hover:text-brand-text"}`}
              aria-label="4 columns"
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Main Grid Layout with Desktop Sidebar Filter */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Desktop Filter Sidebar */}
        <aside className="hidden lg:block lg:col-span-1 space-y-6">
          <div className="bg-brand-ivory border border-brand-border rounded-3xl p-6 space-y-6 sticky top-28 shadow-card">
            <div className="flex items-center justify-between pb-4 border-b border-brand-border">
              <h3 className="text-xs font-serif font-bold uppercase tracking-widest text-brand-text flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-brand-gold" /> Filter Collection
              </h3>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="text-[11px] text-neutral-500 hover:text-brand-maroon font-poppins"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Price Range Slider */}
            <div>
              <label className="text-xs uppercase tracking-wider font-semibold text-brand-text block mb-2 font-poppins">
                Price Up To: <strong className="text-brand-maroon">{formatINR(maxPrice)}</strong>
              </label>
              <input
                type="range"
                min={1000}
                max={highestPrice}
                step={100}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-brand-gold bg-neutral-200 h-1.5 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-neutral-500 mt-1 font-mono">
                <span>₹1,000</span>
                <span>{formatINR(highestPrice)}</span>
              </div>
            </div>

            {/* Categories */}
            <div className="pt-4 border-t border-brand-border">
              <h4 className="text-xs uppercase tracking-wider font-semibold text-brand-text mb-3 font-poppins">
                Saree Categories
              </h4>
              <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                {categories.map((cat) => (
                  <label
                    key={cat.id}
                    className="flex items-center justify-between text-xs text-neutral-700 hover:text-brand-maroon cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(cat.slug)}
                        onChange={() => toggleCategory(cat.slug)}
                        className="accent-brand-gold rounded"
                      />
                      {cat.name}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      {products.filter((p) => p.categoryId === cat.id).length}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Fabrics */}
            <div className="pt-4 border-t border-brand-border">
              <h4 className="text-xs uppercase tracking-wider font-semibold text-brand-text mb-3 font-poppins">
                Authentic Fabrics
              </h4>
              <div className="space-y-2.5">
                {distinctFabrics.map((fabric) => (
                  <label
                    key={fabric}
                    className="flex items-center gap-2 text-xs text-neutral-700 hover:text-brand-maroon cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedFabrics.includes(fabric)}
                      onChange={() => toggleFabric(fabric)}
                      className="accent-brand-gold rounded"
                    />
                    {fabric}
                  </label>
                ))}
              </div>
            </div>

            {/* Color Swatches */}
            <div className="pt-4 border-t border-brand-border">
              <h4 className="text-xs uppercase tracking-wider font-semibold text-brand-text mb-3 font-poppins">
                Royal Color Palette
              </h4>
              <div className="grid grid-cols-4 gap-2">
                {distinctColors.map((color) => {
                  const isSelected = selectedColors.includes(color.name);
                  return (
                    <button
                      key={color.name}
                      onClick={() => toggleColor(color.name)}
                      className={`h-8 rounded-xl border flex items-center justify-center transition-all ${
                        isSelected
                          ? "border-brand-gold ring-2 ring-brand-gold/40 scale-105 shadow-sm"
                          : "border-brand-border hover:border-brand-gold/60"
                      }`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
                  );
                })}
              </div>
            </div>

            {/* Occasions */}
            <div className="pt-4 border-t border-brand-border">
              <h4 className="text-xs uppercase tracking-wider font-semibold text-brand-text mb-3 font-poppins">
                Occasion & Rituals
              </h4>
              <div className="space-y-2.5">
                {distinctOccasions.map((occ) => (
                  <label
                    key={occ}
                    className="flex items-center gap-2 text-xs text-neutral-700 hover:text-brand-maroon cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedOccasions.includes(occ)}
                      onChange={() => toggleOccasion(occ)}
                      className="accent-brand-gold rounded"
                    />
                    {occ}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Product Cards Grid */}
        <main className="lg:col-span-3">
          {filteredProducts.length === 0 ? (
            <div className="bg-brand-ivory border border-brand-border rounded-3xl p-12 text-center shadow-card">
              <div className="w-16 h-16 rounded-full bg-white border border-brand-border flex items-center justify-center mx-auto mb-4 text-brand-gold shadow-sm">
                <Sparkles className="w-8 h-8 opacity-70" />
              </div>
              <h3 className="text-xl font-serif text-brand-text mb-2">
                No Sarees Match Your Current Filters
              </h3>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto mb-6 font-light">
                Try widening your price range or clearing active filters to browse our full handloom selection.
              </p>
              <button
                onClick={clearAllFilters}
                className="btn-primary px-6 py-2.5 text-xs font-semibold rounded-full uppercase tracking-wider font-poppins shadow-md"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div
              className={`grid grid-cols-1 sm:grid-cols-2 ${
                columns === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"
              } gap-6`}
            >
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Mobile Filter Drawer */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden lg:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsMobileFilterOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 max-w-full flex pr-10">
            <div className="w-screen max-w-xs bg-white p-6 text-brand-text space-y-6 overflow-y-auto shadow-luxury">
              <div className="flex items-center justify-between border-b border-brand-border pb-4">
                <h3 className="font-serif text-lg text-brand-text font-semibold">Filter Sarees</h3>
                <button
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="p-1 text-neutral-400 hover:text-brand-text rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Price */}
              <div>
                <label className="text-xs uppercase text-neutral-600 block mb-2 font-poppins">
                  Max Price: {formatINR(maxPrice)}
                </label>
                <input
                  type="range"
                  min={1000}
                  max={highestPrice}
                  step={100}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full accent-brand-gold bg-neutral-200 h-1.5 rounded-lg"
                />
              </div>

              {/* Categories */}
              <div className="space-y-2">
                <h4 className="text-xs uppercase text-neutral-500 font-poppins">Categories</h4>
                {categories.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-xs text-neutral-700">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(c.slug)}
                      onChange={() => toggleCategory(c.slug)}
                      className="accent-brand-gold rounded"
                    />
                    {c.name}
                  </label>
                ))}
              </div>

              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="btn-primary w-full py-3 text-xs font-bold uppercase tracking-wider rounded-full font-poppins shadow-md"
              >
                Apply Filters ({filteredProducts.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-brand-white text-brand-gold flex items-center justify-center font-serif text-lg">Loading Ravina Royal Catalog...</div>}>
      <ShopContent />
    </Suspense>
  );
}
