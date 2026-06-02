// Backward-compatible entrypoint for existing PM2/start commands.
import { startServer } from "./server.js";

startServer();
