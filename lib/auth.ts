import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { db } from "@/lib/db";
import { schema } from "@/lib/db/schema";

export const auth = betterAuth({
  appName: "Econo-Shield",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  secret:
    process.env.BETTER_AUTH_SECRET ??
    "econo-shield-local-development-secret-change-me",
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
    maxPasswordLength: 128
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24
  },
  trustedOrigins: [process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"]
});
