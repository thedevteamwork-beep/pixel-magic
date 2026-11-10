import { randomUUID } from "node:crypto";
import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  SignJWT,
  type JWK,
} from "jose";

const { publicKey, privateKey } = await generateKeyPair("ES256");
const publicJwk: JWK = {
  ...(await exportJWK(publicKey)),
  kid: "test-key",
  alg: "ES256",
};

export const testJwks = createLocalJWKSet({ keys: [publicJwk] });

export type TokenClaims = Partial<{
  sub: string;
  email: string | null;
  role: string;
  is_anonymous: boolean;
  iss: string;
  exp: number;
}>;

export async function signToken(claims: TokenClaims = {}): Promise<string> {
  const email = claims.email === undefined ? "u@test.dev" : claims.email;
  return new SignJWT({
    ...(email === null ? {} : { email }),
    role: claims.role ?? "authenticated",
    ...(claims.is_anonymous === undefined
      ? {}
      : { is_anonymous: claims.is_anonymous }),
  })
    .setProtectedHeader({ alg: "ES256", kid: "test-key" })
    .setSubject(claims.sub ?? randomUUID())
    .setIssuer(claims.iss ?? "https://test.supabase.co/auth/v1")
    .setIssuedAt()
    .setExpirationTime(claims.exp ?? Math.floor(Date.now() / 1000) + 3600)
    .sign(privateKey);
}

export async function authHeader(
  userId: string,
  claims: TokenClaims = {},
): Promise<{ Authorization: string }> {
  return {
    Authorization: `Bearer ${await signToken({ ...claims, sub: userId })}`,
  };
}
