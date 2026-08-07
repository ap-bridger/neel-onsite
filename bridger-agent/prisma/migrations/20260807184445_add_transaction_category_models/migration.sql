-- CreateTable
CREATE TABLE "Category" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "clientId" INTEGER NOT NULL,
    CONSTRAINT "Category_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clientId" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "totalAmount" REAL NOT NULL,
    "llmVendorId" INTEGER,
    "llmNewVendorName" TEXT,
    "status" TEXT NOT NULL,
    "reviewerVendorId" INTEGER,
    "updateReason" TEXT NOT NULL,
    "reviewerNewVendorName" TEXT,
    "missingInfoRequest" TEXT NOT NULL,
    "confidence" REAL NOT NULL,
    "llmPayerTransactionId" INTEGER,
    "reviewerPayerTransactionId" INTEGER,
    CONSTRAINT "Transaction_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_llmVendorId_fkey" FOREIGN KEY ("llmVendorId") REFERENCES "Vendor" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_reviewerVendorId_fkey" FOREIGN KEY ("reviewerVendorId") REFERENCES "Vendor" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_llmPayerTransactionId_clientId_fkey" FOREIGN KEY ("llmPayerTransactionId", "clientId") REFERENCES "Transaction" ("id", "clientId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_reviewerPayerTransactionId_clientId_fkey" FOREIGN KEY ("reviewerPayerTransactionId", "clientId") REFERENCES "Transaction" ("id", "clientId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TransactionCategory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clientId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "amount" REAL NOT NULL,
    "transactionId" INTEGER NOT NULL,
    CONSTRAINT "TransactionCategory_categoryId_clientId_fkey" FOREIGN KEY ("categoryId", "clientId") REFERENCES "Category" ("id", "clientId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TransactionCategory_transactionId_clientId_fkey" FOREIGN KEY ("transactionId", "clientId") REFERENCES "Transaction" ("id", "clientId") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_clientId_name_key" ON "Category"("clientId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_id_clientId_key" ON "Category"("id", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_id_clientId_key" ON "Transaction"("id", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_llmPayerTransactionId_clientId_key" ON "Transaction"("llmPayerTransactionId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_reviewerPayerTransactionId_clientId_key" ON "Transaction"("reviewerPayerTransactionId", "clientId");
