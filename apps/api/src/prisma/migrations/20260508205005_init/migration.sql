-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "googleSub" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kmsKeyId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "provisioningEntropyHash" TEXT NOT NULL,
    "provisioningEntropySig" TEXT NOT NULL,
    "provisioningSatelliteSource" TEXT NOT NULL DEFAULT 'aptosorbital',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rawTxHex" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attestation" (
    "id" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "ipfsCid" TEXT,
    "publicSlug" TEXT NOT NULL,
    "kmsQuote" JSONB NOT NULL,
    "kmsQuoteVerified" BOOLEAN NOT NULL DEFAULT false,
    "signingEntropyHash" TEXT NOT NULL,
    "signingEntropySig" TEXT NOT NULL,
    "onchainTxHash" TEXT,
    "onchainBlockNumber" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attestation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_googleSub_key" ON "User"("googleSub");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_googleSub_idx" ON "User"("googleSub");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_kmsKeyId_key" ON "Wallet"("kmsKeyId");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_address_key" ON "Wallet"("address");

-- CreateIndex
CREATE INDEX "Wallet_address_idx" ON "Wallet"("address");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_txHash_key" ON "Transaction"("txHash");

-- CreateIndex
CREATE INDEX "Transaction_walletId_createdAt_idx" ON "Transaction"("walletId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Transaction_txHash_idx" ON "Transaction"("txHash");

-- CreateIndex
CREATE UNIQUE INDEX "Attestation_txHash_key" ON "Attestation"("txHash");

-- CreateIndex
CREATE UNIQUE INDEX "Attestation_ipfsCid_key" ON "Attestation"("ipfsCid");

-- CreateIndex
CREATE UNIQUE INDEX "Attestation_publicSlug_key" ON "Attestation"("publicSlug");

-- CreateIndex
CREATE INDEX "Attestation_publicSlug_idx" ON "Attestation"("publicSlug");

-- CreateIndex
CREATE INDEX "Attestation_ipfsCid_idx" ON "Attestation"("ipfsCid");

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attestation" ADD CONSTRAINT "Attestation_txHash_fkey" FOREIGN KEY ("txHash") REFERENCES "Transaction"("txHash") ON DELETE CASCADE ON UPDATE CASCADE;
