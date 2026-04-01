import { db, contentTable, detectionTable, alertTable } from "@workspace/db";
import { randomUUID } from "crypto";

const CONTENT_ITEMS = [
  {
    uuid: randomUUID(),
    title: "Deep Learning for Natural Language Processing: A Comprehensive Survey",
    type: "paper" as const,
    description: "A systematic review of deep learning architectures applied to NLP tasks",
    contentHash: "sha256:a8f3c2d1e9b5f7a4c6d8e2f1b3a5c7d9e1f3a5c7",
    author: "Dr. Sarah Chen",
    organization: "MIT CSAIL",
    similarityThreshold: 0.88,
    status: "active" as const,
    detectionCount: 14,
  },
  {
    uuid: randomUUID(),
    title: "Advanced Machine Learning Course - Module 5: Neural Networks",
    type: "course" as const,
    description: "Video lecture series on neural network architectures and training",
    contentHash: "sha256:b9e4d3c2f8a6b5c4d7e3f2a1c5b7d9f1e3a7c9",
    author: "Prof. James Wright",
    organization: "Stanford Online",
    similarityThreshold: 0.82,
    status: "monitoring" as const,
    detectionCount: 8,
  },
  {
    uuid: randomUUID(),
    title: "Quantum Computing Fundamentals - Research Paper",
    type: "paper" as const,
    description: "Introduction to quantum gates, circuits, and algorithms",
    contentHash: "sha256:c1f5e4d3b8a7c6d5e4f3a2b1c0d9e8f7a6b5c4",
    author: "Dr. Aisha Patel",
    organization: "Caltech Quantum Lab",
    similarityThreshold: 0.90,
    status: "active" as const,
    detectionCount: 22,
  },
  {
    uuid: randomUUID(),
    title: "Blockchain Architecture for Decentralized Applications",
    type: "document" as const,
    description: "Technical whitepaper on smart contract design patterns",
    contentHash: "sha256:d2a6f5e4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9",
    author: "Marcus Thompson",
    organization: "Ethereum Foundation",
    similarityThreshold: 0.85,
    status: "active" as const,
    detectionCount: 5,
    blockchainTxHash: "0x7f9d8c3b2a1e4f5d6c7b8a9f0e1d2c3b4a5f6e7",
    ipfsHash: "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
  },
  {
    uuid: randomUUID(),
    title: "Computer Vision Applications in Medical Imaging",
    type: "paper" as const,
    description: "Using CNNs for tumor detection and medical image segmentation",
    contentHash: "sha256:e3b7a6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0",
    author: "Dr. Li Wei",
    organization: "Johns Hopkins Medicine",
    similarityThreshold: 0.87,
    status: "active" as const,
    detectionCount: 31,
  },
  {
    uuid: randomUUID(),
    title: "Introduction to Cryptography - Online Course",
    type: "course" as const,
    description: "Comprehensive cryptography course covering symmetric, asymmetric, and hash functions",
    contentHash: "sha256:f4c8b7a6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1",
    author: "Prof. Alan Morris",
    organization: "Coursera / Princeton",
    similarityThreshold: 0.80,
    status: "monitoring" as const,
    detectionCount: 17,
  },
];

const PLATFORMS = ["ResearchGate", "Academia.edu", "Reddit", "GitHub", "Scribd", "SlideShare", "Medium", "Telegram", "Discord", "Twitter/X"];

const DETECTION_TYPES = ["exact", "paraphrase", "partial", "visual"] as const;
const STATUSES = ["pending", "confirmed", "dismissed"] as const;

const EXCERPTS = [
  "Deep learning has revolutionized the field of natural language processing through the introduction of transformer architectures...",
  "In this module, we explore the fundamental principles of backpropagation and gradient descent algorithms used in neural network training...",
  "Quantum entanglement represents a phenomenon where two particles become correlated in such a way that the quantum state of each particle...",
  "Smart contracts are self-executing contracts with the terms of the agreement directly written into code, enabling trustless transactions...",
  "Convolutional neural networks have demonstrated remarkable performance in medical image classification tasks, achieving accuracy rates comparable to radiologists...",
  "The RSA algorithm is based on the practical difficulty of factoring the product of two large prime numbers, the factoring problem...",
  "This paper presents a novel approach to semantic similarity detection using sentence embeddings and cosine distance metrics...",
  "We propose a multi-modal content verification system that combines OCR, NLP, and computer vision techniques for comprehensive plagiarism detection...",
];

async function seed() {
  console.log("Seeding database...");

  await db.delete(alertTable);
  await db.delete(detectionTable);
  await db.delete(contentTable);

  const insertedContent = await db.insert(contentTable).values(CONTENT_ITEMS).returning();
  console.log(`Inserted ${insertedContent.length} content items`);

  const detections = [];
  const now = new Date();
  for (let i = 0; i < 60; i++) {
    const content = insertedContent[Math.floor(Math.random() * insertedContent.length)];
    const daysAgo = Math.floor(Math.random() * 30);
    const detectedAt = new Date(now);
    detectedAt.setDate(detectedAt.getDate() - daysAgo);

    detections.push({
      uuid: randomUUID(),
      contentId: content.uuid,
      contentTitle: content.title,
      similarityScore: Math.round((0.55 + Math.random() * 0.45) * 100) / 100,
      detectionType: DETECTION_TYPES[Math.floor(Math.random() * DETECTION_TYPES.length)],
      sourceUrl: `https://${PLATFORMS[Math.floor(Math.random() * PLATFORMS.length)].toLowerCase().replace(/[^a-z]/g, "")}.com/content/${randomUUID().slice(0, 8)}`,
      sourcePlatform: PLATFORMS[Math.floor(Math.random() * PLATFORMS.length)],
      status: STATUSES[Math.floor(Math.random() * STATUSES.length)],
      excerpt: EXCERPTS[Math.floor(Math.random() * EXCERPTS.length)],
      aiAnalysis: `Semantic embedding analysis indicates ${Math.floor(Math.random() * 30 + 70)}% lexical overlap with original content. NLP model confidence: ${Math.floor(Math.random() * 10 + 90)}%. Paraphrase detection triggered at paragraph level. OCR verified text extraction from PDF copy.`,
      detectedAt,
    });
  }
  await db.insert(detectionTable).values(detections);
  console.log(`Inserted ${detections.length} detections`);

  await db.insert(alertTable).values([
    {
      uuid: randomUUID(),
      type: "high_similarity" as const,
      title: "Critical: 97% Match Detected",
      message: "An exact copy of 'Deep Learning for NLP' was found on ResearchGate with 97% similarity score.",
      contentId: insertedContent[0].uuid,
      severity: "critical" as const,
      read: false,
      createdAt: new Date(now.getTime() - 1000 * 60 * 30),
    },
    {
      uuid: randomUUID(),
      type: "new_detection" as const,
      title: "New Detection: Quantum Computing Paper",
      message: "A partial copy of your quantum computing research was found on Academia.edu.",
      contentId: insertedContent[2].uuid,
      severity: "warning" as const,
      read: false,
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 2),
    },
    {
      uuid: randomUUID(),
      type: "new_detection" as const,
      title: "Paraphrase Detected: ML Course Content",
      message: "Paraphrased version of Module 5 Neural Networks found on Medium blog post.",
      contentId: insertedContent[1].uuid,
      severity: "warning" as const,
      read: false,
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 5),
    },
    {
      uuid: randomUUID(),
      type: "blockchain_registered" as const,
      title: "Blockchain Registration Successful",
      message: "Blockchain Architecture whitepaper successfully registered on Polygon network. TX: 0x7f9d8c3b...",
      contentId: insertedContent[3].uuid,
      severity: "info" as const,
      read: true,
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24),
    },
    {
      uuid: randomUUID(),
      type: "weekly_summary" as const,
      title: "Weekly Summary: 12 New Detections",
      message: "This week ContentGuard detected 12 new potential infringements across 6 platforms. 4 confirmed, 3 dismissed, 5 pending review.",
      severity: "info" as const,
      read: true,
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7),
    },
    {
      uuid: randomUUID(),
      type: "high_similarity" as const,
      title: "High Similarity: Medical Imaging Paper",
      message: "92% match found on Scribd for Computer Vision in Medical Imaging paper.",
      contentId: insertedContent[4].uuid,
      severity: "critical" as const,
      read: false,
      createdAt: new Date(now.getTime() - 1000 * 60 * 45),
    },
  ]);
  console.log("Inserted alerts");
  console.log("Seed complete!");
}

seed().catch(console.error);
