import { Router } from "express";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import { createHash, randomUUID } from "crypto";
import { db, contentTable } from "@workspace/db";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_API_SECRET = process.env.PINATA_API_SECRET;

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // 1. Generate SHA-256 hash
    const hash = createHash("sha256").update(file.buffer).digest("hex");

    // 2. Upload to Pinata
    let ipfsHash = "mock-ipfs-hash-" + randomUUID().slice(0, 8); // Fallback for dev without keys
    
    if (PINATA_API_KEY && PINATA_API_SECRET) {
      const formData = new FormData();
      formData.append("file", file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });

      const metadata = JSON.stringify({
        name: file.originalname,
        keyvalues: {
          sha256: hash,
          ownerId: userId,
        },
      });
      formData.append("pinataMetadata", metadata);

      const options = JSON.stringify({
        cidVersion: 0,
      });
      formData.append("pinataOptions", options);

      try {
        const response = await axios.post(
          "https://api.pinata.cloud/pinning/pinFileToIPFS",
          formData,
          {
            maxBodyLength: Infinity,
            headers: {
              ...formData.getHeaders(),
              pinata_api_key: PINATA_API_KEY,
              pinata_secret_api_key: PINATA_API_SECRET,
            },
          }
        );
        ipfsHash = response.data.IpfsHash;
      } catch (pinataError: any) {
        console.error("Pinata upload failed:", pinataError.response?.data || pinataError.message);
        return res.status(500).json({ error: "IPFS upload failed", details: pinataError.response?.data || pinataError.message });
      }
    } else {
      console.warn("Pinata API keys missing, using mock IPFS hash.");
    }

    // 3. Store in database
    const uuid = randomUUID();
    const [inserted] = await db
      .insert(contentTable)
      .values({
        uuid,
        title: file.originalname,
        type: file.mimetype.startsWith("video") ? "video" : file.mimetype.startsWith("image") ? "image" : "document",
        description: `Uploaded via ContentGuard IPFS integration`,
        contentHash: hash,
        fileSize: file.size,
        author: "Unknown Author", // Could be passed in body
        organization: "ContentGuard Community",
        similarityThreshold: 0.85,
        status: "active",
        detectionCount: 0,
        ipfsHash: ipfsHash,
        ownerId: userId,
        registeredAt: new Date(),
      })
      .returning();

    return res.status(201).json({
      success: true,
      data: {
        id: inserted.uuid,
        ipfsHash: inserted.ipfsHash,
        contentHash: inserted.contentHash,
        title: inserted.title,
      }
    });

  } catch (error: any) {
    console.error("Upload error:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

export default router;
