import { z } from "zod";
export function config(env: Record<string, string | undefined> = process.env) {
  const c = z
    .object({
      APP_MODE: z.enum(["demo", "live"]).default("demo"),
      MODEL_MODE: z.enum(["mock", "live"]).default("mock"),
      SMALL_CELL_THRESHOLD: z.coerce.number().int().min(10).default(10),
      FOLLOW_UP_DAYS: z.coerce.number().int().min(1).max(90).default(7),
      MODEL_PROVIDER: z.enum(["ollama", "openai"]).default("ollama"),
      OPENAI_API_KEY: z.string().trim().optional(),
      OPENAI_MODEL: z
        .string()
        .regex(/^[a-zA-Z0-9_.-]+$/)
        .default("gpt-6-luna"),
      ALLOW_EXTERNAL_MODEL: z.enum(["true", "false"]).default("false"),
      MAX_MODEL_CONCURRENCY: z.coerce.number().int().min(1).max(8).default(4),
      OLLAMA_MODEL: z
        .string()
        .regex(/^[a-zA-Z0-9_.-]+:[a-zA-Z0-9_.-]+$/)
        .refine((v) => !v.toLowerCase().includes("cloud"), "Chỉ model local")
        .optional(),
      MODEL_TIMEOUT_MS: z.coerce
        .number()
        .int()
        .min(1000)
        .max(180000)
        .default(90000),
    })
    .parse(env);
  if (c.APP_MODE !== "demo")
    throw new Error(
      "PILOT_BLOCKED: chỉ chạy demo; dùng học sinh thật cần duyệt nội dung, chính sách, hỗ trợ và xác thực thật.",
    );
  if (
    c.MODEL_MODE === "live" &&
    c.MODEL_PROVIDER === "ollama" &&
    !c.OLLAMA_MODEL
  )
    throw new Error("Thiếu OLLAMA_MODEL cho LLM local.");
  return c;
}
