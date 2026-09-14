import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Must run before any other app modules read process.env (ESM import order).
// Pinata keys (PINATA_JWT or PINATA_API_KEY + PINATA_SECRET_API_KEY) belong only in server env files — never in the frontend.
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config();
