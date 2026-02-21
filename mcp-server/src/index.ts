import { parseArgs } from "node:util";
import { BacklogClient } from "./api/client.js";
import { createServer } from "./server.js";
import { runStdio } from "./transport/stdio.js";
import { runSSE } from "./transport/sse.js";

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    transport: { type: "string", default: "stdio" },
    port: { type: "string", default: "3001" },
  },
});

const apiUrl = process.env.BACKLOG_API_URL ?? "http://localhost:3000/api";
const apiKey = process.env.BACKLOG_API_KEY ?? "";

if (!apiKey) {
  console.error("⚠️  BACKLOG_API_KEY is not set. Requests will fail authentication.");
}

const client = new BacklogClient(apiUrl, apiKey);
const server = createServer(client);

if (values.transport === "sse") {
  const port = parseInt(values.port as string, 10);
  await runSSE(server, port);
} else {
  await runStdio(server);
}
