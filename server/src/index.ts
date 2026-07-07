import "dotenv/config";
import cors from "cors";
import express from "express";
import { createEventRoutes } from "./routes/eventRoutes.js";
import { authRoutes } from "./routes/authRoutes.js";
import { publicRoutes } from "./routes/publicRoutes.js";
import { leadRoutes } from "./routes/leadRoutes.js";
import { dashboardRoutes } from "./routes/dashboardRoutes.js";
import { botRoutes } from "./routes/botRoutes.js";
import { errorHandler } from "./utils/errors.js";
import { startScheduler } from "./scheduler.js";

const app = express();
const port = Number(process.env.PORT || 4000);
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const publicClientUrl = process.env.PUBLIC_CLIENT_URL || clientOrigin;

app.use(cors({ origin: clientOrigin, credentials: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/events", createEventRoutes(publicClientUrl));
app.use("/api/leads", leadRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api", botRoutes);
app.use(errorHandler);

startScheduler();

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
