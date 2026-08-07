import { prisma } from "@/lib/db";
import { GraphQLError } from "graphql";

export type TransactionsArgs = {
  clientId: number;
  startDate?: string | null;
  endDate?: string | null;
};

// Everything a categorizer needs to judge a transaction: the account it landed
// in, the vendor guess (existing or newly proposed), and the category splits
// with their per-category amounts, on both the llm and reviewer sides.
const transactionInclude = {
  account: true,
  llmVendor: true,
  reviewerVendor: true,
  llmCategories: { include: { category: true } },
  reviewerCategories: { include: { category: true } },
  llmPairTransaction: true,
  reviewerPairTransaction: true,
} as const;

const parseDate = (value: string, field: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new GraphQLError(`Invalid ${field}: expected an ISO-8601 date string`);
  }
  return date;
};

export const transactions = async (
  _parent: unknown,
  { clientId, startDate, endDate }: TransactionsArgs
) => {
  const gte = startDate ? parseDate(startDate, "startDate") : undefined;
  const lte = endDate ? parseDate(endDate, "endDate") : undefined;

  if (gte && lte && gte > lte) {
    throw new GraphQLError("startDate must be on or before endDate");
  }

  return prisma.transaction.findMany({
    where: {
      clientId,
      ...(gte || lte
        ? { date: { ...(gte && { gte }), ...(lte && { lte }) } }
        : {}),
    },
    include: transactionInclude,
    orderBy: [{ date: "asc" }, { id: "asc" }],
  });
};

export const transactionResolvers = {
  date: (transaction: { date: Date }) => transaction.date.toISOString(),
};
