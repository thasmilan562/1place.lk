import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const FALLBACK_SERVICE_ACCOUNT = {
  type: "service_account",
  project_id: "oneplace-30cef",
  private_key_id: "e4bfdb3d4670389eb65c4d26f54c0f46b66e91e5",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCtLAh5iMqpEzOV\nZTHgxhzkdKxrqEkaGyIK5W2gkSfrq4KZKtmbhAF7Lzd++08MRIB7U8UwQc2DvCk2\n4CHL7nitu7Bx5AXLfSoTeZfPAwTKry51AKIi0exKQLZVmj1X8Mo7CGWbToevRxn4\nFOfX/ldU53wfUmnmK12ahg+fcX/PzGm7s1r67rg40TNQOSs+OgdrLTeCnWyoj4Tq\nCMiZu8w6/pa36THLccSzxgK3GzEf1j99IiRxECKGxEJ3Wc5k9lJo4SobKUbyT9HW\nj1R84W15AHzZSkpxz4/7v+FgF7d5ndK7HmfuIorsu7dZvIX9vtFEY9Q0KhNwDO/6\n5IbgDb3jAgMBAAECggEAFq2u6RunpBTGVfOhYJURW5SGsA1N5YQAJU/T14oATGDI\nWFQVmMQ6MsOwOjT3LogaELdGb6zDw/4e96If9Zu5ZNHbqE6luPcfTNrzrUHxSAnr\nxO7cTOsTossZay8pMXHF9OKDS/TbgseGTcg5xJOjzulchqLoXiL3vdt+AvIo5tw1\nzgybVh3uThvJqheV2At5RCSLOyJp1k/YJa66Q4dfl9qStX8qE4BX8yGxspKFesQj\nOGv7ZCEWgy/tDC+EtV78EbhJBdjPPFyLOtWIqanFlGpa9meOS5I+iW5r3hwKgJQo\n/0bMDUMGhZudAgPYcdqfap19dZ5jV9PrAWJ6M1aBYQKBgQDXJaUep4UxGefbXYAJ\n9pphW6wPAnjtm71nx2JPTkPcPbG2gDUHWY1n97gakMv6MLTY0sQ3JgDgzji/PLt6\nnXAHalZjWKWfnx41k+xzZ1GkhGiEQ/aOM1FuofQnpZzq7DdbuoflwiBKAwYFRaCH\nxDzIyJeHYtbdCgYqTGI3iVdQrQKBgQDODfhSHj3ZAZQLIsSV77ty2R/mNqNfplzW\niaYJtlJXVc2758ohsgxtVZjrFa3TeHK2HAOI/V/U5tgaT+sYu+u+REnKMix8LeVi\nIo8MiX+U1MeN+hGyNVRZPMZbiXxU8fqZ5b/PUviiunqPHKJsDwWD0D4eq9OPxn2u\nBPb3ylfKzwKBgQC7A18HSWiOaM1QsnKktnY1YKEsHuMM705xki/Tbd2w6PO8Bq+R\npvcyw3KFrQ2ReZsJyhODOIaU4s0S9nCkwYtq9rUHADxfhsmUmvNy0QF3txy+s/Dy\nZItJVn/LorrGvfPUyUxtnBPDIeOu23oR6bNIeIy2w2SvmJIJXIIXckuytQKBgCW4\nPvXhXVcFR/GF6tC7sufCQWmmJOAUlzgauI9cldQw+9ljBAiJDGdTXQvjyw9EJFOb\n6zW/lDRoEbU3XgUIGY6Z95wQ9T3CNRRy2RblcLpw/RrLZUPnKUqwqmsFTwJJzaMw\ngJ1WRfecBWV/S2hWk57elxCMSc0u+8DIXeFcZBfXAoGATnGBt6P56rfBVCa0gmXH\n14/+ge8b2UKWGgcZkwjof6x7L+OGDeSeNFzvcd6zGplXCvM5dSrNrKjfsf80f08j\nBIpqZMOZPub+4phIf9wfVrs7sWOfqF9ukGqJVJiDrUxoThm+OQtL3hfXDcpXR6av\npzfD+AlxuFyOGJBS/ndkNVo=\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-fbsvc@oneplace-30cef.iam.gserviceaccount.com",
  client_id: "108293561859386595403",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40oneplace-30cef.iam.gserviceaccount.com",
  universe_domain: "googleapis.com",
};

function parseServiceAccount(): { project_id: string; client_email: string; private_key: string } {
  const raw = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON;
  if (raw && typeof raw === "string") {
    let cleaned = raw.trim();
    if ((cleaned.startsWith("'") && cleaned.endsWith("'")) || (cleaned.startsWith('"') && cleaned.endsWith('"'))) {
      cleaned = cleaned.slice(1, -1).trim();
    }
    try {
      const parsed = JSON.parse(cleaned);
      if (parsed.project_id && parsed.client_email && parsed.private_key) {
        return parsed;
      }
    } catch (e) {
      console.warn("[Firebase Admin] Failed to parse process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON, using fallback:", e);
    }
  }

  return FALLBACK_SERVICE_ACCOUNT;
}

function getAdminApp() {
  const existing = getApps().find((app) => app.name === "oneplace-server");
  if (existing) return existing;

  const serviceAccount = parseServiceAccount();

  return initializeApp({
    credential: cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key.replace(/\\n/g, "\n"),
    }),
    projectId: serviceAccount.project_id,
  }, "oneplace-server");
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}

export function getServerAdminAuth() {
  return getAuth(getAdminApp());
}
