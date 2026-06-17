import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function getRequiredSession() {
  const session = await auth.api.getSession({
    headers: headers()
  });

  if (!session?.user) {
    return null;
  }

  return session;
}
