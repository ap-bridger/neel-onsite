import { FormEvent, useEffect, useRef, useState } from "react";
import { ReviewTransactionInput, reviewTransaction } from "./ReviewModal.api";

type CategoryRow = {
  key: number;
  category: string;
  amount: string;
};

type ReviewModalProps = {
  transactionId: number;
  onClose: () => void;
  onReviewed: () => void;
};

const emptyRow = (key: number): CategoryRow => ({ key, category: "", amount: "" });

const buildInput = (
  rows: CategoryRow[],
  vendor: string,
  reason: string
): ReviewTransactionInput | { error: string } => {
  const input: ReviewTransactionInput = {};

  // Every field is optional, and an omitted key leaves that part of the review
  // untouched. Sending `categories: []` would instead clear existing splits.
  const touchedRows = rows.filter(
    (row) => row.category.trim() !== "" || row.amount.trim() !== ""
  );

  if (touchedRows.length > 0) {
    const categories = [];
    for (const row of touchedRows) {
      const category = row.category.trim();
      const amount = Number(row.amount);

      if (!category) {
        return { error: "Every category row needs a name." };
      }
      if (row.amount.trim() === "" || !Number.isFinite(amount)) {
        return { error: `Enter a numeric amount for "${category}".` };
      }

      categories.push({ category, amount });
    }
    input.categories = categories;
  }

  if (vendor.trim()) {
    input.vendor = vendor.trim();
  }
  if (reason.trim()) {
    input.reason = reason.trim();
  }

  return input;
};

export const ReviewModal = ({
  transactionId,
  onClose,
  onReviewed,
}: ReviewModalProps) => {
  const [rows, setRows] = useState<CategoryRow[]>([emptyRow(0)]);
  const [vendor, setVendor] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const nextRowKey = useRef(1);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const updateRow = (key: number, patch: Partial<CategoryRow>) =>
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row))
    );

  const addRow = () =>
    setRows((current) => [...current, emptyRow(nextRowKey.current++)]);

  const removeRow = (key: number) =>
    setRows((current) =>
      current.length === 1
        ? [emptyRow(nextRowKey.current++)]
        : current.filter((row) => row.key !== key)
    );

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const input = buildInput(rows, vendor, reason);
    if ("error" in input) {
      setError(input.error);
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await reviewTransaction(transactionId, input);
      onReviewed();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not submit the review."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-modal-title"
        onClick={(event) => event.stopPropagation()}
        className="max-h-full w-full max-w-lg overflow-y-auto rounded-lg bg-background p-6 shadow-xl"
      >
        <h2 id="review-modal-title" className="text-lg font-semibold">
          Review transaction #{transactionId}
        </h2>
        <p className="mt-1 text-sm opacity-70">
          Every field is optional. Anything left blank is kept as-is.
        </p>

        <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-5">
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium">Categories</legend>
            {rows.map((row) => (
              <div key={row.key} className="flex items-center gap-2">
                <input
                  value={row.category}
                  onChange={(event) =>
                    updateRow(row.key, { category: event.target.value })
                  }
                  placeholder="Category"
                  aria-label="Category"
                  className="min-w-0 flex-1 rounded border border-black/20 bg-transparent px-3 py-2 text-sm dark:border-white/25"
                />
                <input
                  type="number"
                  step="0.01"
                  value={row.amount}
                  onChange={(event) =>
                    updateRow(row.key, { amount: event.target.value })
                  }
                  placeholder="Amount"
                  aria-label="Amount"
                  className="w-32 rounded border border-black/20 bg-transparent px-3 py-2 text-sm dark:border-white/25"
                />
                <button
                  type="button"
                  onClick={() => removeRow(row.key)}
                  aria-label="Remove category"
                  className="rounded border border-black/20 px-2 py-2 text-sm leading-none opacity-70 hover:opacity-100 dark:border-white/25"
                >
                  &times;
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addRow}
              className="self-start text-sm underline opacity-80 hover:opacity-100"
            >
              Add category
            </button>
          </fieldset>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Vendor</span>
            <input
              value={vendor}
              onChange={(event) => setVendor(event.target.value)}
              placeholder="Vendor name"
              className="rounded border border-black/20 bg-transparent px-3 py-2 dark:border-white/25"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Reason</span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              placeholder="Why is this being changed?"
              className="rounded border border-black/20 bg-transparent px-3 py-2 dark:border-white/25"
            />
          </label>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded border border-black/20 px-4 py-2 text-sm disabled:opacity-50 dark:border-white/25"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit review"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
