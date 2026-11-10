import crypto from "crypto";

interface ServiceAccountCredentials {
  project_id: string;
  client_email: string;
  private_key: string;
}

function parseServiceAccount(): ServiceAccountCredentials {
  const raw = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON;
  if (!raw || typeof raw !== "string" || !raw.trim()) {
    throw new Error("FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON must be configured for server-side Firebase access.");
  }

  let cleaned = raw.trim();
  if ((cleaned.startsWith("'") && cleaned.endsWith("'")) || (cleaned.startsWith('"') && cleaned.endsWith('"'))) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  let parsed: { project_id?: unknown; client_email?: unknown; private_key?: unknown };
  try {
    parsed = JSON.parse(cleaned) as typeof parsed;
  } catch {
    throw new Error("FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON is not valid JSON.");
  }

  if (
    typeof parsed.project_id !== "string" ||
    typeof parsed.client_email !== "string" ||
    typeof parsed.private_key !== "string"
  ) {
    throw new Error("Firebase Admin service account JSON must include project_id, client_email, and private_key.");
  }

  const clientProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "oneplace-30cef";
  if (parsed.project_id !== clientProjectId) {
    throw new Error(
      `Firebase Admin project "${parsed.project_id}" does not match the storefront project "${clientProjectId}".`
    );
  }

  return {
    project_id: parsed.project_id,
    client_email: parsed.client_email,
    private_key: parsed.private_key.replace(/\\n/g, "\n"),
  };
}

function base64UrlEncode(input: string | Buffer): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signJwtRs256(payload: Record<string, unknown>, privateKey: string): string {
  const header = { alg: "RS256", typ: "JWT" };
  const signingInput = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign(privateKey);
  return `${signingInput}.${base64UrlEncode(signature)}`;
}

let cachedAccessToken: { token: string; projectId: string; expiresAtMs: number } | null = null;

async function getGoogleAccessToken(sa: ServiceAccountCredentials): Promise<string> {
  const nowMs = Date.now();
  if (
    cachedAccessToken &&
    cachedAccessToken.projectId === sa.project_id &&
    cachedAccessToken.expiresAtMs - nowMs > 300_000
  ) {
    return cachedAccessToken.token;
  }

  const iat = Math.floor(nowMs / 1000);
  const assertion = signJwtRs256(
    {
      iss: sa.client_email,
      sub: sa.client_email,
      aud: "https://oauth2.googleapis.com/token",
      iat,
      exp: iat + 3600,
      scope: [
        "https://www.googleapis.com/auth/datastore",
        "https://www.googleapis.com/auth/identitytoolkit",
        "https://www.googleapis.com/auth/cloud-platform",
      ].join(" "),
    },
    sa.private_key
  );

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }).toString(),
    cache: "no-store",
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Google OAuth2 token exchange failed (HTTP ${response.status}): ${errText.slice(0, 200)}`);
  }

  const tokenData = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!tokenData.access_token) {
    throw new Error("Google OAuth2 token response did not include an access_token.");
  }

  cachedAccessToken = {
    token: tokenData.access_token,
    projectId: sa.project_id,
    expiresAtMs: nowMs + (Number(tokenData.expires_in) || 3600) * 1000,
  };
  return cachedAccessToken.token;
}

class ArrayUnionTransform {
  readonly elements: unknown[];
  constructor(elements: unknown[]) {
    this.elements = elements;
  }
}

export const FieldValue = {
  arrayUnion(...elements: unknown[]): ArrayUnionTransform {
    return new ArrayUnionTransform(elements);
  },
};

type FirestoreValue =
  | { nullValue: null }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { timestampValue: string }
  | { stringValue: string }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } };

interface FirestoreRestDocument {
  name?: string;
  fields?: Record<string, FirestoreValue>;
  createTime?: string;
  updateTime?: string;
}

function toFirestoreValue(value: unknown): FirestoreValue {
  if (value === null || value === undefined) {
    return { nullValue: null };
  }
  if (typeof value === "boolean") {
    return { booleanValue: value };
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return { nullValue: null };
    if (Number.isInteger(value) && value >= Number.MIN_SAFE_INTEGER && value <= Number.MAX_SAFE_INTEGER) {
      return { integerValue: String(value) };
    }
    return { doubleValue: value };
  }
  if (typeof value === "string") {
    return { stringValue: value };
  }
  if (value instanceof Date) {
    return { timestampValue: value.toISOString() };
  }
  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map((item) => toFirestoreValue(item === undefined ? null : item)),
      },
    };
  }
  if (typeof value === "object") {
    const maybeTimestamp = value as { toDate?: () => Date };
    if (typeof maybeTimestamp.toDate === "function") {
      return { timestampValue: maybeTimestamp.toDate().toISOString() };
    }
    return {
      mapValue: {
        fields: toFirestoreFields(value as Record<string, unknown>),
      },
    };
  }
  return { stringValue: String(value) };
}

function toFirestoreFields(obj: Record<string, unknown>): Record<string, FirestoreValue> {
  const fields: Record<string, FirestoreValue> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined || val instanceof ArrayUnionTransform) continue;
    fields[key] = toFirestoreValue(val);
  }
  return fields;
}

function fromFirestoreValue(val: FirestoreValue | undefined): any {
  if (!val || typeof val !== "object") return null;
  if ("nullValue" in val) return null;
  if ("booleanValue" in val) return Boolean(val.booleanValue);
  if ("integerValue" in val) return Number(val.integerValue);
  if ("doubleValue" in val) return Number(val.doubleValue);
  if ("timestampValue" in val) return String(val.timestampValue);
  if ("stringValue" in val) return String(val.stringValue);
  if ("arrayValue" in val) {
    return (val.arrayValue?.values || []).map((item) => fromFirestoreValue(item));
  }
  if ("mapValue" in val) {
    return fromFirestoreFields(val.mapValue?.fields || {});
  }
  return null;
}

function fromFirestoreFields(fields: Record<string, FirestoreValue> | undefined): Record<string, any> {
  const result: Record<string, any> = {};
  if (!fields) return result;
  for (const [key, val] of Object.entries(fields)) {
    result[key] = fromFirestoreValue(val);
  }
  return result;
}

function escapeFieldPath(key: string): string {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key) ? key : `\`${key.replace(/`/g, "\\`")}\``;
}

function buildWriteOperation(
  fullDocName: string,
  data: Record<string, any>,
  options?: { merge?: boolean }
): Record<string, unknown> {
  const fields = toFirestoreFields(data);
  const fieldPaths: string[] = [];
  const updateTransforms: Array<Record<string, unknown>> = [];

  for (const [key, val] of Object.entries(data)) {
    if (val === undefined) continue;
    const escapedPath = escapeFieldPath(key);
    if (val instanceof ArrayUnionTransform) {
      updateTransforms.push({
        fieldPath: escapedPath,
        appendMissingElements: {
          values: val.elements.map((item) => toFirestoreValue(item)),
        },
      });
    } else {
      fieldPaths.push(escapedPath);
    }
  }

  const writeOp: Record<string, unknown> = {
    update: {
      name: fullDocName,
      fields,
    },
  };

  if (options?.merge) {
    writeOp.updateMask = { fieldPaths };
  }

  if (updateTransforms.length > 0) {
    writeOp.updateTransforms = updateTransforms;
  }

  return writeOp;
}

export class AdminDocSnapshot {
  readonly id: string;
  readonly ref: AdminDocRef;
  readonly exists: boolean;
  private readonly _data: Record<string, any> | undefined;

  constructor(ref: AdminDocRef, exists: boolean, data?: Record<string, any>) {
    this.id = ref.id;
    this.ref = ref;
    this.exists = exists;
    this._data = data;
  }

  data(): Record<string, any> | undefined {
    return this._data;
  }
}

export class AdminQuerySnapshot {
  readonly docs: AdminDocSnapshot[];
  readonly empty: boolean;
  readonly size: number;

  constructor(docs: AdminDocSnapshot[]) {
    this.docs = docs;
    this.empty = docs.length === 0;
    this.size = docs.length;
  }
}

export class AdminDocRef {
  readonly firestore: AdminFirestore;
  readonly path: string;
  readonly id: string;

  constructor(firestore: AdminFirestore, path: string) {
    this.firestore = firestore;
    this.path = path.replace(/^\/+|\/+$/g, "");
    const segments = this.path.split("/");
    this.id = segments[segments.length - 1] || "";
  }

  collection(subcollectionName: string): AdminCollectionRef {
    return new AdminCollectionRef(this.firestore, `${this.path}/${subcollectionName}`);
  }

  async get(): Promise<AdminDocSnapshot> {
    const doc = await this.firestore._getDocument(this.path);
    if (!doc) {
      return new AdminDocSnapshot(this, false, undefined);
    }
    return new AdminDocSnapshot(this, true, fromFirestoreFields(doc.fields));
  }

  async set(data: Record<string, any>, options?: { merge?: boolean }): Promise<void> {
    const batch = this.firestore.batch();
    batch.set(this, data, options);
    await batch.commit();
  }

  async update(data: Record<string, any>): Promise<void> {
    const batch = this.firestore.batch();
    batch.update(this, data);
    await batch.commit();
  }

  async delete(): Promise<void> {
    await this.firestore._deleteDocument(this.path);
  }
}

interface WhereFilterSpec {
  field: string;
  op: string;
  value: unknown;
}

interface OrderBySpec {
  field: string;
  direction: "asc" | "desc";
}

function formatFirestoreError(op: string, status: number, errText: string, projectId: string): Error {
  if (status === 429 || errText.includes("RESOURCE_EXHAUSTED")) {
    return new Error(
      `Firestore quota exceeded (HTTP 429 RESOURCE_EXHAUSTED) on project "${projectId}" during ${op}.`
    );
  }
  return new Error(`Firestore ${op} failed (HTTP ${status}): ${errText.slice(0, 200)}`);
}

export class AdminQuery {
  protected readonly _firestore: AdminFirestore;
  protected readonly _collectionPath: string;
  protected readonly _filters: WhereFilterSpec[];
  protected readonly _limitCount?: number;
  protected readonly _orderBy: OrderBySpec[];

  constructor(
    firestore: AdminFirestore,
    collectionPath: string,
    filters: WhereFilterSpec[] = [],
    limitCount?: number,
    orderBy: OrderBySpec[] = []
  ) {
    this._firestore = firestore;
    this._collectionPath = collectionPath.replace(/^\/+|\/+$/g, "");
    this._filters = filters;
    this._limitCount = limitCount;
    this._orderBy = orderBy;
  }

  where(field: string, op: string, value: unknown): AdminQuery {
    return new AdminQuery(
      this._firestore,
      this._collectionPath,
      [...this._filters, { field, op, value }],
      this._limitCount,
      this._orderBy
    );
  }

  orderBy(field: string, direction: "asc" | "desc" = "asc"): AdminQuery {
    return new AdminQuery(
      this._firestore,
      this._collectionPath,
      this._filters,
      this._limitCount,
      [...this._orderBy, { field, direction }]
    );
  }

  limit(count: number): AdminQuery {
    return new AdminQuery(
      this._firestore,
      this._collectionPath,
      this._filters,
      count,
      this._orderBy
    );
  }

  async get(): Promise<AdminQuerySnapshot> {
    if (this._filters.length === 0 && this._orderBy.length === 0) {
      return this._firestore._listCollection(this._collectionPath, this._limitCount);
    }
    return this._firestore._runStructuredQuery(
      this._collectionPath,
      this._filters,
      this._limitCount,
      this._orderBy
    );
  }
}

export class AdminCollectionRef extends AdminQuery {
  readonly id: string;
  readonly path: string;

  constructor(firestore: AdminFirestore, path: string) {
    super(firestore, path);
    this.path = this._collectionPath;
    const segments = this.path.split("/");
    this.id = segments[segments.length - 1] || "";
  }

  doc(docId?: string): AdminDocRef {
    const resolvedId =
      docId && docId.trim() ? docId.trim() : crypto.randomBytes(10).toString("hex");
    return new AdminDocRef(this._firestore, `${this.path}/${resolvedId}`);
  }

  async listPage(
    pageSize = 50,
    pageToken?: string
  ): Promise<{ docs: AdminDocSnapshot[]; nextPageToken?: string }> {
    return this._firestore._listCollectionPage(this.path, pageSize, pageToken);
  }
}

export class AdminWriteBatch {
  private readonly _firestore: AdminFirestore;
  private readonly _writes: Array<Record<string, unknown>> = [];

  constructor(firestore: AdminFirestore) {
    this._firestore = firestore;
  }

  set(ref: AdminDocRef, data: Record<string, any>, options?: { merge?: boolean }): this {
    this._writes.push(
      buildWriteOperation(this._firestore._fullDocName(ref.path), data, options)
    );
    return this;
  }

  update(ref: AdminDocRef, data: Record<string, any>): this {
    this._writes.push(
      buildWriteOperation(this._firestore._fullDocName(ref.path), data, { merge: true })
    );
    return this;
  }

  delete(ref: AdminDocRef): this {
    this._writes.push({
      delete: this._firestore._fullDocName(ref.path),
    });
    return this;
  }

  async commit(): Promise<void> {
    if (this._writes.length === 0) return;
    await this._firestore._commitWrites(this._writes);
  }
}

export class AdminTransaction {
  private readonly _batch: AdminWriteBatch;

  constructor(firestore: AdminFirestore) {
    this._batch = firestore.batch();
  }

  async get(ref: AdminDocRef): Promise<AdminDocSnapshot> {
    return ref.get();
  }

  set(ref: AdminDocRef, data: Record<string, any>, options?: { merge?: boolean }): this {
    this._batch.set(ref, data, options);
    return this;
  }

  update(ref: AdminDocRef, data: Record<string, any>): this {
    this._batch.update(ref, data);
    return this;
  }

  delete(ref: AdminDocRef): this {
    this._batch.delete(ref);
    return this;
  }

  async _commit(): Promise<void> {
    await this._batch.commit();
  }
}

export class AdminFirestore {
  private readonly _sa: ServiceAccountCredentials;

  constructor(sa: ServiceAccountCredentials) {
    this._sa = sa;
  }

  collection(collectionPath: string): AdminCollectionRef {
    return new AdminCollectionRef(this, collectionPath);
  }

  batch(): AdminWriteBatch {
    return new AdminWriteBatch(this);
  }

  async runTransaction<T>(updateFunction: (transaction: AdminTransaction) => Promise<T>): Promise<T> {
    const tx = new AdminTransaction(this);
    const result = await updateFunction(tx);
    await tx._commit();
    return result;
  }

  _fullDocName(docPath: string): string {
    const clean = docPath.replace(/^\/+|\/+$/g, "");
    return `projects/${this._sa.project_id}/databases/(default)/documents/${clean}`;
  }

  private _baseDocumentsUrl(): string {
    return `https://firestore.googleapis.com/v1/projects/${this._sa.project_id}/databases/(default)/documents`;
  }

  private _encodePathSegments(path: string): string {
    return path
      .split("/")
      .filter(Boolean)
      .map((seg) => encodeURIComponent(seg))
      .join("/");
  }

  async _getDocument(docPath: string): Promise<FirestoreRestDocument | null> {
    const token = await getGoogleAccessToken(this._sa);
    const url = `${this._baseDocumentsUrl()}/${this._encodePathSegments(docPath)}`;
    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw formatFirestoreError(`GET "${docPath}"`, response.status, errText, this._sa.project_id);
    }
    return (await response.json()) as FirestoreRestDocument;
  }

  async _deleteDocument(docPath: string): Promise<void> {
    const token = await getGoogleAccessToken(this._sa);
    const url = `${this._baseDocumentsUrl()}/${this._encodePathSegments(docPath)}`;
    const response = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!response.ok && response.status !== 404) {
      const errText = await response.text().catch(() => "");
      throw formatFirestoreError(`DELETE "${docPath}"`, response.status, errText, this._sa.project_id);
    }
  }

  async _commitWrites(writes: Array<Record<string, unknown>>): Promise<void> {
    const token = await getGoogleAccessToken(this._sa);
    const url = `${this._baseDocumentsUrl()}:commit`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ writes }),
      cache: "no-store",
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw formatFirestoreError("commit", response.status, errText, this._sa.project_id);
    }
  }

  async _listCollectionPage(
    collectionPath: string,
    pageSize = 50,
    pageToken?: string
  ): Promise<{ docs: AdminDocSnapshot[]; nextPageToken?: string }> {
    const token = await getGoogleAccessToken(this._sa);
    const clampedSize = Math.max(1, Math.min(300, Math.floor(pageSize)));
    const params = new URLSearchParams({ pageSize: String(clampedSize) });
    if (pageToken) params.set("pageToken", pageToken);
    const url = `${this._baseDocumentsUrl()}/${this._encodePathSegments(collectionPath)}?${params.toString()}`;
    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (response.status === 404) {
      return { docs: [], nextPageToken: undefined };
    }
    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw formatFirestoreError(`list "${collectionPath}"`, response.status, errText, this._sa.project_id);
    }

    const payload = (await response.json()) as {
      documents?: FirestoreRestDocument[];
      nextPageToken?: string;
    };

    const docs: AdminDocSnapshot[] = [];
    for (const rawDoc of payload.documents || []) {
      const docId = rawDoc.name ? rawDoc.name.split("/").pop() || "" : "";
      if (!docId) continue;
      const ref = new AdminDocRef(this, `${collectionPath}/${docId}`);
      docs.push(new AdminDocSnapshot(ref, true, fromFirestoreFields(rawDoc.fields)));
    }

    return { docs, nextPageToken: payload.nextPageToken };
  }

  async _listCollection(collectionPath: string, maxDocs = 200): Promise<AdminQuerySnapshot> {
    const docs: AdminDocSnapshot[] = [];
    let pageToken: string | undefined;
    let pageCount = 0;
    const cap = Math.max(1, Math.min(300, maxDocs));

    do {
      const remaining = cap - docs.length;
      if (remaining <= 0) break;
      const page = await this._listCollectionPage(collectionPath, Math.min(remaining, 200), pageToken);
      docs.push(...page.docs);
      pageToken = page.nextPageToken;
      pageCount += 1;
    } while (pageToken && docs.length < cap && pageCount < 2);

    return new AdminQuerySnapshot(docs.slice(0, cap));
  }

  async _runStructuredQuery(
    collectionPath: string,
    filters: WhereFilterSpec[],
    limitCount?: number,
    orderBy: OrderBySpec[] = []
  ): Promise<AdminQuerySnapshot> {
    const token = await getGoogleAccessToken(this._sa);
    const segments = collectionPath.split("/").filter(Boolean);
    const collectionId = segments[segments.length - 1] || collectionPath;
    const parentSegments = segments.slice(0, -1);
    const parentUrl =
      parentSegments.length > 0
        ? `${this._baseDocumentsUrl()}/${this._encodePathSegments(parentSegments.join("/"))}`
        : this._baseDocumentsUrl();

    const opMap: Record<string, string> = {
      "==": "EQUAL",
      "!=": "NOT_EQUAL",
      "<": "LESS_THAN",
      "<=": "LESS_THAN_OR_EQUAL",
      ">": "GREATER_THAN",
      ">=": "GREATER_THAN_OR_EQUAL",
      "array-contains": "ARRAY_CONTAINS",
      in: "IN",
    };

    const mappedFilters = filters.map((f) => ({
      fieldFilter: {
        field: { fieldPath: escapeFieldPath(f.field) },
        op: opMap[f.op] || "EQUAL",
        value: toFirestoreValue(f.value),
      },
    }));

    const structuredQuery: Record<string, unknown> = {
      from: [{ collectionId }],
    };

    if (mappedFilters.length === 1) {
      structuredQuery.where = mappedFilters[0];
    } else if (mappedFilters.length > 1) {
      structuredQuery.where = {
        compositeFilter: {
          op: "AND",
          filters: mappedFilters,
        },
      };
    }

    if (orderBy.length > 0) {
      structuredQuery.orderBy = orderBy.map((o) => ({
        field: { fieldPath: escapeFieldPath(o.field) },
        direction: o.direction === "desc" ? "DESCENDING" : "ASCENDING",
      }));
    }

    if (typeof limitCount === "number") {
      structuredQuery.limit = limitCount;
    }

    const response = await fetch(`${parentUrl}:runQuery`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ structuredQuery }),
      cache: "no-store",
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw formatFirestoreError(`query on "${collectionPath}"`, response.status, errText, this._sa.project_id);
    }

    const results = (await response.json()) as Array<{ document?: FirestoreRestDocument }>;
    const docs: AdminDocSnapshot[] = [];

    for (const row of results || []) {
      if (!row?.document?.name) continue;
      const docId = row.document.name.split("/").pop() || "";
      if (!docId) continue;
      const ref = new AdminDocRef(this, `${collectionPath}/${docId}`);
      docs.push(new AdminDocSnapshot(ref, true, fromFirestoreFields(row.document.fields)));
    }

    return new AdminQuerySnapshot(docs);
  }
}

export interface AdminUserRecord {
  uid: string;
  email?: string;
  displayName?: string;
  phoneNumber?: string;
  photoURL?: string;
  metadata: {
    creationTime?: string;
    lastSignInTime?: string;
  };
}

export class AdminAuth {
  private readonly _sa: ServiceAccountCredentials;

  constructor(sa: ServiceAccountCredentials) {
    this._sa = sa;
  }

  async createCustomToken(uid: string, developerClaims?: Record<string, unknown>): Promise<string> {
    const iat = Math.floor(Date.now() / 1000);
    const payload: Record<string, unknown> = {
      iss: this._sa.client_email,
      sub: this._sa.client_email,
      aud: "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit",
      iat,
      exp: iat + 3600,
      uid,
    };
    if (developerClaims && Object.keys(developerClaims).length > 0) {
      payload.claims = developerClaims;
    }
    return signJwtRs256(payload, this._sa.private_key);
  }

  async listUsers(maxResults = 1000): Promise<{ users: AdminUserRecord[] }> {
    const token = await getGoogleAccessToken(this._sa);
    const url = `https://identitytoolkit.googleapis.com/v1/projects/${this._sa.project_id}/accounts:batchGet?maxResults=${encodeURIComponent(String(maxResults))}`;
    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`Firebase Auth listUsers failed (HTTP ${response.status}): ${errText.slice(0, 200)}`);
    }

    const data = (await response.json()) as {
      users?: Array<{
        localId?: string;
        email?: string;
        displayName?: string;
        phoneNumber?: string;
        photoUrl?: string;
        createdAt?: string;
        lastLoginAt?: string;
      }>;
    };

    const users: AdminUserRecord[] = (data.users || []).map((u) => ({
      uid: String(u.localId || ""),
      email: typeof u.email === "string" ? u.email : undefined,
      displayName: typeof u.displayName === "string" ? u.displayName : undefined,
      phoneNumber: typeof u.phoneNumber === "string" ? u.phoneNumber : undefined,
      photoURL: typeof u.photoUrl === "string" ? u.photoUrl : undefined,
      metadata: {
        creationTime: u.createdAt ? new Date(Number(u.createdAt)).toISOString() : undefined,
        lastSignInTime: u.lastLoginAt ? new Date(Number(u.lastLoginAt)).toISOString() : undefined,
      },
    }));

    return { users };
  }
}

export function getAdminDb(): AdminFirestore {
  return new AdminFirestore(parseServiceAccount());
}

export function getServerAdminAuth(): AdminAuth {
  return new AdminAuth(parseServiceAccount());
}

