import { NextRequest, NextResponse } from "next/server";
import { getProductsAction } from "@/app/actions/products";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || undefined;
    const occasion = searchParams.get("occasion") || undefined;
    const sort = searchParams.get("sort") || undefined;
    const search = searchParams.get("search") || undefined;

    const result = await getProductsAction({ category, occasion, sort, search });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch products" }, { status: 500 });
  }
}
