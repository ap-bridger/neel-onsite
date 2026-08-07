import { approveTransaction } from "@/server/modules/transactions/approve";
import { ReviewTransactionError } from "@/server/modules/transactions/review";
import { NextRequest, NextResponse } from "next/server";

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

  try {
    const transaction = await approveTransaction(transactionId);
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
