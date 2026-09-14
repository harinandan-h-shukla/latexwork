import os from "node:os";
import path from "node:path";

export interface AgentConfig {
  port: number;
  workDir: string;
  allowedOrigins: string[];
  maxProjectSizeMb: number;
  maxFiles: number;
  defaultTimeoutMs: number;
  maxTimeoutMs: number;
}

const DEFAULT_PORT = 47823;
const DEFAULT_ALLOWED_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"];
const DEFAULT_MAX_PROJECT_SIZE_MB = 50;
const MAX_FILES = 500;
const DEFAULT_TIMEOUT_MS = 60000;
const MAX_TIMEOUT_MS = 180000;

function parseArgList(argv: string[], flag: string): string[] {
  const values: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === flag && i + 1 < argv.length) {
      values.push(argv[i + 1]);
    }
  }
  return values;
}

function parseArgValue(argv: string[], flag: string): string | undefined {
  const idx = argv.indexOf(flag);
  if (idx === -1 || idx + 1 >= argv.length) return undefined;
  return argv[idx + 1];
}

export function parseConfig(argv: string[] = process.argv.slice(2)): AgentConfig {
  const envPort = process.env.INKWELL_AGENT_PORT ? Number(process.env.INKWELL_AGENT_PORT) : undefined;
  const cliPort = parseArgValue(argv, "--port");
  const port = cliPort ? Number(cliPort) : envPort ?? DEFAULT_PORT;

  const cliWorkdir = parseArgValue(argv, "--workdir");
  const workDir = cliWorkdir
    ? path.resolve(cliWorkdir)
    : path.join(os.tmpdir(), "inkwell-agent-work");

  const envOrigins = process.env.INKWELL_AGENT_ALLOWED_ORIGINS
    ? process.env.INKWELL_AGENT_ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
    : undefined;
  const cliOrigins = parseArgList(argv, "--allow-origin");
  const allowedOrigins =
    cliOrigins.length > 0 ? cliOrigins : envOrigins && envOrigins.length > 0 ? envOrigins : DEFAULT_ALLOWED_ORIGINS;

  const cliMaxSize = parseArgValue(argv, "--max-project-size-mb");
  const maxProjectSizeMb = cliMaxSize ? Number(cliMaxSize) : DEFAULT_MAX_PROJECT_SIZE_MB;

  return {
    port: Number.isFinite(port) && port > 0 ? port : DEFAULT_PORT,
    workDir,
    allowedOrigins,
    maxProjectSizeMb: Number.isFinite(maxProjectSizeMb) && maxProjectSizeMb > 0 ? maxProjectSizeMb : DEFAULT_MAX_PROJECT_SIZE_MB,
    maxFiles: MAX_FILES,
    defaultTimeoutMs: DEFAULT_TIMEOUT_MS,
    maxTimeoutMs: MAX_TIMEOUT_MS,
  };
}
