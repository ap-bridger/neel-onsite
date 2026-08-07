import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export interface ReviewTransactionCategoryInput {
  category: string;
  amount: number;
}

export interface ReviewTransactionInput {
  categories?: ReviewTransactionCategoryInput[];
  reason?: string;
  vendor?: string;
  payerTransactionId?: number;
}

export class ReviewTransactionError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const reviewTransaction = async (
  transactionId: number,
  input: ReviewTransactionInput
) => {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });

  if (!transaction) {
    throw new ReviewTransactionError(404, "Transaction not found");
  }

  const { clientId } = transaction;
  const data: Prisma.TransactionUpdateInput = {};

  if (input.reason !== undefined) {
    data.updateReason = input.reason;
  }

  if (input.vendor !== undefined) {
    const existingVendor = await prisma.vendor.findFirst({
      where: { clientId, name: input.vendor },
    });

    if (existingVendor) {
      data.reviewerVendor = { connect: { id: existingVendor.id } };
      data.reviewerNewVendorName = null;
    } else {
      data.reviewerVendor = { disconnect: true };
      data.reviewerNewVendorName = input.vendor;
    }
  }

  if (input.payerTransactionId !== undefined) {
    if (input.payerTransactionId === transactionId) {
      throw new ReviewTransactionError(
        400,
        "payer_transaction_id cannot reference the transaction itself"
      );
    }

    const payerTransaction = await prisma.transaction.findFirst({
      where: { id: input.payerTransactionId, clientId },
    });

    if (!payerTransaction) {
      throw new ReviewTransactionError(
        400,
        "payer_transaction_id does not reference a valid transaction for this client"
      );
    }

    data.reviewerPairTransaction = { connect: { id: payerTransaction.id } };
  }

  try {
    return await prisma.$transaction(async (tx) => {
      if (input.categories !== undefined) {
        await tx.transactionCategory.deleteMany({
          where: { reviewerTransactionId: transactionId },
        });

        for (const { category, amount } of input.categories) {
          const categoryRecord = await tx.category.upsert({
            where: { clientId_name: { clientId, name: category } },
            create: { clientId, name: category },
            update: {},
          });

          await tx.transactionCategory.create({
            data: {
              clientId,
              categoryId: categoryRecord.id,
              amount,
              reviewerTransactionId: transactionId,
            },
          });
        }
      }

      return tx.transaction.update({
        where: { id: transactionId },
        data,
        include: {
          reviewerCategories: { include: { category: true } },
          reviewerVendor: true,
          reviewerPairTransaction: true,
        },
      });
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ReviewTransactionError(
        409,
        "payer_transaction_id is already paired with another transaction"
      );
    }
    throw error;
  }
};
