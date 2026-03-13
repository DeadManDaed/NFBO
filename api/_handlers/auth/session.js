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

const MEMORY = new Map();
const DEFAULT_TTL = Number(process.env.SESSION_TTL_SECONDS || 60 * 60 * 24 * 30);

async function setSession(sessionId, data, ttlSeconds = DEFAULT_TTL) {
  const payload = JSON.stringify(data);
  if (redis) {
    await redis.set(sessionId, payload, 'EX', ttlSeconds);
  } else {
    MEMORY.set(sessionId, { payload, expiresAt: Date.now() + ttlSeconds * 1000 });
  }
}

async function getSession(sessionId) {
  if (!sessionId) return null;
  if (redis) {
    const v = await redis.get(sessionId);
    return v ? JSON.parse(v) : null;
  } else {
    const entry = MEMORY.get(sessionId);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      MEMORY.delete(sessionId);
      return null;
    }
    return JSON.parse(entry.payload);
  }
}

async function deleteSession(sessionId) {
  if (!sessionId) return;
  if (redis) {
    await redis.del(sessionId);
  } else {
    MEMORY.delete(sessionId);
  }
}

module.exports = { setSession, getSession, deleteSession };