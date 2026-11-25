
require("dotenv").config();

const { z } = require("zod");

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(5000),

  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive(),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_NAME: z.string().min(1),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("Invalid environment configuration:");
  console.error(parsedEnv.error.flatten().fieldErrors);
  process.exit(1);
}

module.exports = parsedEnv.data;
