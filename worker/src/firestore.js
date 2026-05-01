// Lightweight Firestore client for Cloudflare Workers.
//
// Uses the Firebase service account JSON to mint a Google OAuth2 access token
// (JWT signed with RS256 → token endpoint), then calls the Firestore REST API.
// No external dependencies — pure Web Crypto + fetch.

const FIRESTORE_BASE = 'https://firestore.googleapis.com/v1';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/datastore';

let _cachedToken = null; // { accessToken, expiresAt }

export class FirestoreClient {
  constructor({ projectId, serviceAccountJson }) {
    this.projectId = projectId;
    this.sa = typeof serviceAccountJson === 'string'
      ? JSON.parse(serviceAccountJson)
      : serviceAccountJson;
    this.basePath = `projects/${projectId}/databases/(default)/documents`;
  }

  async _getAccessToken() {
    if (_cachedToken && _cachedToken.expiresAt > Date.now() + 60_000) {
      return _cachedToken.accessToken;
    }
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const claims = {
      iss: this.sa.client_email,
      scope: SCOPE,
      aud: TOKEN_URL,
      exp: now + 3600,
      iat: now
    };
    const headerB64 = b64url(JSON.stringify(header));
    const claimsB64 = b64url(JSON.stringify(claims));
    const unsigned = `${headerB64}.${claimsB64}`;

    const key = await importPrivateKey(this.sa.private_key);
    const sig = await crypto.subtle.sign(
      { name: 'RSASSA-PKCS1-v1_5' },
      key,
      new TextEncoder().encode(unsigned)
    );
    const sigB64 = b64url(new Uint8Array(sig));
    const jwt = `${unsigned}.${sigB64}`;

    const tokRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    });
    if (!tokRes.ok) {
      const txt = await tokRes.text();
      throw new Error(`Token exchange failed: ${tokRes.status} ${txt}`);
    }
    const tokJson = await tokRes.json();
    _cachedToken = {
      accessToken: tokJson.access_token,
      expiresAt: Date.now() + (tokJson.expires_in * 1000)
    };
    return _cachedToken.accessToken;
  }

  async _request(method, pathOrUrl, body) {
    const token = await this._getAccessToken();
    const url = pathOrUrl.startsWith('http')
      ? pathOrUrl
      : `${FIRESTORE_BASE}/${pathOrUrl}`;
    const res = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Firestore ${method} ${pathOrUrl} → ${res.status}: ${txt}`);
    }
    if (res.status === 204) return null;
    return res.json();
  }

  async listAll(collection) {
    // Pages through every doc in a top-level collection.
    const out = [];
    let pageToken = null;
    do {
      const url = new URL(`${FIRESTORE_BASE}/${this.basePath}/${collection}`);
      url.searchParams.set('pageSize', '300');
      if (pageToken) url.searchParams.set('pageToken', pageToken);
      const data = await this._request('GET', url.toString());
      const docs = data.documents || [];
      for (const d of docs) out.push({ id: docIdFromName(d.name), data: parseDoc(d.fields) });
      pageToken = data.nextPageToken;
    } while (pageToken);
    return out;
  }

  async getDoc(collection, id) {
    try {
      const data = await this._request('GET', `${this.basePath}/${collection}/${encodeURIComponent(id)}`);
      return { id, data: parseDoc(data.fields) };
    } catch (e) {
      if (/404/.test(e.message)) return null;
      throw e;
    }
  }

  async patchDoc(collection, id, updates) {
    // updates: { fieldA: value, fieldB: value }
    const fields = Object.keys(updates);
    const url = new URL(`${FIRESTORE_BASE}/${this.basePath}/${collection}/${encodeURIComponent(id)}`);
    for (const f of fields) url.searchParams.append('updateMask.fieldPaths', f);
    return this._request('PATCH', url.toString(), { fields: encodeFields(updates) });
  }

  // Run a structured query against a collection (single-collection only here).
  async runQuery(collection, where = []) {
    const body = {
      structuredQuery: {
        from: [{ collectionId: collection }],
        ...(where.length ? { where: combineWhere(where) } : {})
      }
    };
    const data = await this._request('POST', `${this.basePath}:runQuery`, body);
    const out = [];
    for (const row of data) {
      if (row.document) out.push({ id: docIdFromName(row.document.name), data: parseDoc(row.document.fields) });
    }
    return out;
  }
}

// ───────────────── helpers ─────────────────

function b64url(input) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let bin = '';
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function importPrivateKey(pem) {
  const cleaned = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '');
  const der = Uint8Array.from(atob(cleaned), c => c.charCodeAt(0));
  return crypto.subtle.importKey(
    'pkcs8',
    der.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

function docIdFromName(name) {
  return name.split('/').pop();
}

function parseDoc(fields = {}) {
  const out = {};
  for (const [k, v] of Object.entries(fields)) out[k] = parseValue(v);
  return out;
}

function parseValue(v) {
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return new Date(v.timestampValue);
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(parseValue);
  if ('mapValue' in v) return parseDoc(v.mapValue.fields || {});
  return null;
}

function encodeFields(obj) {
  const out = {};
  for (const [k, val] of Object.entries(obj)) out[k] = encodeValue(val);
  return out;
}

function encodeValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encodeValue) } };
  if (typeof v === 'object') return { mapValue: { fields: encodeFields(v) } };
  return { nullValue: null };
}

function combineWhere(filters) {
  if (filters.length === 1) return filters[0];
  return {
    compositeFilter: {
      op: 'AND',
      filters
    }
  };
}
