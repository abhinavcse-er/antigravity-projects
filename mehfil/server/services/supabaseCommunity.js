'use strict';

// Server-only Supabase REST adapter. Uses Node's built-in fetch.
const SUPABASE_URL = String(process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
const SERVICE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const configured = Boolean(SUPABASE_URL && SERVICE_KEY);

if (Boolean(SUPABASE_URL) !== Boolean(SERVICE_KEY)) {
  throw new Error('[SUPABASE] Set both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or leave both unset.');
}

function toApiMessage(row) {
  if (!row) return null;
  return {
    id: Number(row.id), userName: row.user_name, userAvatar: row.user_avatar,
    mood: row.mood, text: row.text, isShayari: Boolean(row.is_shayari),
    likes: Number(row.likes) || 0, timestamp: Number(row.timestamp),
    ownerId: row.owner_id || null,
    editedAt: row.edited_at == null ? null : Number(row.edited_at)
  };
}

async function request(path, { method = 'GET', body, prefer } = {}) {
  if (!configured) throw new Error('[SUPABASE] Community storage is not configured.');
  const headers = { apikey: SERVICE_KEY, Authorization: 'Bearer ' + SERVICE_KEY, Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (prefer) headers.Prefer = prefer;
  const response = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10000)
  });
  const raw = await response.text();
  let data = null;
  if (raw) {
    try { data = JSON.parse(raw); }
    catch { throw new Error('[SUPABASE] Invalid JSON response (' + response.status + ').'); }
  }
  if (!response.ok) {
    const message = data && (data.message || data.details || data.hint);
    throw new Error('[SUPABASE] ' + (message || ('Request failed (' + response.status + ').')));
  }
  return data;
}

module.exports = {
  enabled: configured,
  async getMessages(limit = 40) {
    const safeLimit = Math.max(1, Math.min(100, Math.floor(Number(limit) || 40)));
    const rows = await request('community_messages?select=*&order=timestamp.desc,id.desc&limit=' + safeLimit);
    return (Array.isArray(rows) ? rows : []).map(toApiMessage).reverse();
  },
  async addMessage({ userName, userAvatar, mood, text, isShayari, ownerId }) {
    const rows = await request('community_messages?select=*', {
      method: 'POST', prefer: 'return=representation',
      body: {
        user_name: userName || 'Musafir', user_avatar: userAvatar || '🎶',
        mood: mood || 'love', text, is_shayari: Boolean(isShayari),
        likes: 0, timestamp: Date.now(), owner_id: ownerId || null, edited_at: null
      }
    });
    return toApiMessage(Array.isArray(rows) ? rows[0] : null);
  },
  async editMessage(id, ownerId, { text, isShayari }) {
    const query = new URLSearchParams({ id: 'eq.' + id, owner_id: 'eq.' + ownerId, select: '*' });
    const rows = await request('community_messages?' + query.toString(), {
      method: 'PATCH', prefer: 'return=representation',
      body: { text, is_shayari: Boolean(isShayari), edited_at: Date.now() }
    });
    return toApiMessage(Array.isArray(rows) ? rows[0] : null);
  },
  async deleteMessage(id, ownerId) {
    const query = new URLSearchParams({ id: 'eq.' + id, owner_id: 'eq.' + ownerId, select: 'id' });
    const rows = await request('community_messages?' + query.toString(), {
      method: 'DELETE', prefer: 'return=representation'
    });
    return Array.isArray(rows) && rows.length > 0;
  },
  async likeMessage(id) {
    const rows = await request('rpc/like_community_message', {
      method: 'POST', prefer: 'return=representation', body: { message_id: id }
    });
    return toApiMessage(Array.isArray(rows) ? rows[0] : null);
  }
};
