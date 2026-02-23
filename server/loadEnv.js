import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnvPath = path.resolve(__dirname, "../.env");
const serverEnvPath = path.resolve(__dirname, "./.env");

// Load unified root env first, then fall back to server/.env for legacy local setups.
dotenv.config({ path: rootEnvPath });
dotenv.config({ path: serverEnvPath, override: false });
