"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  SareeProduct,
  Category,
  CartItem,
  SavedAddress,
  Order,
  Coupon,
  Review,
  UserProfile,
  FilterState,
  OrderStatus,
} from "./types";
import {
  INITIAL_PRODUCTS,
  INITIAL_CATEGORIES,
  INITIAL_COUPONS,
  INITIAL_REVIEWS,
} from "./mockData";
import type { PublicCatalogue } from "@/lib/products/public";
import { PRICING, shippingFeeFor } from "@/lib/pricing";
import { validateCouponAction } from "@/app/actions/coupons";
import { getAllOrdersAdminAction } from "@/app/actions/orders";
import { getCurrentUserAction, logoutAction } from "@/app/actions/auth";
import { getMyOrdersAction } from "@/app/actions/my-orders";
import { mapOrderRow } from "@/lib/orders/mapper";
import {
  getMyAddressesAction,
  saveAddressAction,
  setDefaultAddressAction,
  deleteAddressAction,
} from "@/app/actions/addresses";

interface Toast {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

interface AppContextType {
  // Products & Categories
  products: SareeProduct[];
  categories: Category[];
  /** The two admin-selected Featured Festive Drops (empty slots are omitted). */
  featuredDrops: SareeProduct[];
  addCategory: (category: Omit<Category, "id">) => void;
  deleteCategory: (id: string) => void;
  getProductBySlug: (slug: string) => SareeProduct | undefined;
  getProductById: (id: string) => SareeProduct | undefined;

  // Cart
  cart: CartItem[];
  addToCart: (product: SareeProduct, quantity?: number, selectedColor?: string) => void;
  updateCartQuantity: (productId: string, quantity: number, selectedColor?: string) => void;
  removeFromCart: (productId: string, selectedColor?: string) => void;
  clearCart: () => void;
  isCartDrawerOpen: boolean;
  setIsCartDrawerOpen: (open: boolean) => void;
  cartSubtotal: number;
  cartDiscount: number;
  cartTotal: number;
  shippingFee: number;
  freeShippingThreshold: number;
  appliedCoupon: Coupon | null;
  applyCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
  removeCoupon: () => void;
  giftWrap: boolean;
  setGiftWrap: (wrap: boolean) => void;
  giftMessage: string;
  setGiftMessage: (msg: string) => void;
  giftWrapFee: number;
  coupons: Coupon[];
  addCoupon: (coupon: Omit<Coupon, "id">) => void;
  toggleCouponStatus: (id: string) => void;

  // Wishlist
  wishlist: string[]; // product IDs
  toggleWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;

  // Recently Viewed
  recentlyViewed: SareeProduct[];
  addToRecentlyViewed: (product: SareeProduct) => void;

  // Quick View Modal
  quickViewProduct: SareeProduct | null;
  setQuickViewProduct: (product: SareeProduct | null) => void;

  // User Auth & Profiles
  user: UserProfile | null;
  /** False until the first server session check has finished (avoids a signed-out flash on refresh). */
  authReady: boolean;
  login: (email: string, role?: "customer" | "admin", fullName?: string, phone?: string) => void;
  logout: () => void;
  savedAddresses: SavedAddress[];
  /** Saves to the database (one default per customer). Resolves to the saved address, or null on failure. */
  addAddress: (address: Omit<SavedAddress, "id">) => Promise<SavedAddress | null>;
  updateAddress: (id: string, updates: Partial<SavedAddress>) => Promise<void>;
  deleteAddress: (id: string) => Promise<void>;

  // Orders
  orders: Order[];
  /** Reloads the signed-in customer's orders (all orders for admins) from the database. */
  refreshOrders: () => Promise<void>;
  getOrderById: (orderId: string) => Order | undefined;
  getOrderByNumber: (orderNumber: string) => Order | undefined;

  // Reviews
  reviews: Review[];
  addReview: (review: Omit<Review, "id" | "createdAt" | "status">) => void;
  updateReviewStatus: (id: string, status: "approved" | "rejected") => void;

  // Toasts
  toasts: Toast[];
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode; initialCatalogue?: PublicCatalogue | null }> = ({
  children,
  initialCatalogue = null,
}) => {
  // When the database catalogue is available it is the single source of truth for every visitor.
  const databaseCatalogue = initialCatalogue?.products ?? null;
  // State Initialization
  const [products, setProducts] = useState<SareeProduct[]>(databaseCatalogue ?? INITIAL_PRODUCTS);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [coupons, setCoupons] = useState<Coupon[]>(INITIAL_COUPONS);
  const [reviews, setReviews] = useState<Review[]>(INITIAL_REVIEWS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<SareeProduct[]>([]);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState<boolean>(false);
  const [quickViewProduct, setQuickViewProduct] = useState<SareeProduct | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [giftWrap, setGiftWrap] = useState<boolean>(false);
  const [giftMessage, setGiftMessage] = useState<string>("");
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Default User (starts signed out)
  const [user, setUser] = useState<UserProfile | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [authReady, setAuthReady] = useState(false);

  // Obsolete demo product IDs that should never be restored from stale browser storage
  const OBSOLETE_DEMO_IDS = new Set([
    "saree-01",
    "saree-02",
    "saree-03",
    "saree-04",
    "saree-05",
    "saree-06",
    "saree-07",
    "saree-08",
  ]);

  // Carts / wishlists saved before the catalogue moved to the database hold the old starter
  // product ids. Re-point them (by SKU) at the live database products. Idempotent.
  useEffect(() => {
    if (!databaseCatalogue) return;
    const skuByLegacyId = new Map(INITIAL_PRODUCTS.map((p) => [p.id, p.sku]));
    const idBySku = new Map(databaseCatalogue.map((p) => [p.sku, p.id]));
    const remapId = (id: string) => {
      const sku = skuByLegacyId.get(id);
      return (sku && idBySku.get(sku)) || id;
    };

    setWishlist((prev) => {
      const next = Array.from(new Set(prev.map(remapId)));
      return next.length === prev.length && next.every((v, i) => v === prev[i]) ? prev : next;
    });
    setCart((prev) => {
      let changed = false;
      const next = prev.map((item) => {
        const fresh = databaseCatalogue.find((p) => p.sku === item.product.sku);
        if (fresh && fresh.id !== item.product.id) {
          changed = true;
          return { ...item, product: fresh };
        }
        return item;
      });
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wishlist, cart]);

  // Orders are personal data and now live only in the database; scrub any copy left by older versions.
  useEffect(() => {
    try {
      localStorage.removeItem("raveena_orders");
    } catch {}
  }, []);

  // Restore the real server session on every page load (the cookie survives refresh, React state does not)
  useEffect(() => {
    let cancelled = false;
    getCurrentUserAction()
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data?.user) {
          const u = res.data.user;
          setUser({
            id: u.id,
            email: u.email,
            fullName: u.fullName || u.email.split("@")[0],
            phone: u.phone || "",
            role: u.role === "admin" || u.role === "staff" ? "admin" : "customer",
            avatarUrl: u.avatarUrl || undefined,
            joinedDate: "",
          });
        }
      })
      .catch(() => {})
      .finally(() => !cancelled && setAuthReady(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshOrders = async () => {
    if (!user) {
      setOrders([]);
      return;
    }
    if (user.role === "admin") {
      const res = await getAllOrdersAdminAction();
      if (res.success) setOrders(((res as any).data || []).map((row: any) => mapOrderRow(row, { admin: true })));
    } else {
      const res = await getMyOrdersAction();
      if (res.success) setOrders(res.data);
    }
  };

  // Load orders + saved addresses whenever the signed-in user changes
  useEffect(() => {
    if (!user) {
      setOrders([]);
      setSavedAddresses([]);
      return;
    }
    refreshOrders();
    getMyAddressesAction().then((res) => {
      if (res.success) setSavedAddresses(res.data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Load / Persist localStorage
  useEffect(() => {
    try {
      // One-time migration of keys saved under the pre-rename brand prefix, so existing carts/orders/admin products survive
      for (const suffix of ["cart", "wishlist", "recent", "orders", "custom_products", "categories", "coupons", "reviews"]) {
        const legacy = localStorage.getItem(`ravina_${suffix}`);
        if (legacy !== null && localStorage.getItem(`raveena_${suffix}`) === null) {
          localStorage.setItem(`raveena_${suffix}`, legacy);
        }
        localStorage.removeItem(`ravina_${suffix}`);
      }
      const savedCart = localStorage.getItem("raveena_cart");
      if (savedCart) {
        const parsedCart: CartItem[] = JSON.parse(savedCart);
        const cleanCart = parsedCart.filter(
          (item) => item.product && !OBSOLETE_DEMO_IDS.has(item.product.id)
        );
        setCart(cleanCart);
      }

      const savedWishlist = localStorage.getItem("raveena_wishlist");
      if (savedWishlist) {
        const parsedWish: string[] = JSON.parse(savedWishlist);
        setWishlist(parsedWish.filter((id) => !OBSOLETE_DEMO_IDS.has(id)));
      }

      const savedRecently = localStorage.getItem("raveena_recent");
      if (savedRecently) {
        const parsedRecent: SareeProduct[] = JSON.parse(savedRecently);
        setRecentlyViewed(parsedRecent.filter((p) => !OBSOLETE_DEMO_IDS.has(p.id)));
      }

      if (!databaseCatalogue) {
        // Fallback (database not configured / catalogue not imported yet): starter catalogue only.
        // Browser-saved admin products are no longer used; the dashboard now writes to the database.
        setProducts(INITIAL_PRODUCTS);
      }

      const savedCategories = localStorage.getItem("raveena_categories");
      if (savedCategories) {
        try {
          const parsedCats: Category[] = JSON.parse(savedCategories);
          const initialCatMap = new Map(INITIAL_CATEGORIES.map((c) => [c.id, c]));
          const mergedCats = INITIAL_CATEGORIES.map((initCat) => {
            const saved = parsedCats.find((c) => c.id === initCat.id);
            return saved ? { ...initCat, ...saved, imageUrl: initCat.imageUrl, bannerUrl: initCat.bannerUrl } : initCat;
          });
          const customCats = parsedCats.filter((c) => !initialCatMap.has(c.id));
          setCategories([...mergedCats, ...customCats]);
        } catch {
          setCategories(INITIAL_CATEGORIES);
        }
      } else {
        setCategories(INITIAL_CATEGORIES);
      }

      const savedCoupons = localStorage.getItem("raveena_coupons");
      if (savedCoupons) {
        try {
          const parsedCoupons: Coupon[] = JSON.parse(savedCoupons);
          const initialCouponCodes = new Set(INITIAL_COUPONS.map((c) => c.code));
          const customCoupons = parsedCoupons.filter((c) => !initialCouponCodes.has(c.code));
          setCoupons([...INITIAL_COUPONS, ...customCoupons]);
        } catch {
          setCoupons(INITIAL_COUPONS);
        }
      } else {
        setCoupons(INITIAL_COUPONS);
      }

      const savedReviews = localStorage.getItem("raveena_reviews");
      if (savedReviews) {
        try {
          const parsedReviews: Review[] = JSON.parse(savedReviews);
          const initialReviewIds = new Set(INITIAL_REVIEWS.map((r) => r.id));
          const customReviews = parsedReviews.filter((r) => !initialReviewIds.has(r.id));
          setReviews([...INITIAL_REVIEWS, ...customReviews]);
        } catch {
          setReviews(INITIAL_REVIEWS);
        }
      } else {
        setReviews(INITIAL_REVIEWS);
      }
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("raveena_cart", JSON.stringify(cart));
    } catch {}
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem("raveena_wishlist", JSON.stringify(wishlist));
    } catch {}
  }, [wishlist]);

  useEffect(() => {
    try {
      localStorage.setItem("raveena_categories", JSON.stringify(categories));
    } catch {}
  }, [categories]);

  useEffect(() => {
    try {
      localStorage.setItem("raveena_coupons", JSON.stringify(coupons));
    } catch {}
  }, [coupons]);

  useEffect(() => {
    try {
      localStorage.setItem("raveena_reviews", JSON.stringify(reviews));
    } catch {}
  }, [reviews]);

  // Toast System
  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Date.now().toString() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Cart Calculations
  const cartSubtotal = cart.reduce((acc, item) => {
    const effectivePrice = item.product.discountPrice || item.product.price;
    return acc + effectivePrice * item.quantity;
  }, 0);

  const freeShippingThreshold = PRICING.freeShippingThreshold;
  const giftWrapFee = giftWrap ? PRICING.giftWrapFee : 0;

  // Calculate discount from applied coupon
  let cartDiscount = 0;
  if (appliedCoupon && cartSubtotal >= appliedCoupon.minOrderValue) {
    if (appliedCoupon.discountType === "percentage") {
      const computed = (cartSubtotal * appliedCoupon.discountValue) / 100;
      cartDiscount = appliedCoupon.maxDiscount ? Math.min(computed, appliedCoupon.maxDiscount) : computed;
    } else {
      cartDiscount = appliedCoupon.discountValue;
    }
  }

  const shippingFee = shippingFeeFor(cartSubtotal);
  const cartTotal = Math.max(0, cartSubtotal - cartDiscount + shippingFee + giftWrapFee);

  // Cart Operations
  const addToCart = (product: SareeProduct, quantity = 1, selectedColor?: string) => {
    const color = selectedColor || product.primaryColor || product.availableColors[0] || "Default";
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.product.id === product.id && item.selectedColor === color
      );
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += quantity;
        return updated;
      } else {
        return [...prev, { product, quantity, selectedColor: color }];
      }
    });
    showToast(`"${product.name.slice(0, 30)}..." added to your bag`, "success");
    setIsCartDrawerOpen(true);
  };

  const updateCartQuantity = (productId: string, quantity: number, selectedColor?: string) => {
    if (quantity <= 0) {
      removeFromCart(productId, selectedColor);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId && (!selectedColor || item.selectedColor === selectedColor)) {
          return { ...item, quantity };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId: string, selectedColor?: string) => {
    setCart((prev) =>
      prev.filter(
        (item) => !(item.product.id === productId && (!selectedColor || item.selectedColor === selectedColor))
      )
    );
    showToast("Item removed from bag", "info");
  };

  const clearCart = () => {
    setCart([]);
    setAppliedCoupon(null);
    setGiftWrap(false);
  };

  const applyCoupon = async (code: string) => {
    const clean = code.trim().toUpperCase();
    if (!clean) return { success: false, message: "Enter a promo code." };
    // Coupons are validated by the server, which is also what decides the final order total
    const res = await validateCouponAction(clean, cartSubtotal);
    if (!res.success || !res.data) {
      const message = res.error || "Invalid or expired promo code.";
      showToast(message, "error");
      return { success: false, message };
    }
    const d = res.data;
    setAppliedCoupon({
      id: `coupon-${d.code}`,
      code: d.code,
      discountType: d.discountType as "percentage" | "fixed",
      discountValue: d.discountValue,
      minOrderValue: d.minOrderValue,
      maxDiscount: d.maxDiscount,
      description: d.description,
      isActive: true,
      expiresAt: "",
    });
    showToast(`Code "${d.code}" applied`, "success");
    return { success: true, message: `Coupon applied: ${d.description}` };
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    showToast("Promo code removed", "info");
  };

  // Wishlist Operations
  const toggleWishlist = (productId: string) => {
    setWishlist((prev) => {
      const exists = prev.includes(productId);
      if (exists) {
        showToast("Removed from your Royal Wishlist", "info");
        return prev.filter((id) => id !== productId);
      } else {
        showToast("Added to your Royal Wishlist", "success");
        return [...prev, productId];
      }
    });
  };

  const isInWishlist = (productId: string) => wishlist.includes(productId);

  // Recently Viewed
  const addToRecentlyViewed = (product: SareeProduct) => {
    setRecentlyViewed((prev) => {
      const filtered = prev.filter((p) => p.id !== product.id);
      const updated = [product, ...filtered].slice(0, 8);
      try {
        localStorage.setItem("raveena_recent", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Addresses
  const toPayload = (a: Partial<SavedAddress>) => ({
    name: a.name,
    phone: a.phone,
    houseNumber: a.houseNumber || "-",
    streetAddress: a.street,
    locality: a.locality || a.city,
    landmark: a.landmark || undefined,
    city: a.city,
    state: a.state,
    pincode: a.pincode,
    addressType: a.type === "Office" ? "office" : a.type === "Other" ? "other" : "home",
    isDefault: Boolean(a.isDefault),
  });

  const reloadAddresses = async () => {
    const res = await getMyAddressesAction();
    if (res.success) setSavedAddresses(res.data);
  };

  const addAddress = async (address: Omit<SavedAddress, "id">): Promise<SavedAddress | null> => {
    const res = await saveAddressAction(toPayload(address));
    if (!res.success) {
      showToast(res.error, "error");
      return null;
    }
    await reloadAddresses();
    showToast("Address saved", "success");
    return res.data;
  };

  const updateAddress = async (id: string, updates: Partial<SavedAddress>) => {
    if (Object.keys(updates).length === 1 && updates.isDefault) {
      const res = await setDefaultAddressAction(id);
      if (!res.success) showToast(res.error, "error");
      else showToast("Default address updated", "success");
      await reloadAddresses();
      return;
    }
    const current = savedAddresses.find((a) => a.id === id);
    const res = await saveAddressAction(toPayload({ ...current, ...updates }), id);
    if (!res.success) {
      showToast(res.error, "error");
      return;
    }
    await reloadAddresses();
    showToast("Address updated", "success");
  };

  const deleteAddress = async (id: string) => {
    const res = await deleteAddressAction(id);
    if (!res.success) {
      showToast(res.error, "error");
      return;
    }
    await reloadAddresses();
    showToast("Address removed", "info");
  };

  const getOrderById = (orderId: string) => orders.find((o) => o.id === orderId || o.orderNumber === orderId);
  const getOrderByNumber = (num: string) => orders.find((o) => o.orderNumber === num);

  const addCategory = (categoryData: Omit<Category, "id">) => {
    const newCat: Category = {
      ...categoryData,
      id: `cat-${Date.now()}`,
    };
    setCategories((prev) => [...prev, newCat]);
    showToast(`Category "${newCat.name}" added`, "success");
  };

  const deleteCategory = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    showToast("Category removed", "info");
  };

  const featuredDrops = (initialCatalogue?.featuredDropIds ?? [])
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is SareeProduct => Boolean(p))
    .slice(0, 2);

  const getProductBySlug = (slug: string) => products.find((p) => p.slug === slug);
  const getProductById = (id: string) => products.find((p) => p.id === id);

  // Coupons CRUD
  const addCoupon = (couponData: Omit<Coupon, "id">) => {
    const newCoupon: Coupon = {
      ...couponData,
      id: `coup-${Date.now()}`,
    };
    setCoupons((prev) => [newCoupon, ...prev]);
    showToast(`Coupon ${newCoupon.code} created!`, "success");
  };

  const toggleCouponStatus = (id: string) => {
    setCoupons((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isActive: !c.isActive } : c))
    );
    showToast("Coupon status updated", "info");
  };

  // Reviews
  const addReview = (reviewData: Omit<Review, "id" | "createdAt" | "status">) => {
    const newReview: Review = {
      ...reviewData,
      id: `rev-${Date.now()}`,
      status: "approved", // auto approved for instant feedback
      createdAt: new Date().toISOString(),
    };
    setReviews((prev) => [newReview, ...prev]);
    showToast("Thank you for your review! It has been posted.", "success");
  };

  const updateReviewStatus = (id: string, status: "approved" | "rejected") => {
    setReviews((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r))
    );
    showToast(`Review ${status}`, "info");
  };

  // User Auth
  const login = (email: string, role: "customer" | "admin" = "customer", fullName?: string, phone?: string) => {
    // Display-only: the server decides the real role (profiles table)
    const isAdm = role === "admin";
    const formattedName = fullName || (isAdm ? "Raveena Admin" : email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
    setUser({
      id: `session-${email}`,
      email,
      fullName: formattedName,
      phone: phone || "",
      role: isAdm ? "admin" : "customer",
      joinedDate: new Date().toLocaleDateString("en-IN", { month: "short", year: "numeric" }),
    });
    showToast(`Welcome back, ${formattedName}!`, "success");
  };

  const logout = () => {
    setUser(null);
    setOrders([]);
    setSavedAddresses([]);
    // End the real server session too (otherwise the cookie keeps the user signed in)
    logoutAction().catch(() => {});
    showToast("You have been signed out", "info");
  };

  return (
    <AppContext.Provider
      value={{
        products,
        categories,
        featuredDrops,
        addCategory,
        deleteCategory,
        getProductBySlug,
        getProductById,
        cart,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        isCartDrawerOpen,
        setIsCartDrawerOpen,
        cartSubtotal,
        cartDiscount,
        cartTotal,
        shippingFee,
        freeShippingThreshold,
        appliedCoupon,
        applyCoupon,
        removeCoupon,
        giftWrap,
        setGiftWrap,
        giftMessage,
        setGiftMessage,
        giftWrapFee,
        coupons,
        addCoupon,
        toggleCouponStatus,
        wishlist,
        toggleWishlist,
        isInWishlist,
        recentlyViewed,
        addToRecentlyViewed,
        quickViewProduct,
        setQuickViewProduct,
        user,
        login,
        logout,
        authReady,
        savedAddresses,
        addAddress,
        updateAddress,
        deleteAddress,
        orders,
        refreshOrders,
        getOrderById,
        getOrderByNumber,
        reviews,
        addReview,
        updateReviewStatus,
        toasts,
        showToast,
        removeToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
