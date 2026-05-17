import app from "./app";
import { logger } from "./lib/logger";
import express from "express";
import path from "node:path";

const port = Number(process.env["PORT"] ?? 3001);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${process.env["PORT"]}"`);
}

// Serve built client if CLIENT_DIST is set
const clientDist = process.env["CLIENT_DIST"];
if (clientDist) {
  app.use(express.static(clientDist));
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.resolve(clientDist, "index.html"));
  });
}
app.listen(port, () => {
  logger.info({ port }, "Server listening");
});
