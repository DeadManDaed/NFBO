// api/_handlers/auth/session.js
const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || '';
let redis;
if (REDIS_URL) {
  if (!global.__REDIS) {
    global.__REDIS = new Redis(REDIS_URL);
  }
  redis = global.__REDIS;
}

const PREFIX = process.env.SESSION_KEY_PREFIX || 'sess:';
const MEMORY = new Map();
const DEFAULT_TTL = Number(process.env.SESSION_TTL_SECONDS || 60 * 60 * 24 * 30);

async function setSession(sessionId, data, ttlSeconds = DEFAULT_TTL) {
  const payload = JSON.stringify(data);
  const key = PREFIX + sessionId;
  if (redis) {
    await redis.set(key, payload, 'EX', ttlSeconds);
  } else {
    MEMORY.set(key, { payload, expiresAt: Date.now() + ttlSeconds * 1000 });
  }
}

async function getSession(sessionId) {
  if (!sessionId) return null;
  const key = PREFIX + sessionId;
  if (redis) {
    const v = await redis.get(key);
    return v ? JSON.parse(v) : null;
  } else {
    const entry = MEMORY.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      MEMORY.delete(key);
      return null;
    }
    return JSON.parse(entry.payload);
  }
}

async function deleteSession(sessionId) {
  if (!sessionId) return;
  const key = PREFIX + sessionId;
  if (redis) {
    await redis.del(key);
  } else {
    MEMORY.delete(key);
  }
}

module.exports = { setSession, getSession, deleteSession };