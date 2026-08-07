import { prisma } from "@/lib/db";
import { ReviewTransactionError } from "./review";
import { TRANSACTION_STATUS } from "./status";

export const approveTransaction = async (transactionId: number) => {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });

  if (!transaction) {
    throw new ReviewTransactionError(404, "Transaction not found");
  }

  if (transaction.status !== TRANSACTION_STATUS.needsReview) {
    throw new ReviewTransactionError(
      409,
      `Only a transaction with status '${TRANSACTION_STATUS.needsReview}' can be approved, but this transaction has status '${transaction.status}'`
    );
  }

  return prisma.transaction.update({
    where: { id: transactionId },
    data: { status: TRANSACTION_STATUS.reviewed },
    include: {
      reviewerCategories: { include: { category: true } },
      reviewerVendor: true,
      reviewerPairTransaction: true,
    },
  });
};
