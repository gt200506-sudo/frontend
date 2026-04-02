import { Router } from "express";
import { db, contentTable, blockchainRecordTable, eq } from "@workspace/db";
import { randomUUID } from "crypto";
import { RegisterOnBlockchainBody, VerifyOwnershipParams } from "@workspace/api-zod";

const router = Router();

function generateFakeTxHash(): string {
  return "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

function generateFakeIpfsHash(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return "Qm" + Array.from({ length: 44 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

router.post("/web3/register", async (req, res) => {
  const userId = (req as any).userId;
  const body = RegisterOnBlockchainBody.parse(req.body);
  const { contentId, walletAddress } = body;

  const [content] = await db.select().from(contentTable).where(eq(contentTable.uuid, contentId));
  if (!content || content.ownerId !== userId) return res.status(404).json({ error: "Content not found" });

  const txHash = generateFakeTxHash();
  const ipfsHash = generateFakeIpfsHash();
  const blockNumber = Math.floor(Math.random() * 1000000) + 40000000;
  const timestamp = new Date();

  await db
    .update(contentTable)
    .set({ blockchainTxHash: txHash, ipfsHash })
    .where(eq(contentTable.uuid, contentId));

  const existing = await db.select().from(blockchainRecordTable).where(eq(blockchainRecordTable.contentId, contentId));
  if (existing.length > 0) {
    await db.update(blockchainRecordTable)
      .set({ txHash, ipfsHash, blockNumber, ownerAddress: walletAddress, registeredAt: timestamp })
      .where(eq(blockchainRecordTable.contentId, contentId));
  } else {
    await db.insert(blockchainRecordTable).values({
      contentId,
      txHash,
      blockNumber,
      network: "polygon",
      ipfsHash,
      ownerAddress: walletAddress,
      registeredAt: timestamp,
    });
  }

  return res.status(201).json({
    contentId,
    txHash,
    blockNumber,
    network: "polygon",
    ipfsHash,
    timestamp: timestamp.toISOString(),
    ownerAddress: walletAddress,
  });
});

router.get("/web3/verify/:contentId", async (req, res) => {
  const userId = (req as any).userId;
  const { contentId } = VerifyOwnershipParams.parse(req.params);

  const [record] = await db.select().from(blockchainRecordTable).where(eq(blockchainRecordTable.contentId, contentId));

  if (!record) {
    return res.json({ contentId, verified: false, ownerAddress: null, txHash: null, registeredAt: null, network: null });
  }

  // Verify that the linked content belongs to the current user
  const [content] = await db.select().from(contentTable).where(eq(contentTable.uuid, contentId));
  if (!content || content.ownerId !== userId) {
      return res.json({ contentId, verified: false, ownerAddress: null, txHash: null, registeredAt: null, network: null });
  }

  return res.json({
    contentId,
    verified: true,
    ownerAddress: record.ownerAddress,
    txHash: record.txHash,
    registeredAt: (record.registeredAt instanceof Date) ? record.registeredAt.toISOString() : new Date(record.registeredAt as any).toISOString(),
    network: record.network,
  });
});

export default router;
