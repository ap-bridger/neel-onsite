import {
    ReviewTransactionCategoryInput,
    ReviewTransactionError,
    ReviewTransactionInput,
    reviewTransaction,
  } from "@/server/modules/transactions/review";
  import { NextRequest, NextResponse } from "next/server";
  
  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);
  
  const parseCategories = (
    value: unknown
  ): ReviewTransactionCategoryInput[] | { error: string } => {
    if (!Array.isArray(value)) {
      return { error: "'categories' must be an array" };
    }
  
    const categories: ReviewTransactionCategoryInput[] = [];
    for (const entry of value) {
      if (
        !isRecord(entry) ||
        typeof entry.category !== "string" ||
        typeof entry.amount !== "number" ||
        !Number.isFinite(entry.amount)
      ) {
        return {
          error:
            "each entry in 'categories' must be an object with a string 'category' and numeric 'amount'",
        };
      }
      categories.push({ category: entry.category, amount: entry.amount });
    }
  
    return categories;
  };
  
  const parseBody = (
    body: unknown
  ): ReviewTransactionInput | { error: string } => {
    if (!isRecord(body)) {
      return { error: "Request body must be a JSON object" };
    }
  
    const input: ReviewTransactionInput = {};
  
    if (body.categories !== undefined) {
      const categories = parseCategories(body.categories);
      if ("error" in categories) {
        return categories;
      }
      input.categories = categories;
    }
  
    if (body.reason !== undefined) {
      if (typeof body.reason !== "string") {
        return { error: "'reason' must be a string" };
      }
      input.reason = body.reason;
    }
  
    if (body.vendor !== undefined) {
      if (typeof body.vendor !== "string") {
        return { error: "'vendor' must be a string" };
      }
      input.vendor = body.vendor;
    }
  
    if (body.payer_transaction_id !== undefined) {
      if (
        typeof body.payer_transaction_id !== "number" ||
        !Number.isInteger(body.payer_transaction_id)
      ) {
        return { error: "'payer_transaction_id' must be an integer" };
      }
      input.payerTransactionId = body.payer_transaction_id;
    }
  
    return input;
  };
  
  export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    const { id } = await params;
    const transactionId = Number(id);
  
    if (!Number.isInteger(transactionId)) {
      return NextResponse.json(
        { error: "Transaction id must be an integer" },
        { status: 400 }
      );
    }
  
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Request body must be valid JSON" },
        { status: 400 }
      );
    }
  
    const input = parseBody(body);
    if ("error" in input) {
      return NextResponse.json({ error: input.error }, { status: 400 });
    }
  
    try {
      const transaction = await reviewTransaction(transactionId, input);
      return NextResponse.json(transaction, { status: 200 });
    } catch (error) {
      if (error instanceof ReviewTransactionError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.status }
        );
      }
      throw error;
    }
  }