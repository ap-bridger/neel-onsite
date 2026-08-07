/*
  Warnings:

  - You are about to drop the column `llmPayerTransactionId` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `reviewerPayerTransactionId` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `transactionId` on the `TransactionCategory` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[id,clientId]` on the table `Account` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `accountId` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Transaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clientId" INTEGER NOT NULL,
    "accountId" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "totalAmount" REAL NOT NULL,
    "llmVendorId" INTEGER,
    "llmNewVendorName" TEXT,
    "status" TEXT NOT NULL,
    "reviewerVendorId" INTEGER,
    "updateReason" TEXT,
    "reviewerNewVendorName" TEXT,
    "missingInfoRequest" TEXT,
    "confidence" REAL NOT NULL,
    "llmPairTransactionId" INTEGER,
    "reviewerPairTransactionId" INTEGER,
    CONSTRAINT "Transaction_accountId_clientId_fkey" FOREIGN KEY ("accountId", "clientId") REFERENCES "Account" ("id", "clientId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_llmVendorId_fkey" FOREIGN KEY ("llmVendorId") REFERENCES "Vendor" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_reviewerVendorId_fkey" FOREIGN KEY ("reviewerVendorId") REFERENCES "Vendor" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_llmPairTransactionId_clientId_fkey" FOREIGN KEY ("llmPairTransactionId", "clientId") REFERENCES "Transaction" ("id", "clientId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_reviewerPairTransactionId_clientId_fkey" FOREIGN KEY ("reviewerPairTransactionId", "clientId") REFERENCES "Transaction" ("id", "clientId") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Transaction" ("clientId", "confidence", "date", "id", "llmNewVendorName", "llmVendorId", "missingInfoRequest", "reviewerNewVendorName", "reviewerVendorId", "status", "totalAmount", "updateReason") SELECT "clientId", "confidence", "date", "id", "llmNewVendorName", "llmVendorId", "missingInfoRequest", "reviewerNewVendorName", "reviewerVendorId", "status", "totalAmount", "updateReason" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
CREATE UNIQUE INDEX "Transaction_id_clientId_key" ON "Transaction"("id", "clientId");
CREATE UNIQUE INDEX "Transaction_llmPairTransactionId_clientId_key" ON "Transaction"("llmPairTransactionId", "clientId");
CREATE UNIQUE INDEX "Transaction_reviewerPairTransactionId_clientId_key" ON "Transaction"("reviewerPairTransactionId", "clientId");
CREATE TABLE "new_TransactionCategory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clientId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "amount" REAL NOT NULL,
    "llmTransactionId" INTEGER,
    "reviewerTransactionId" INTEGER,
    CONSTRAINT "TransactionCategory_categoryId_clientId_fkey" FOREIGN KEY ("categoryId", "clientId") REFERENCES "Category" ("id", "clientId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TransactionCategory_llmTransactionId_clientId_fkey" FOREIGN KEY ("llmTransactionId", "clientId") REFERENCES "Transaction" ("id", "clientId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TransactionCategory_reviewerTransactionId_clientId_fkey" FOREIGN KEY ("reviewerTransactionId", "clientId") REFERENCES "Transaction" ("id", "clientId") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TransactionCategory" ("amount", "categoryId", "clientId", "id") SELECT "amount", "categoryId", "clientId", "id" FROM "TransactionCategory";
DROP TABLE "TransactionCategory";
ALTER TABLE "new_TransactionCategory" RENAME TO "TransactionCategory";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Account_id_clientId_key" ON "Account"("id", "clientId");
