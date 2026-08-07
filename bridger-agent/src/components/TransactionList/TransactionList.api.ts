import { postJson } from "@/client/rest/post-json";
import { gql } from "@apollo/client";

export const TRANSACTIONS = gql(`
query Transactions($clientId: Int!) {
    transactions(clientId: $clientId) {
        id
        date
        totalAmount
        status
        llmCategories {
            id
            amount
            category {
                id
                name
            }
        }
    }
}
`);

export type TransactionCategory = {
  id: number;
  amount: number;
  category: {
    id: number;
    name: string;
  };
};

export type TransactionListItem = {
  id: number;
  date: string;
  totalAmount: number;
  status: string;
  llmCategories: TransactionCategory[];
};

export type TransactionsData = {
  transactions: TransactionListItem[];
};

export type TransactionsVariables = {
  clientId: number;
};

export const approveTransaction = (transactionId: number) =>
  postJson(`/api/approveTransaction/${transactionId}`);
