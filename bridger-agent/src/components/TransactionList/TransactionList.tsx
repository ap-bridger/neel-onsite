import { ReviewModal } from "@/components/ReviewModal/ReviewModal";
import { useLazyQuery } from "@apollo/client";
import { FormEvent, useMemo, useState } from "react";
import {
  TRANSACTIONS,
  TransactionCategory,
  TransactionListItem,
  TransactionsData,
  TransactionsVariables,
  approveTransaction,
} from "./TransactionList.api";

const PAGE_SIZE = 25;
const NEEDS_REVIEW = "needs_review";

const currencyFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const dateFormat = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const STATUS_LABELS: Record<string, string> = {
  needs_review: "Needs review",
  reviewed: "Reviewed",
  pending: "Pending",
  missing_info: "Missing info",
};

const STATUS_STYLES: Record<string, string> = {
  needs_review: "bg-amber-100 text-amber-900",
  reviewed: "bg-emerald-100 text-emerald-900",
  pending: "bg-slate-200 text-slate-900",
  missing_info: "bg-rose-100 text-rose-900",
};

export const sortNeedsReviewFirst = (transactions: TransactionListItem[]) =>
  [...transactions].sort((a, b) => {
    const aNeedsReview = a.status === NEEDS_REVIEW;
    const bNeedsReview = b.status === NEEDS_REVIEW;
    if (aNeedsReview !== bNeedsReview) {
      return aNeedsReview ? -1 : 1;
    }
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

const StatusBadge = ({ status }: { status: string }) => (
  <span
    className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
      STATUS_STYLES[status] ?? "bg-slate-200 text-slate-900"
    }`}
  >
    {STATUS_LABELS[status] ?? status}
  </span>
);

const CategoryCell = ({ categories }: { categories: TransactionCategory[] }) => {
  if (categories.length === 0) {
    return <span className="italic opacity-50">Uncategorized</span>;
  }

  return (
    <ul className="flex flex-col gap-0.5">
      {categories.map((entry) => (
        <li key={entry.id}>
          {entry.category.name}
          {categories.length > 1 && (
            <span className="ml-2 text-xs opacity-60">
              {currencyFormat.format(entry.amount)}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
};

export const TransactionList = () => {
  const [clientIdInput, setClientIdInput] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [runQuery, { data, loading, error, called, refetch }] = useLazyQuery<
    TransactionsData,
    TransactionsVariables
  >(TRANSACTIONS);

  const transactions = useMemo(
    () => sortNeedsReviewFirst(data?.transactions ?? []),
    [data]
  );

  const pageCount = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE));
  // The result set shrinks when a smaller client is loaded, so clamp rather than trust state.
  const currentPage = Math.min(page, pageCount - 1);
  const pageStart = currentPage * PAGE_SIZE;
  const visibleTransactions = transactions.slice(pageStart, pageStart + PAGE_SIZE);

  const needsReviewCount = transactions.filter(
    (transaction) => transaction.status === NEEDS_REVIEW
  ).length;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const clientId = Number(clientIdInput.trim());

    if (!clientIdInput.trim() || !Number.isInteger(clientId) || clientId <= 0) {
      setInputError("Enter a positive whole number for the client id");
      return;
    }

    setInputError(null);
    setActionError(null);
    setPage(0);
    runQuery({ variables: { clientId } });
  };

  const onApprove = async (transactionId: number) => {
    setActionError(null);
    setApprovingId(transactionId);
    try {
      await approveTransaction(transactionId);
      await refetch();
    } catch (approveError) {
      setActionError(
        approveError instanceof Error
          ? approveError.message
          : "Could not approve the transaction."
      );
    } finally {
      setApprovingId(null);
    }
  };

  const onReviewed = async () => {
    setReviewingId(null);
    setActionError(null);
    await refetch();
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Client id</span>
          <input
            type="number"
            min={1}
            step={1}
            value={clientIdInput}
            onChange={(event) => setClientIdInput(event.target.value)}
            placeholder="e.g. 1"
            className="w-40 rounded border border-black/20 bg-transparent px-3 py-2 dark:border-white/25"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
        >
          {loading ? "Loading..." : "Load transactions"}
        </button>
      </form>

      {inputError && <p className="text-sm text-rose-600">{inputError}</p>}
      {error && (
        <p className="text-sm text-rose-600">
          Could not load transactions: {error.message}
        </p>
      )}

      {actionError && <p className="text-sm text-rose-600">{actionError}</p>}

      {called && !loading && !error && transactions.length === 0 && (
        <p className="text-sm opacity-70">No transactions found for this client.</p>
      )}

      {transactions.length > 0 && (
        <>
          <p className="text-sm opacity-70">
            {transactions.length} transactions, {needsReviewCount} needing review.
          </p>

          <div className="overflow-x-auto rounded border border-black/10 dark:border-white/15">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-black/5 dark:bg-white/10">
                <tr>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 text-right font-medium">Amount</th>
                  <th className="px-4 py-2 font-medium">LLM category</th>
                  <th className="px-4 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleTransactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="border-t border-black/10 align-top dark:border-white/15"
                  >
                    <td className="px-4 py-2">
                      <StatusBadge status={transaction.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-2">
                      {dateFormat.format(new Date(transaction.date))}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">
                      {currencyFormat.format(transaction.totalAmount)}
                    </td>
                    <td className="px-4 py-2">
                      <CategoryCell categories={transaction.llmCategories} />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onApprove(transaction.id)}
                          disabled={
                            transaction.status !== NEEDS_REVIEW ||
                            approvingId !== null
                          }
                          title={
                            transaction.status === NEEDS_REVIEW
                              ? undefined
                              : "Only transactions needing review can be approved"
                          }
                          className="whitespace-nowrap rounded bg-foreground px-3 py-1 text-xs font-medium text-background disabled:opacity-40"
                        >
                          {approvingId === transaction.id
                            ? "Approving..."
                            : "Approve"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setReviewingId(transaction.id)}
                          className="whitespace-nowrap rounded border border-black/20 px-3 py-1 text-xs font-medium dark:border-white/25"
                        >
                          Review
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <button
              type="button"
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage === 0}
              className="rounded border border-black/20 px-3 py-1 disabled:opacity-40 dark:border-white/25"
            >
              Previous
            </button>
            <span className="opacity-70">
              Page {currentPage + 1} of {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage >= pageCount - 1}
              className="rounded border border-black/20 px-3 py-1 disabled:opacity-40 dark:border-white/25"
            >
              Next
            </button>
          </div>
        </>
      )}

      {reviewingId !== null && (
        <ReviewModal
          transactionId={reviewingId}
          onClose={() => setReviewingId(null)}
          onReviewed={onReviewed}
        />
      )}
    </div>
  );
};
