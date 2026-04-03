import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Must run before any other app modules read process.env (ESM import order).
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config();
