import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ACCOUNTS_PER_CLIENT = 5;
const TRANSACTIONS_PER_ACCOUNT = 100;
const PAIR_TRANSACTIONS_PER_ACCOUNT = 10;
const CATEGORIES_PER_CLIENT = 100;
const VENDORS_PER_CLIENT = 100;
const DAY_MS = 24 * 60 * 60 * 1000;

const CLIENT_NAMES = [
  "Cascade Home Renovations",
  "Blue Harbor Consulting Group",
  "Meridian Fitness Studio",
];

const ACCOUNT_NAMES = [
  "Business Checking",
  "Business Savings",
  "Business Credit Card",
  "Payroll Account",
  "Petty Cash",
];

const TOP_LEVEL_CATEGORIES = [
  "Advertising & Marketing",
  "Bank Fees & Charges",
  "Contract Labor",
  "Dues & Subscriptions",
  "Equipment & Software",
  "Insurance",
  "Legal & Professional Services",
  "Meals & Entertainment",
  "Office Supplies",
  "Payroll & Wages",
  "Rent & Lease",
  "Repairs & Maintenance",
  "Taxes & Licenses",
  "Travel",
  "Utilities",
  "Shipping & Postage",
  "Training & Education",
  "Charitable Contributions",
  "Vehicle Expenses",
  "Merchant Processing Fees",
];

const CATEGORY_MODIFIERS = [
  "General",
  "Recurring",
  "One-Time",
  "Reimbursable",
  "Non-Deductible",
];

const CATEGORY_NAMES = TOP_LEVEL_CATEGORIES.flatMap((topLevel) =>
  CATEGORY_MODIFIERS.map((modifier) => `${topLevel} - ${modifier}`)
);

const VENDOR_NAMES = [
  "Amazon Business",
  "Amazon Web Services",
  "Google Ads",
  "Google Workspace",
  "Meta Ads",
  "Adobe",
  "Microsoft 365",
  "Slack",
  "Zoom",
  "Dropbox",
  "GitHub",
  "Salesforce",
  "HubSpot",
  "Mailchimp",
  "Squarespace",
  "GoDaddy",
  "Notion",
  "Asana",
  "Trello",
  "Zendesk",
  "DocuSign",
  "Canva",
  "Figma",
  "Atlassian",
  "Intuit QuickBooks",
  "Stripe",
  "PayPal",
  "Square",
  "Shopify",
  "Wix",
  "AT&T",
  "Verizon Wireless",
  "T-Mobile for Business",
  "Comcast Business",
  "Spectrum Business",
  "Con Edison",
  "PG&E",
  "National Grid",
  "Waste Management Inc.",
  "Delta Air Lines",
  "United Airlines",
  "American Airlines",
  "Southwest Airlines",
  "Marriott Hotels",
  "Hilton Hotels",
  "Airbnb",
  "Hertz",
  "Enterprise Rent-A-Car",
  "Uber",
  "Lyft",
  "Staples",
  "Office Depot",
  "The Home Depot",
  "Costco Wholesale",
  "Walmart Business",
  "Best Buy Business",
  "IKEA",
  "Target",
  "DoorDash",
  "Grubhub",
  "Uber Eats",
  "Whole Foods Market",
  "Trader Joe's",
  "Starbucks",
  "Panera Bread",
  "Sysco Foods",
  "FedEx",
  "UPS",
  "USPS",
  "DHL Express",
  "Gusto Payroll",
  "ADP",
  "Paychex",
  "State Farm Insurance",
  "Blue Cross Blue Shield",
  "LegalZoom",
  "Rocket Lawyer",
  "The Hartford Insurance",
  "Progressive Commercial Insurance",
  "Wells Fargo Bank Fees",
  "Chase Bank Fees",
  "Bank of America Fees",
  "American Express Merchant Fees",
  "WeWork",
  "Regus Office Space",
  "CBRE Property Management",
  "ABC Cleaning Services",
  "XYZ Pest Control",
  "Yelp Ads",
  "LinkedIn Ads",
  "Constant Contact",
  "Fiverr",
  "Upwork",
  "TaskRabbit",
  "VistaPrint",
  "FedEx Office Print & Ship",
  "Shell Oil",
  "Chevron",
  "ExxonMobil",
  "Jiffy Lube",
];

const STATUSES = ["needs_review", "reviewed", "pending", "missing_info"] as const;
type Status = (typeof STATUSES)[number];

const STATUS_WEIGHTS: Record<Status, number> = {
  needs_review: 0.3,
  reviewed: 0.55,
  pending: 0.1,
  missing_info: 0.05,
};

const NEW_VENDOR_NAMES = [
  "Riverside Print & Copy",
  "Summit Hardware Supply",
  "Greenfield Landscaping",
  "Pacific Coast Catering",
  "Ironclad Security Systems",
];

const UPDATE_REASONS = [
  "Reviewer confirmed vendor and category.",
  "Corrected vendor name based on receipt.",
  "Reassigned category after client clarification.",
  "Split transaction across categories per client memo.",
  "Confirmed as recurring vendor charge.",
];

if (CATEGORY_NAMES.length !== CATEGORIES_PER_CLIENT) {
  throw new Error(
    `Expected ${CATEGORIES_PER_CLIENT} generated category names, got ${CATEGORY_NAMES.length}`
  );
}
if (VENDOR_NAMES.length !== VENDORS_PER_CLIENT) {
  throw new Error(
    `Expected ${VENDORS_PER_CLIENT} vendor names, got ${VENDOR_NAMES.length}`
  );
}

// Exact per-account distribution of how many llmCategory rows a transaction gets.
const LLM_CATEGORY_PLAN_COUNTS = {
  single: 70, // one llmCategory (non-split transaction)
  split: 10, // three llmCategories (split transaction)
  none: 20, // no llmCategory
} as const;
type LlmCategoryChoice = keyof typeof LLM_CATEGORY_PLAN_COUNTS;

// Exact per-account distribution of how a transaction's LLM vendor is populated.
const LLM_VENDOR_PLAN_COUNTS = {
  vendorId: 70, // llmVendorId set
  vendorName: 15, // llmNewVendorName set
  none: 15, // neither set
} as const;
type LlmVendorChoice = keyof typeof LLM_VENDOR_PLAN_COUNTS;

function pickWeightedStatus(): Status {
  const roll = Math.random();
  let cumulative = 0;
  for (const status of STATUSES) {
    cumulative += STATUS_WEIGHTS[status];
    if (roll <= cumulative) return status;
  }
  return "reviewed";
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(items: T[]): T {
  return items[randomInt(0, items.length - 1)];
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function randomTotalAmount(): number {
  const isIncome = Math.random() < 0.15;
  if (isIncome) {
    return round2(randomInt(10000, 500000) / 100);
  }
  return round2(-randomInt(500, 500000) / 100);
}

function randomDateWithinLastYear(): Date {
  const daysAgo = randomInt(0, 365);
  return new Date(Date.now() - daysAgo * DAY_MS);
}

function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function buildShuffledPlan<K extends string>(counts: Record<K, number>): K[] {
  const plan = (Object.keys(counts) as K[]).flatMap((key) =>
    Array<K>(counts[key]).fill(key)
  );
  return shuffle(plan);
}

function buildMissingInfoRequest(
  missingCategory: boolean,
  missingVendor: boolean
): string | null {
  if (missingCategory && missingVendor) {
    return "LLM could not identify a vendor or a category for this transaction — please review the source document and assign both manually.";
  }
  if (missingCategory) {
    return "LLM could not confidently assign a category for this transaction — please review and categorize manually.";
  }
  if (missingVendor) {
    return "LLM could not identify the vendor for this transaction — please confirm the payee from the receipt or statement.";
  }
  return null;
}

function splitAmount(total: number, parts: number): number[] {
  if (parts === 1) return [total];
  const cuts = Array.from({ length: parts - 1 }, () => Math.random()).sort();
  const boundaries = [0, ...cuts, 1];
  return boundaries.slice(1).map((boundary, i) => round2(total * (boundary - boundaries[i])));
}

function fixedCategorySplit(
  categories: { id: number }[],
  total: number,
  numSplits: number
): { categoryId: number; amount: number }[] {
  if (numSplits === 0) return [];
  const chosenCategoryIds = new Set<number>();
  while (chosenCategoryIds.size < numSplits) {
    chosenCategoryIds.add(pick(categories).id);
  }
  const amounts = splitAmount(total, chosenCategoryIds.size);
  return Array.from(chosenCategoryIds).map((categoryId, i) => ({
    categoryId,
    amount: amounts[i],
  }));
}

function randomWeightedCategorySplit(categories: { id: number }[], total: number) {
  const splitRoll = Math.random();
  const numSplits = splitRoll < 0.7 ? 1 : splitRoll < 0.9 ? 2 : 3;
  return fixedCategorySplit(categories, total, numSplits);
}

type TransactionCategoryRow = {
  clientId: number;
  llmTransactionId: number | null;
  reviewerTransactionId: number | null;
  categoryId: number;
  amount: number;
};

function makeTransactionCategoryRow(
  clientId: number,
  llmTransactionId: number | null,
  reviewerTransactionId: number | null,
  split: { categoryId: number; amount: number }
): TransactionCategoryRow {
  return {
    clientId,
    llmTransactionId,
    reviewerTransactionId,
    categoryId: split.categoryId,
    amount: split.amount,
  };
}

async function seedClient(clientName: string) {
  const client = await prisma.client.create({ data: { name: clientName } });

  await prisma.account.createMany({
    data: ACCOUNT_NAMES.map((name) => ({ name, clientId: client.id })),
  });
  const accounts = await prisma.account.findMany({
    where: { clientId: client.id },
    orderBy: { id: "asc" },
  });

  await prisma.category.createMany({
    data: CATEGORY_NAMES.map((name) => ({ name, clientId: client.id })),
  });
  const categories = await prisma.category.findMany({
    where: { clientId: client.id },
    orderBy: { id: "asc" },
  });

  await prisma.vendor.createMany({
    data: VENDOR_NAMES.map((name) => ({ name, clientId: client.id })),
  });
  const vendors = await prisma.vendor.findMany({
    where: { clientId: client.id },
    orderBy: { id: "asc" },
  });

  const transactionInputs = accounts.flatMap((account) => {
    const categoryPlan = buildShuffledPlan<LlmCategoryChoice>(LLM_CATEGORY_PLAN_COUNTS);
    const vendorPlan = buildShuffledPlan<LlmVendorChoice>(LLM_VENDOR_PLAN_COUNTS);

    return Array.from({ length: TRANSACTIONS_PER_ACCOUNT }, (_, i) => {
      const categoryChoice = categoryPlan[i];
      const llmCategoryCount = categoryChoice === "single" ? 1 : categoryChoice === "split" ? 3 : 0;

      const vendorChoice = vendorPlan[i];
      const llmVendor = vendorChoice === "vendorId" ? pick(vendors) : null;
      const llmNewVendorName = vendorChoice === "vendorName" ? pick(NEW_VENDOR_NAMES) : null;

      const missingInfoRequest = buildMissingInfoRequest(
        categoryChoice === "none",
        vendorChoice === "none"
      );

      const status = missingInfoRequest !== null ? "needs_review" : pickWeightedStatus();
      const isReviewed = status === "reviewed";

      const canKeepLlmVendor = isReviewed && vendorChoice === "vendorId";
      const reviewerKeepsLlmVendor = canKeepLlmVendor && Math.random() < 0.7;
      const reviewerOverridesWithNewName =
        isReviewed && !reviewerKeepsLlmVendor && Math.random() < 0.15;
      const reviewerVendor = reviewerKeepsLlmVendor
        ? llmVendor
        : isReviewed && !reviewerOverridesWithNewName
          ? pick(vendors)
          : null;

      const canKeepLlmCategories = isReviewed && llmCategoryCount > 0;
      const reviewerKeepsLlmCategories = canKeepLlmCategories && Math.random() < 0.65;

      return {
        clientId: client.id,
        accountId: account.id,
        date: randomDateWithinLastYear(),
        totalAmount: randomTotalAmount(),
        status,
        confidence: round2(Math.random()),
        llmVendorId: llmVendor?.id ?? null,
        llmNewVendorName,
        reviewerVendorId: reviewerVendor?.id ?? null,
        reviewerNewVendorName: reviewerOverridesWithNewName ? pick(NEW_VENDOR_NAMES) : null,
        updateReason: isReviewed ? pick(UPDATE_REASONS) : null,
        missingInfoRequest,
        // transient fields consumed below to build TransactionCategory rows, not persisted on Transaction
        _isReviewed: isReviewed,
        _llmCategoryCount: llmCategoryCount,
        _reviewerKeepsLlmCategories: reviewerKeepsLlmCategories,
      };
    });
  });

  await prisma.transaction.createMany({
    data: transactionInputs.map(
      ({ _isReviewed, _llmCategoryCount, _reviewerKeepsLlmCategories, ...data }) => data
    ),
  });
  const transactions = await prisma.transaction.findMany({
    where: { clientId: client.id },
    orderBy: { id: "asc" },
  });

  const transactionCategoryInputs: TransactionCategoryRow[] = transactions.flatMap(
    (transaction, i) => {
      const { _isReviewed, _llmCategoryCount, _reviewerKeepsLlmCategories } =
        transactionInputs[i];
      const llmSplit = fixedCategorySplit(categories, transaction.totalAmount, _llmCategoryCount);

      if (!_isReviewed) {
        return llmSplit.map((split) =>
          makeTransactionCategoryRow(client.id, transaction.id, null, split)
        );
      }

      if (_reviewerKeepsLlmCategories) {
        return llmSplit.map((split) =>
          makeTransactionCategoryRow(client.id, transaction.id, transaction.id, split)
        );
      }

      const reviewerSplit = randomWeightedCategorySplit(categories, transaction.totalAmount);
      return [
        ...llmSplit.map((split) =>
          makeTransactionCategoryRow(client.id, transaction.id, null, split)
        ),
        ...reviewerSplit.map((split) =>
          makeTransactionCategoryRow(client.id, null, transaction.id, split)
        ),
      ];
    }
  );

  await prisma.transactionCategory.createMany({ data: transactionCategoryInputs });

  const pairTransactionCount = await seedPairTransactions(client.id, accounts);

  return {
    clientName,
    accounts: accounts.length,
    categories: categories.length,
    vendors: vendors.length,
    transactions: transactions.length + pairTransactionCount,
    transactionCategories: transactionCategoryInputs.length,
  };
}

// Adds PAIR_TRANSACTIONS_PER_ACCOUNT transfer-style transactions per account, each linked
// to its counterpart in a different account of the same client via llmPairTransactionId.
async function seedPairTransactions(
  clientId: number,
  accounts: { id: number }[]
): Promise<number> {
  // Interleaving by account index guarantees consecutive slots never share an account,
  // so pairing slot 2k with slot 2k+1 below always spans two different accounts.
  const pairSlots = Array.from(
    { length: PAIR_TRANSACTIONS_PER_ACCOUNT * accounts.length },
    (_, i) => accounts[i % accounts.length]
  );

  const pairTransactionInputs = pairSlots.map((account) => {
    const status = pickWeightedStatus();
    return {
      clientId,
      accountId: account.id,
      date: randomDateWithinLastYear(),
      totalAmount: 0,
      status,
      confidence: round2(Math.random()),
      llmVendorId: null,
      llmNewVendorName: null,
      reviewerVendorId: null,
      reviewerNewVendorName: null,
      updateReason: status === "reviewed" ? pick(UPDATE_REASONS) : null,
      missingInfoRequest: null,
    };
  });

  for (let i = 0; i < pairTransactionInputs.length; i += 2) {
    const amount = round2(randomInt(1000, 500000) / 100);
    pairTransactionInputs[i].totalAmount = -amount;
    pairTransactionInputs[i + 1].totalAmount = amount;
    pairTransactionInputs[i + 1].date = pairTransactionInputs[i].date;
  }

  const maxIdBefore = await prisma.transaction.aggregate({
    where: { clientId },
    _max: { id: true },
  });
  await prisma.transaction.createMany({ data: pairTransactionInputs });
  const pairTransactions = await prisma.transaction.findMany({
    where: { clientId, id: { gt: maxIdBefore._max.id ?? 0 } },
    orderBy: { id: "asc" },
  });

  for (let i = 0; i < pairTransactions.length; i += 2) {
    const a = pairTransactions[i];
    const b = pairTransactions[i + 1];
    await prisma.transaction.update({
      where: { id: a.id },
      data: { llmPairTransactionId: b.id },
    });
    await prisma.transaction.update({
      where: { id: b.id },
      data: { llmPairTransactionId: a.id },
    });
  }

  return pairTransactions.length;
}

async function main() {
  console.log("Clearing existing data...");
  await prisma.transactionCategory.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.category.deleteMany();
  await prisma.account.deleteMany();
  await prisma.client.deleteMany();

  for (const clientName of CLIENT_NAMES) {
    console.log(`Seeding client "${clientName}"...`);
    const summary = await seedClient(clientName);
    console.log(
      `  -> ${summary.accounts} accounts, ${summary.categories} categories, ${summary.vendors} vendors, ` +
        `${summary.transactions} transactions, ${summary.transactionCategories} category splits`
    );
  }

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
