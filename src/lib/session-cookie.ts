export const COOKIE = "cop31_session";

export function sessionSecret() {
  return new TextEncoder().encode(process.env.AUTH_SECRET || "cop31-sb-hazirlik-secret-change-me");
}
