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
import { generateOrderNumber, generateTrackingNumber, getEstimatedDeliveryDate } from "./utils";
import { createProductAction, updateProductAction, deleteProductAction, getProductsAction } from "@/app/actions/products";
import { updateOrderStatusAction } from "@/app/actions/orders";

interface Toast {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

interface AppContextType {
  // Products & Categories
  products: SareeProduct[];
  categories: Category[];
  addProduct: (product: Omit<SareeProduct, "id" | "createdAt">) => void;
  updateProduct: (id: string, updates: Partial<SareeProduct>) => void;
  deleteProduct: (id: string) => void;
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
  freeShippingThreshold: number;
  appliedCoupon: Coupon | null;
  applyCoupon: (code: string) => { success: boolean; message: string };
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
  login: (email: string, role?: "customer" | "admin", fullName?: string, phone?: string) => void;
  logout: () => void;
  savedAddresses: SavedAddress[];
  addAddress: (address: Omit<SavedAddress, "id">) => SavedAddress;
  updateAddress: (id: string, updates: Partial<SavedAddress>) => void;
  deleteAddress: (id: string) => void;

  // Orders
  orders: Order[];
  placeOrder: (orderDetails: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    shippingAddress: SavedAddress;
    paymentMethod: "razorpay" | "upi" | "card" | "netbanking" | "cod";
    paymentId?: string;
  }) => Order;
  updateOrderStatus: (orderId: string, status: OrderStatus, trackingNumber?: string, courierPartner?: string) => void;
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

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // State Initialization
  const [products, setProducts] = useState<SareeProduct[]>(INITIAL_PRODUCTS);
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

  // Load / Persist localStorage
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("ravina_cart");
      if (savedCart) {
        const parsedCart: CartItem[] = JSON.parse(savedCart);
        const cleanCart = parsedCart.filter(
          (item) => item.product && !OBSOLETE_DEMO_IDS.has(item.product.id)
        );
        setCart(cleanCart);
      }

      const savedWishlist = localStorage.getItem("ravina_wishlist");
      if (savedWishlist) {
        const parsedWish: string[] = JSON.parse(savedWishlist);
        setWishlist(parsedWish.filter((id) => !OBSOLETE_DEMO_IDS.has(id)));
      }

      const savedRecently = localStorage.getItem("ravina_recent");
      if (savedRecently) {
        const parsedRecent: SareeProduct[] = JSON.parse(savedRecently);
        setRecentlyViewed(parsedRecent.filter((p) => !OBSOLETE_DEMO_IDS.has(p.id)));
      }

      const savedOrders = localStorage.getItem("ravina_orders");
      if (savedOrders) {
        const parsedOrders: Order[] = JSON.parse(savedOrders);
        const cleanOrders = parsedOrders.map((o) => ({
          ...o,
          items: o.items.filter((item) => !OBSOLETE_DEMO_IDS.has(item.productId)),
        })).filter((o) => o.items.length > 0);
        if (cleanOrders.length > 0) {
          setOrders(cleanOrders);
        }
      }

      const customProducts = localStorage.getItem("ravina_custom_products");
      if (customProducts) {
        const parsed: SareeProduct[] = JSON.parse(customProducts);
        const initialIds = new Set(INITIAL_PRODUCTS.map((p) => p.id));
        // Keep only valid admin-added products, filtering out obsolete demo products
        const customOnly = parsed.filter(
          (p) => !initialIds.has(p.id) && !OBSOLETE_DEMO_IDS.has(p.id)
        );
        const merged = [...INITIAL_PRODUCTS, ...customOnly];
        setProducts(merged);
        // Clean localStorage of stale products
        localStorage.setItem("ravina_custom_products", JSON.stringify(merged));
      } else {
        setProducts(INITIAL_PRODUCTS);
      }

      const savedCategories = localStorage.getItem("ravina_categories");
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

      const savedCoupons = localStorage.getItem("ravina_coupons");
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

      const savedReviews = localStorage.getItem("ravina_reviews");
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
      localStorage.setItem("ravina_cart", JSON.stringify(cart));
    } catch {}
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem("ravina_wishlist", JSON.stringify(wishlist));
    } catch {}
  }, [wishlist]);

  useEffect(() => {
    try {
      localStorage.setItem("ravina_orders", JSON.stringify(orders));
    } catch {}
  }, [orders]);

  useEffect(() => {
    try {
      localStorage.setItem("ravina_categories", JSON.stringify(categories));
    } catch {}
  }, [categories]);

  useEffect(() => {
    try {
      localStorage.setItem("ravina_coupons", JSON.stringify(coupons));
    } catch {}
  }, [coupons]);

  useEffect(() => {
    try {
      localStorage.setItem("ravina_reviews", JSON.stringify(reviews));
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

  const freeShippingThreshold = 2500;
  const giftWrapFee = giftWrap ? 150 : 0;

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

  const shippingFee = cartSubtotal >= freeShippingThreshold || cartSubtotal === 0 ? 0 : 150;
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

  const applyCoupon = (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    const found = coupons.find((c) => c.code.toUpperCase() === cleanCode && c.isActive);
    if (!found) {
      showToast("Invalid or expired promo code", "error");
      return { success: false, message: "Invalid promo code." };
    }
    if (cartSubtotal < found.minOrderValue) {
      showToast(`Requires minimum order of ₹${found.minOrderValue.toLocaleString("en-IN")}`, "error");
      return {
        success: false,
        message: `Add items worth ₹${(found.minOrderValue - cartSubtotal).toLocaleString("en-IN")} more to use this code.`,
      };
    }
    setAppliedCoupon(found);
    showToast(`Code "${found.code}" applied! You saved on this order.`, "success");
    return { success: true, message: `Coupon applied: ${found.description}` };
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
        localStorage.setItem("ravina_recent", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Addresses
  const addAddress = (address: Omit<SavedAddress, "id">): SavedAddress => {
    const newAddress: SavedAddress = {
      ...address,
      id: `addr-${Date.now()}`,
    };
    if (newAddress.isDefault) {
      setSavedAddresses((prev) => [...prev.map((a) => ({ ...a, isDefault: false })), newAddress]);
    } else {
      setSavedAddresses((prev) => [...prev, newAddress]);
    }
    showToast("Address saved successfully", "success");
    return newAddress;
  };

  const updateAddress = (id: string, updates: Partial<SavedAddress>) => {
    setSavedAddresses((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          return { ...a, ...updates };
        }
        if (updates.isDefault) {
          return { ...a, isDefault: false };
        }
        return a;
      })
    );
    showToast("Address updated", "success");
  };

  const deleteAddress = (id: string) => {
    setSavedAddresses((prev) => prev.filter((a) => a.id !== id));
    showToast("Address removed", "info");
  };

  // Orders
  const placeOrder = (orderDetails: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    shippingAddress: SavedAddress;
    paymentMethod: "razorpay" | "upi" | "card" | "netbanking" | "cod";
    paymentId?: string;
  }): Order => {
    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber: generateOrderNumber(),
      userId: user?.id,
      customerName: orderDetails.customerName,
      customerEmail: orderDetails.customerEmail,
      customerPhone: orderDetails.customerPhone,
      shippingAddress: orderDetails.shippingAddress,
      items: cart.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        sku: item.product.sku,
        selectedColor: item.selectedColor,
        price: item.product.discountPrice || item.product.price,
        quantity: item.quantity,
        imageUrl: item.product.images[0] || "",
      })),
      subtotal: cartSubtotal,
      discountAmount: cartDiscount,
      shippingFee,
      giftWrapFee,
      totalAmount: cartTotal,
      paymentMethod: orderDetails.paymentMethod,
      paymentStatus: orderDetails.paymentMethod === "cod" ? "pending" : "paid",
      paymentId: orderDetails.paymentId || `pay_${Date.now()}`,
      orderStatus: "confirmed",
      courierPartner: "BlueDart Express",
      trackingNumber: generateTrackingNumber(),
      trackingUrl: "https://www.bluedart.com/tracking",
      giftWrap,
      giftMessage: giftWrap ? giftMessage : undefined,
      appliedCoupon: appliedCoupon?.code,
      createdAt: new Date().toISOString(),
      estimatedDelivery: getEstimatedDeliveryDate(4),
    };

    setOrders((prev) => [newOrder, ...prev]);
    clearCart();
    return newOrder;
  };

  const updateOrderStatus = (
    orderId: string,
    status: OrderStatus,
    trackingNumber?: string,
    courierPartner?: string
  ) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId || o.orderNumber === orderId) {
          return {
            ...o,
            orderStatus: status,
            trackingNumber: trackingNumber || o.trackingNumber,
            courierPartner: courierPartner || o.courierPartner,
          };
        }
        return o;
      })
    );
    updateOrderStatusAction(orderId, status, trackingNumber).catch(() => {});
    showToast(`Order status updated to ${status.replace("_", " ").toUpperCase()}`, "success");
  };

  const getOrderById = (orderId: string) => orders.find((o) => o.id === orderId || o.orderNumber === orderId);
  const getOrderByNumber = (num: string) => orders.find((o) => o.orderNumber === num);

  // Products CRUD for Admin
  const addProduct = (productData: Omit<SareeProduct, "id" | "createdAt">) => {
    const newProduct: SareeProduct = {
      ...productData,
      id: `saree-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [newProduct, ...products];
    setProducts(updated);
    try {
      localStorage.setItem("ravina_custom_products", JSON.stringify(updated));
    } catch {}
    
    // Background Server Sync
    createProductAction({
      sku: newProduct.sku,
      name: newProduct.name,
      slug: newProduct.slug,
      categoryName: (newProduct as any).categoryName || (newProduct as any).category || "Silk Sarees",
      description: newProduct.description,
      price: newProduct.price,
      discountPrice: newProduct.discountPrice,
      stock: newProduct.stock,
      fabric: newProduct.fabric,
      zariType: newProduct.zariType,
      weaveType: newProduct.weaveType,
      sareeLength: newProduct.sareeLength,
      blouseIncluded: newProduct.blouseIncluded,
      blouseLength: newProduct.blouseLength,
      occasion: newProduct.occasion,
      careInstructions: newProduct.careInstructions,
      availableColors: newProduct.availableColors,
      primaryColor: newProduct.primaryColor,
      images: newProduct.images,
      rating: newProduct.rating,
      reviewCount: newProduct.reviewCount,
      isFeatured: Boolean(newProduct.isFeatured),
      isBestseller: Boolean(newProduct.isBestseller),
      isNewArrival: Boolean(newProduct.isNewArrival),
      isActive: true,
    }).catch(() => {});

    showToast(`Product "${newProduct.name}" created!`, "success");
  };

  const updateProduct = (id: string, updates: Partial<SareeProduct>) => {
    const updated = products.map((p) => (p.id === id ? { ...p, ...updates } : p));
    setProducts(updated);
    try {
      localStorage.setItem("ravina_custom_products", JSON.stringify(updated));
    } catch {}

    // Background Server Sync
    updateProductAction(id, {
      ...(updates.name && { name: updates.name }),
      ...(updates.price !== undefined && { price: updates.price }),
      ...(updates.discountPrice !== undefined && { discountPrice: updates.discountPrice }),
      ...(updates.stock !== undefined && { stock: updates.stock }),
      ...(updates.fabric && { fabric: updates.fabric }),
      ...(updates.description && { description: updates.description }),
      ...(updates.images && { images: updates.images }),
      ...(((updates as any).categoryName || (updates as any).category) && { categoryName: (updates as any).categoryName || (updates as any).category }),
      ...(updates.isFeatured !== undefined && { isFeatured: updates.isFeatured }),
      ...(updates.isBestseller !== undefined && { isBestseller: updates.isBestseller }),
      ...(updates.isNewArrival !== undefined && { isNewArrival: updates.isNewArrival }),
    }).catch(() => {});

    showToast("Product updated successfully", "success");
  };

  const deleteProduct = (id: string) => {
    const updated = products.filter((p) => p.id !== id);
    setProducts(updated);
    try {
      localStorage.setItem("ravina_custom_products", JSON.stringify(updated));
    } catch {}

    // Background Server Sync
    deleteProductAction(id).catch(() => {});

    showToast("Product deleted", "info");
  };

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
    const isAdm = role === "admin" || email.includes("admin");
    const formattedName = fullName || (isAdm ? "Store Administrator" : email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
    setUser({
      id: isAdm ? "usr-admin-001" : `usr-${Date.now()}`,
      email,
      fullName: formattedName,
      phone: phone || "",
      role: isAdm ? "admin" : "customer",
      joinedDate: new Date().toLocaleDateString("en-IN", { month: "short", year: "numeric" }),
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(formattedName)}&background=C8A24D&color=fff`,
    });
    showToast(`Welcome back, ${formattedName}!`, "success");
  };

  const logout = () => {
    setUser(null);
    showToast("You have been signed out", "info");
  };

  return (
    <AppContext.Provider
      value={{
        products,
        categories,
        addProduct,
        updateProduct,
        deleteProduct,
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
        savedAddresses,
        addAddress,
        updateAddress,
        deleteAddress,
        orders,
        placeOrder,
        updateOrderStatus,
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
