import axios from "axios";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

export const configSchema = z.object({
  baseUrl: z
    .string()
    .default("https://demo-api.cyber-i.com")
    .describe("API base URL (예: https://demo-api.cyber-i.com)"),
  authKey: z
    .string()
    .default("19295064DEBE4954B259E16A49D2F15711540431")
    .describe("요청 헤더 AUTH_KEY 값 (필요 없으면 비워도 됨)"),
  timeoutMs: z.number().default(5000).describe("HTTP timeout (ms)"),
});

type Config = z.infer<typeof configSchema>;

function makeHttp(config: Config) {
  return axios.create({
    baseURL: config.baseUrl,
    timeout: config.timeoutMs,
    headers: {
      "Content-Type": "application/json",
      ...(config.authKey ? { AUTH_KEY: config.authKey } : {}),
    },
  });
}

export default function createServer({ config }: { config: Config }) {
  console.error(
    "[BOOT] sdk",
    require("@modelcontextprotocol/sdk/package.json").version
  );
  console.error("[BOOT] zod", require("zod/package.json").version);

  console.error("[BOOT] createServer entered", config);

  process.on("unhandledRejection", (e) =>
    console.error("[unhandledRejection]", e)
  );
  process.on("uncaughtException", (e) =>
    console.error("[uncaughtException]", e)
  );

  const server = new McpServer({
    name: "cyber-mcp-demo",
    version: "1.0.0",
  });

  const http = makeHttp(config);

  // 1) getUserInfo(clientId)
  server.tool(
    "getUserInfo",
    "clientId로 사용자 정보를 조회합니다.",
    {
      clientId: z.string().describe("조회할 clientId (예: test26)"),
    },
    async ({ clientId }) => {
      const res = await http.get("/svc/mcp/getUserInfo", {
        params: { clientId },
      });
      const list = res.data?.OutBlock_1 ?? [];
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ users: list }, null, 2),
          },
        ],
      };
    }
  );

  // 2) getClient()
  server.tool(
    "getClient",
    "등록된 클라이언트 목록을 조회합니다. [BUILD-TEST-001]",
    {},
    async () => {
      const res = await http.get("/svc/mcp/getClient");
      const list = res.data?.OutBlock_1 ?? [];
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ clients: list }, null, 2),
          },
        ],
      };
    }
  );

  // 3) getApiPath()
  server.tool(
    "getApiPath",
    "API Path(메뉴/경로) 목록을 조회합니다.",
    {},
    async () => {
      const res = await http.get("/svc/mcp/apipath");
      const list = res.data?.OutBlock_1 ?? [];
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ paths: list }, null, 2),
          },
        ],
      };
    }
  );

  console.error("[DEBUG] tools registered", [
    "getUserInfo",
    "getClient",
    "getApiPath",
  ]);

  // Smithery 요구사항: MCP server object 반환
  return server.server;
}
