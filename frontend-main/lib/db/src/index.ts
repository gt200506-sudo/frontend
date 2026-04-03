/**
 * In-memory database implementation that replaces PostgreSQL/Drizzle for local development.
 *
 * Implements the chainable query builder API used by the API routes:
 *   db.select().from(table).where(...).orderBy(...).limit(N)
 *   db.insert(table).values({...}).returning()
 *   db.update(table).set({...}).where(...).returning()
 *   db.delete(table).where(...)
 *
 * Also exports compatible eq/desc/asc/count helpers that produce
 * plain JS filter/sort functions instead of SQL expressions.
 */

import { randomUUID } from "crypto";

// ---- Column reference ----

/** A column reference carrying the property name it maps to. */
class ColumnRef {
  constructor(public readonly _field: string) {}
}

/** Create a proxy-based table object: accessing any property returns a ColumnRef. */
function createTableProxy(name: string): Record<string, ColumnRef> {
  return new Proxy(
    { _name: name } as any,
    {
      get(target, prop) {
        if (prop === "_name") return target._name;
        if (typeof prop === "string") return new ColumnRef(prop);
        return (target as any)[prop];
      },
    },
  );
}

// ---- Table objects (mimic drizzle pgTable exports) ----

export const contentTable = createTableProxy("content") as any;
export const detectionTable = createTableProxy("detection") as any;
export const alertTable = createTableProxy("alert") as any;
export const blockchainRecordTable = createTableProxy("blockchain_record") as any;
export const detectedContentTable = createTableProxy("detected_content") as any;
export const uploadedContentTable = createTableProxy("uploaded_content") as any;

// ---- Enum creators (mimic drizzle pgEnum – not used at runtime, just for type compat) ----
export const contentTypeEnum = () => {};
export const contentStatusEnum = () => {};
export const detectionStatusEnum = () => {};
export const detectionTypeEnum = () => {};
export const alertTypeEnum = () => {};
export const alertSeverityEnum = () => {};

// ---- Type exports (same shape as the original schema types) ----
// These are used by routes and seed for type annotations only.

export type Content = {
  id: number; uuid: string; title: string; type: string;
  description: string | null; contentHash: string; fileSize: number | null;
  perceptualHash?: string | null;
  textFingerprint?: string | null;
  author: string; organization: string; blockchainTxHash: string | null;
  ipfsHash: string | null; detectionCount: number; status: string;
  similarityThreshold: number; registeredAt: Date;
  ownerId: string | null;
};

export type InsertContent = Omit<Content, "id">;

export type Detection = {
  id: number; uuid: string; contentId: string; contentTitle: string;
  similarityScore: number; detectionType: string; sourceUrl: string;
  sourcePlatform: string; status: string; excerpt: string;
  aiAnalysis: string | null; detectedAt: Date;
  ownerId: string | null;
};

export type InsertDetection = Omit<Detection, "id">;

export type Alert = {
  id: number; uuid: string; type: string; title: string;
  message: string; contentId: string | null; detectionId: string | null;
  read: boolean; severity: string; createdAt: Date;
  ownerId: string | null;
};

export type InsertAlert = Omit<Alert, "id">;

export type BlockchainRecord = {
  id: number; contentId: string; txHash: string; blockNumber: number;
  network: string; ipfsHash: string; ownerAddress: string; registeredAt: Date;
};

export type DetectedContent = {
  id: number;
  source: string;
  similarityScore: number;
  matchedFile: string | null;
  detectedAt: Date;
  // ownerId not included intentionally; crawler submissions are system-level.
};

export type UploadedContent = {
  id: number;
  userId: string;
  fileName: string;
  fileType: string;
  ipfsHash: string;
  uploadedAt: Date;
  scanResults: string[];
};

// Insert schemas (no-op Zod-like objects – the routes call .parse() on these for validation)
function makePassthroughSchema() {
  return { parse: (v: any) => v, omit: () => makePassthroughSchema() };
}
export const insertContentSchema = makePassthroughSchema();
export const insertDetectionSchema = makePassthroughSchema();
export const insertAlertSchema = makePassthroughSchema();
export const insertBlockchainRecordSchema = makePassthroughSchema();
export const insertDetectedContentSchema = makePassthroughSchema();
export const insertUploadedContentSchema = makePassthroughSchema();

// ---- drizzle-orm compatible helpers ----

type Row = Record<string, unknown>;
type FilterFn = (row: Row) => boolean;
type SortFn = ((a: Row, b: Row) => number) & { __sort: true };

/** eq(column, value) → filter function */
export function eq(col: ColumnRef | any, value: unknown): FilterFn {
  const field = col instanceof ColumnRef ? col._field : String(col);
  return (row: Row) => row[field] === value;
}

/** desc(column) → sort function (descending) */
export function desc(col: ColumnRef | any): SortFn {
  const field = col instanceof ColumnRef ? col._field : String(col);
  const fn = ((a: Row, b: Row) => {
    let va = a[field] as any;
    let vb = b[field] as any;
    if (typeof va === "string" && !isNaN(Date.parse(va))) va = new Date(va);
    if (typeof vb === "string" && !isNaN(Date.parse(vb))) vb = new Date(vb);
    if (va instanceof Date && vb instanceof Date) return vb.getTime() - va.getTime();
    if (va > vb) return -1;
    if (va < vb) return 1;
    return 0;
  }) as SortFn;
  fn.__sort = true;
  return fn;
}

/** asc(column) → sort function (ascending) */
export function asc(col: ColumnRef | any): SortFn {
  const field = col instanceof ColumnRef ? col._field : String(col);
  const fn = ((a: Row, b: Row) => {
    let va = a[field] as any;
    let vb = b[field] as any;
    if (typeof va === "string" && !isNaN(Date.parse(va))) va = new Date(va);
    if (typeof vb === "string" && !isNaN(Date.parse(vb))) vb = new Date(vb);
    if (va instanceof Date && vb instanceof Date) return va.getTime() - vb.getTime();
    if (va < vb) return -1;
    if (va > vb) return 1;
    return 0;
  }) as SortFn;
  fn.__sort = true;
  return fn;
}

/** count() – placeholder, not actually used in the routes as a function */
export function count() {
  return 0;
}

// ---- In-memory store ----

const store = new Map<object, Row[]>();

function getRows(table: object): Row[] {
  if (!store.has(table)) store.set(table, []);
  return store.get(table)!;
}

function setRows(table: object, rows: Row[]): void {
  store.set(table, rows);
}

// ---- Chainable query builders ----

class SelectBuilder {
  private _table: object | null = null;
  private _filters: FilterFn[] = [];
  private _sorts: SortFn[] = [];
  private _limitN: number | null = null;

  from(table: object): this {
    this._table = table;
    return this;
  }

  where(filter: FilterFn): this {
    this._filters.push(filter);
    return this;
  }

  orderBy(...sorts: any[]): this {
    for (const s of sorts) {
      if (typeof s === "function") this._sorts.push(s as SortFn);
    }
    return this;
  }

  limit(n: number): this {
    this._limitN = n;
    return this;
  }

  then(resolve: (value: Row[]) => void, reject?: (err: unknown) => void): void {
    try {
      let rows = [...getRows(this._table!)];
      for (const f of this._filters) rows = rows.filter(f);
      if (this._sorts.length > 0) {
        rows.sort((a, b) => {
          for (const s of this._sorts) {
            const r = s(a, b);
            if (r !== 0) return r;
          }
          return 0;
        });
      }
      if (this._limitN != null) rows = rows.slice(0, this._limitN);
      resolve(rows);
    } catch (e) {
      reject?.(e);
    }
  }
}

class InsertBuilder {
  private _table: object;
  private _rows: Row[] = [];
  private _returning = false;

  constructor(table: object) {
    this._table = table;
  }

  values(data: Row | Row[]): this {
    const items = Array.isArray(data) ? data : [data];
    const tableName = (this._table as any)._name || "";
    this._rows = items.map((item) => {
      const row = { ...item };
      if (row.id === undefined) {
        const existing = getRows(this._table);
        row.id = existing.length > 0
          ? Math.max(...existing.map((r) => Number(r.id) || 0)) + 1
          : 1;
      }
      
      // Smart default timestamps based on table name or property presence
      if (row.registeredAt === undefined && (tableName === "content" || tableName === "blockchain_record")) {
        row.registeredAt = new Date();
      }
      if (row.detectedAt === undefined && tableName === "detection") {
        row.detectedAt = new Date();
      }
      if (row.createdAt === undefined && tableName === "alert") {
        row.createdAt = new Date();
      }
      
      // Fallback: If no timestamp was set but it's expected by common schemas
      if (row.uuid && row.registeredAt === undefined && row.detectedAt === undefined && row.createdAt === undefined) {
          row.registeredAt = new Date();
      }

      return row;
    });
    return this;
  }

  returning(): this {
    this._returning = true;
    return this;
  }

  then(resolve: (value: Row[]) => void, reject?: (err: unknown) => void): void {
    try {
      const existing = getRows(this._table);
      existing.push(...this._rows);
      setRows(this._table, existing);
      resolve(this._returning ? [...this._rows] : []);
    } catch (e) {
      reject?.(e);
    }
  }
}

class UpdateBuilder {
  private _table: object;
  private _setData: Row = {};
  private _filters: FilterFn[] = [];
  private _returning = false;

  constructor(table: object) {
    this._table = table;
  }

  set(data: Row): this {
    this._setData = data;
    return this;
  }

  where(filter: FilterFn): this {
    this._filters.push(filter);
    return this;
  }

  returning(): this {
    this._returning = true;
    return this;
  }

  then(resolve: (value: Row[]) => void, reject?: (err: unknown) => void): void {
    try {
      const rows = getRows(this._table);
      const updated: Row[] = [];
      for (let i = 0; i < rows.length; i++) {
        const match = this._filters.length === 0 || this._filters.every((f) => f(rows[i]));
        if (match) {
          rows[i] = { ...rows[i], ...this._setData };
          updated.push(rows[i]);
        }
      }
      setRows(this._table, rows);
      resolve(this._returning ? updated : []);
    } catch (e) {
      reject?.(e);
    }
  }
}

class DeleteBuilder {
  private _table: object;
  private _filters: FilterFn[] = [];

  constructor(table: object) {
    this._table = table;
  }

  where(filter: FilterFn): this {
    this._filters.push(filter);
    return this;
  }

  then(resolve: (value: void) => void, reject?: (err: unknown) => void): void {
    try {
      if (this._filters.length === 0) {
        setRows(this._table, []);
      } else {
        const rows = getRows(this._table);
        setRows(this._table, rows.filter((r) => !this._filters.every((f) => f(r))));
      }
      resolve();
    } catch (e) {
      reject?.(e);
    }
  }
}

// ---- db object ----

export const db = {
  select() {
    return new SelectBuilder();
  },
  insert(table: object) {
    return new InsertBuilder(table);
  },
  update(table: object) {
    return new UpdateBuilder(table);
  },
  delete(table: object) {
    return new DeleteBuilder(table);
  },
};

// Dummy pool export
export const pool = null;

// ---- Seed data ----

const PLATFORMS = ["ResearchGate", "Academia.edu", "Reddit", "GitHub", "Scribd", "SlideShare", "Medium", "Telegram", "Discord", "Twitter/X"];
const DETECTION_TYPES = ["exact", "paraphrase", "partial", "visual"] as const;
const DET_STATUSES = ["pending", "confirmed", "dismissed"] as const;
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

let isSeeded = false;
function seedDatabase() {
  if (isSeeded) return;
  isSeeded = true;
  const DEMO_USER_ID = "demo@contentguard.io";
  const contentItems: Row[] = [
    { id: 1, uuid: randomUUID(), title: "Deep Learning for Natural Language Processing: A Comprehensive Survey", type: "paper", description: "A systematic review of deep learning architectures applied to NLP tasks", contentHash: "sha256:a8f3c2d1e9b5f7a4c6d8e2f1b3a5c7d9e1f3a5c7", author: "Dr. Sarah Chen", organization: "MIT CSAIL", similarityThreshold: 0.88, status: "active", detectionCount: 14, fileSize: null, blockchainTxHash: null, ipfsHash: null, registeredAt: new Date(), ownerId: DEMO_USER_ID },
    { id: 2, uuid: randomUUID(), title: "Advanced Machine Learning Course - Module 5: Neural Networks", type: "course", description: "Video lecture series on neural network architectures and training", contentHash: "sha256:b9e4d3c2f8a6b5c4d7e3f2a1c5b7d9f1e3a7c9", author: "Prof. James Wright", organization: "Stanford Online", similarityThreshold: 0.82, status: "monitoring", detectionCount: 8, fileSize: null, blockchainTxHash: null, ipfsHash: null, registeredAt: new Date(), ownerId: DEMO_USER_ID },
    { id: 3, uuid: randomUUID(), title: "Quantum Computing Fundamentals - Research Paper", type: "paper", description: "Introduction to quantum gates, circuits, and algorithms", contentHash: "sha256:c1f5e4d3b8a7c6d5e4f3a2b1c0d9e8f7a6b5c4", author: "Dr. Aisha Patel", organization: "Caltech Quantum Lab", similarityThreshold: 0.90, status: "active", detectionCount: 22, fileSize: null, blockchainTxHash: null, ipfsHash: null, registeredAt: new Date(), ownerId: DEMO_USER_ID },
    { id: 4, uuid: randomUUID(), title: "Blockchain Architecture for Decentralized Applications", type: "document", description: "Technical whitepaper on smart contract design patterns", contentHash: "sha256:d2a6f5e4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9", author: "Marcus Thompson", organization: "Ethereum Foundation", similarityThreshold: 0.85, status: "active", detectionCount: 5, fileSize: null, blockchainTxHash: "0x7f9d8c3b2a1e4f5d6c7b8a9f0e1d2c3b4a5f6e7", ipfsHash: "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG", registeredAt: new Date(), ownerId: DEMO_USER_ID },
    { id: 5, uuid: randomUUID(), title: "Computer Vision Applications in Medical Imaging", type: "paper", description: "Using CNNs for tumor detection and medical image segmentation", contentHash: "sha256:e3b7a6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0", author: "Dr. Li Wei", organization: "Johns Hopkins Medicine", similarityThreshold: 0.87, status: "active", detectionCount: 31, fileSize: null, blockchainTxHash: null, ipfsHash: null, registeredAt: new Date(), ownerId: DEMO_USER_ID },
    { id: 6, uuid: randomUUID(), title: "Introduction to Cryptography - Online Course", type: "course", description: "Comprehensive cryptography course covering symmetric, asymmetric, and hash functions", contentHash: "sha256:f4c8b7a6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1", author: "Prof. Alan Morris", organization: "Coursera / Princeton", similarityThreshold: 0.80, status: "monitoring", detectionCount: 17, fileSize: null, blockchainTxHash: null, ipfsHash: null, registeredAt: new Date(), ownerId: DEMO_USER_ID },
  ];
  setRows(contentTable, contentItems);

  const now = new Date();
  const detections: Row[] = [];
  for (let i = 0; i < 60; i++) {
    const content = contentItems[Math.floor(Math.random() * contentItems.length)];
    const daysAgo = Math.floor(Math.random() * 30);
    const detectedAt = new Date(now);
    detectedAt.setDate(detectedAt.getDate() - daysAgo);
    detections.push({
      id: i + 1, uuid: randomUUID(),
      contentId: content.uuid as string, contentTitle: content.title as string,
      similarityScore: Math.round((0.55 + Math.random() * 0.45) * 100) / 100,
      detectionType: DETECTION_TYPES[Math.floor(Math.random() * DETECTION_TYPES.length)],
      sourceUrl: `https://${PLATFORMS[Math.floor(Math.random() * PLATFORMS.length)].toLowerCase().replace(/[^a-z]/g, "")}.com/content/${randomUUID().slice(0, 8)}`,
      sourcePlatform: PLATFORMS[Math.floor(Math.random() * PLATFORMS.length)],
      status: DET_STATUSES[Math.floor(Math.random() * DET_STATUSES.length)],
      excerpt: EXCERPTS[Math.floor(Math.random() * EXCERPTS.length)],
      aiAnalysis: `Semantic embedding analysis indicates ${Math.floor(Math.random() * 30 + 70)}% lexical overlap with original content. NLP model confidence: ${Math.floor(Math.random() * 10 + 90)}%. Paraphrase detection triggered at paragraph level.`,
      detectedAt,
      ownerId: DEMO_USER_ID,
    });
  }
  setRows(detectionTable, detections);

  const alerts: Row[] = [
    { id: 1, uuid: randomUUID(), type: "high_similarity", title: "Critical: 97% Match Detected", message: "An exact copy of 'Deep Learning for NLP' was found on ResearchGate with 97% similarity score.", contentId: contentItems[0].uuid, detectionId: null, severity: "critical", read: false, createdAt: new Date(now.getTime() - 1000 * 60 * 30), ownerId: DEMO_USER_ID },
    { id: 2, uuid: randomUUID(), type: "new_detection", title: "New Detection: Quantum Computing Paper", message: "A partial copy of your quantum computing research was found on Academia.edu.", contentId: contentItems[2].uuid, detectionId: null, severity: "warning", read: false, createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 2), ownerId: DEMO_USER_ID },
    { id: 3, uuid: randomUUID(), type: "new_detection", title: "Paraphrase Detected: ML Course Content", message: "Paraphrased version of Module 5 Neural Networks found on Medium blog post.", contentId: contentItems[1].uuid, detectionId: null, severity: "warning", read: false, createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 5), ownerId: DEMO_USER_ID },
    { id: 4, uuid: randomUUID(), type: "blockchain_registered", title: "Blockchain Registration Successful", message: "Blockchain Architecture whitepaper successfully registered on Polygon network. TX: 0x7f9d8c3b...", contentId: contentItems[3].uuid, detectionId: null, severity: "info", read: true, createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24), ownerId: DEMO_USER_ID },
    { id: 5, uuid: randomUUID(), type: "weekly_summary", title: "Weekly Summary: 12 New Detections", message: "This week ContentGuard detected 12 new potential infringements across 6 platforms. 4 confirmed, 3 dismissed, 5 pending review.", contentId: null, detectionId: null, severity: "info", read: true, createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7), ownerId: DEMO_USER_ID },
    { id: 6, uuid: randomUUID(), type: "high_similarity", title: "High Similarity: Medical Imaging Paper", message: "92% match found on Scribd for Computer Vision in Medical Imaging paper.", contentId: contentItems[4].uuid, detectionId: null, severity: "critical", read: false, createdAt: new Date(now.getTime() - 1000 * 60 * 45), ownerId: DEMO_USER_ID },
  ];
  setRows(alertTable, alerts);
  setRows(blockchainRecordTable, []);

  console.log("[in-memory db] Seeded: 6 content, 60 detections, 6 alerts");
}

seedDatabase();
