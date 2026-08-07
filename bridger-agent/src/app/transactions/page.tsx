"use client";

import { apolloClient } from "@/client/graphql/apollo-client";
import { TransactionList } from "@/components/TransactionList/TransactionList";
import { ApolloProvider } from "@apollo/client";

export default function TransactionsPage() {
  return (
    <ApolloProvider client={apolloClient}>
      <div className="min-h-screen p-8 sm:p-20 font-[family-name:var(--font-geist-sans)]">
        <main className="mx-auto flex max-w-5xl flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold">Transactions</h1>
            <p className="text-sm opacity-70">
              Enter a client id to load their transactions. Anything needing
              review is listed first.
            </p>
          </div>
          <TransactionList />
        </main>
      </div>
    </ApolloProvider>
  );
}
