import { postJson } from "@/client/rest/post-json";

export type ReviewCategoryInput = {
  category: string;
  amount: number;
};

export type ReviewTransactionInput = {
  categories?: ReviewCategoryInput[];
  vendor?: string;
  reason?: string;
};

export const reviewTransaction = (
  transactionId: number,
  input: ReviewTransactionInput
) => postJson(`/api/reviewTransaction/${transactionId}`, input);
