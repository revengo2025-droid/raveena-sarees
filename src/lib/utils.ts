import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function calculateDiscountPercentage(price: number, discountPrice?: number): number {
  if (!discountPrice || discountPrice >= price) return 0;
  return Math.round(((price - discountPrice) / price) * 100);
}

export function generateOrderNumber(): string {
  const random = Math.floor(100000 + Math.random() * 900000);
  return `RVN-${new Date().getFullYear()}-${random}`;
}

export function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
}

export function getEstimatedDeliveryDate(daysToAdd: number = 4): string {
  const target = new Date();
  target.setDate(target.getDate() + daysToAdd);
  return target.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function validateIndianPincode(pincode: string): { isValid: boolean; city?: string; state?: string; deliveryDays?: number } {
  const clean = pincode.trim();
  if (!/^[1-9][0-9]{5}$/.test(clean)) {
    return { isValid: false };
  }

  // Hyderabad PIN range check
  if (clean.startsWith("500") || clean.startsWith("501") || clean.startsWith("502")) {
    return {
      isValid: true,
      city: "Hyderabad / Secunderabad",
      state: "Telangana",
      deliveryDays: 1, // Same / Next Day Delivery
    };
  }

  // Metros
  if (clean.startsWith("560")) return { isValid: true, city: "Bengaluru", state: "Karnataka", deliveryDays: 2 };
  if (clean.startsWith("600")) return { isValid: true, city: "Chennai", state: "Tamil Nadu", deliveryDays: 2 };
  if (clean.startsWith("400")) return { isValid: true, city: "Mumbai", state: "Maharashtra", deliveryDays: 3 };
  if (clean.startsWith("110")) return { isValid: true, city: "New Delhi", state: "Delhi", deliveryDays: 3 };
  if (clean.startsWith("700")) return { isValid: true, city: "Kolkata", state: "West Bengal", deliveryDays: 3 };

  // Rest of India
  return {
    isValid: true,
    city: "India",
    state: "Verified Zone",
    deliveryDays: 4,
  };
}
