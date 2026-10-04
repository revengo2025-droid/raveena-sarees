import { NextRequest, NextResponse } from "next/server";
import { createOrderAction } from "@/app/actions/orders";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await createOrderAction(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create order" }, { status: 500 });
  }
}
