import { getLocalStorageItem, setLocalStorageItem } from './utils/atomWithLocalStorage';
import { trimTrailingSlash } from '../utils/common';

export type Session = {
  baseUrl: string;
  userId: string;
  deviceId: string;
  accessToken: string;
  expiresInMs?: number;
  refreshToken?: string;
  fallbackSdkStores?: boolean;
};

export type Sessions = Session[];
export type SessionId = string;
export type SessionStoreName = {
  sync: string;
  crypto: string;
  rustCrypto: string;
};

/**
 * Migration code for old session
 */
const FALLBACK_STORE_NAME: SessionStoreName = {
  sync: 'web-sync-store',
  crypto: 'crypto-store',
  // matrix-js-sdk 的默认 Rust crypto indexeddb 前缀（用于兼容旧单账号存储）
  rustCrypto: 'matrix-js-sdk',
} as const;

export const MATRIX_SESSIONS_KEY = 'matrixSessions';
export const MATRIX_ACTIVE_SESSION_ID_KEY = 'matrixActiveSessionId';
export const MATRIX_SESSIONS_UPDATED_EVENT = 'matrixSessionsUpdated';

const dispatchSessionsUpdated = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(MATRIX_SESSIONS_UPDATED_EVENT));
};

const normalizeBaseUrl = (baseUrl: string): string => trimTrailingSlash(baseUrl);

export const getSessionId = (session: Pick<Session, 'baseUrl' | 'userId'>): SessionId =>
  `${normalizeBaseUrl(session.baseUrl)}|${session.userId}`;

export const normalizeSessionId = (sessionId: SessionId): SessionId => {
  const sepIndex = sessionId.indexOf('|');
  if (sepIndex === -1) return sessionId;
  const baseUrl = sessionId.slice(0, sepIndex);
  const userId = sessionId.slice(sepIndex + 1);
  return `${normalizeBaseUrl(baseUrl)}|${userId}`;
};

const fnv1a = (str: string): string => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

export const getSessionStoreName = (session: Session): SessionStoreName => {
  if (session.fallbackSdkStores) return FALLBACK_STORE_NAME;

  const suffix = fnv1a(getSessionId(session));
  return {
    sync: `${FALLBACK_STORE_NAME.sync}-${suffix}`,
    crypto: `${FALLBACK_STORE_NAME.crypto}-${suffix}`,
    rustCrypto: `${FALLBACK_STORE_NAME.rustCrypto}-${suffix}`,
  };
};

export function setFallbackSession(
  accessToken: string,
  deviceId: string,
  userId: string,
  baseUrl: string
) {
  localStorage.setItem('cinny_access_token', accessToken);
  localStorage.setItem('cinny_device_id', deviceId);
  localStorage.setItem('cinny_user_id', userId);
  localStorage.setItem('cinny_hs_base_url', baseUrl);
}
export const removeFallbackSession = () => {
  localStorage.removeItem('cinny_hs_base_url');
  localStorage.removeItem('cinny_user_id');
  localStorage.removeItem('cinny_device_id');
  localStorage.removeItem('cinny_access_token');
};
export const getFallbackSession = (): Session | undefined => {
  const baseUrlRaw = localStorage.getItem('cinny_hs_base_url');
  const userId = localStorage.getItem('cinny_user_id');
  const deviceId = localStorage.getItem('cinny_device_id');
  const accessToken = localStorage.getItem('cinny_access_token');

  if (baseUrlRaw && userId && deviceId && accessToken) {
    const session: Session = {
      baseUrl: normalizeBaseUrl(baseUrlRaw),
      userId,
      deviceId,
      accessToken,
      fallbackSdkStores: true,
    };

    return session;
  }

  return undefined;
};
/**
 * End of migration code for old session
 */

const normalizeSession = (session: Session): Session => ({
  ...session,
  baseUrl: normalizeBaseUrl(session.baseUrl),
});

const readSessionsFromStorage = (): Sessions =>
  getLocalStorageItem<Sessions>(MATRIX_SESSIONS_KEY, []).map(normalizeSession);

const writeSessionsToStorage = (sessions: Sessions) => {
  setLocalStorageItem(MATRIX_SESSIONS_KEY, sessions);
  dispatchSessionsUpdated();
};

export const getActiveSessionId = (): SessionId | undefined => {
  const sessionId = localStorage.getItem(MATRIX_ACTIVE_SESSION_ID_KEY) ?? undefined;
  if (!sessionId) return undefined;
  const normalized = normalizeSessionId(sessionId);
  if (normalized !== sessionId) {
    localStorage.setItem(MATRIX_ACTIVE_SESSION_ID_KEY, normalized);
  }
  return normalized;
};

export const setActiveSessionId = (sessionId?: SessionId): void => {
  if (!sessionId) {
    localStorage.removeItem(MATRIX_ACTIVE_SESSION_ID_KEY);
    return;
  }
  localStorage.setItem(MATRIX_ACTIVE_SESSION_ID_KEY, normalizeSessionId(sessionId));
};

const upsertSessionToList = (sessions: Sessions, session: Session): Sessions => {
  const normalized = normalizeSession(session);
  const sessionId = getSessionId(normalized);

  const nextSessions = [...sessions];
  const idx = nextSessions.findIndex((s) => getSessionId(s) === sessionId);
  if (idx === -1) {
    nextSessions.push(normalized);
    return nextSessions;
  }

  const prev = nextSessions[idx];
  nextSessions.splice(idx, 1, {
    ...prev,
    ...normalized,
    fallbackSdkStores: prev.fallbackSdkStores ?? normalized.fallbackSdkStores,
  });
  return nextSessions;
};

export const getSessions = (): Sessions => {
  let sessions = readSessionsFromStorage();
  let mutated = false;

  const fallbackSession = getFallbackSession();
  if (fallbackSession) {
    removeFallbackSession();
    sessions = upsertSessionToList(sessions, fallbackSession);
    mutated = true;
  }

  const activeSessionId = getActiveSessionId();
  if (sessions.length === 0) {
    if (activeSessionId) setActiveSessionId(undefined);
    if (mutated) writeSessionsToStorage(sessions);
    return sessions;
  }

  const normalizedActiveSessionId = activeSessionId ? normalizeSessionId(activeSessionId) : undefined;
  const activeExists =
    normalizedActiveSessionId && sessions.some((s) => getSessionId(s) === normalizedActiveSessionId);
  if (!activeExists) {
    setActiveSessionId(getSessionId(sessions[0]));
  }

  if (mutated) writeSessionsToStorage(sessions);
  return sessions;
};

export const getActiveSession = (): Session | undefined => {
  const sessions = getSessions();
  const activeSessionId = getActiveSessionId();
  if (sessions.length === 0) return undefined;

  const active = activeSessionId
    ? sessions.find((s) => getSessionId(s) === normalizeSessionId(activeSessionId))
    : undefined;

  if (active) return active;

  const first = sessions[0];
  setActiveSessionId(getSessionId(first));
  return first;
};

export const upsertSession = (session: Session): SessionId => {
  const sessions = getSessions();
  const nextSessions = upsertSessionToList(sessions, session);
  writeSessionsToStorage(nextSessions);

  const sessionId = getSessionId(session);
  setActiveSessionId(sessionId);
  return sessionId;
};

export const removeSession = (sessionId: SessionId): Session | undefined => {
  const normalizedSessionId = normalizeSessionId(sessionId);
  const sessions = getSessions();
  const idx = sessions.findIndex((s) => getSessionId(s) === normalizedSessionId);
  if (idx === -1) return undefined;

  const removed = sessions[idx];
  const nextSessions = sessions.filter((_, i) => i !== idx);
  writeSessionsToStorage(nextSessions);

  const activeSessionId = getActiveSessionId();
  if (activeSessionId === normalizedSessionId) {
    if (nextSessions.length > 0) {
      setActiveSessionId(getSessionId(nextSessions[0]));
    } else {
      setActiveSessionId(undefined);
    }
  }

  return removed;
};

export const removeActiveSession = (): Session | undefined => {
  const activeSessionId = getActiveSessionId();
  if (!activeSessionId) return undefined;
  return removeSession(activeSessionId);
};

export const clearAllSessions = (): void => {
  localStorage.removeItem(MATRIX_SESSIONS_KEY);
  localStorage.removeItem(MATRIX_ACTIVE_SESSION_ID_KEY);
  removeFallbackSession();
  dispatchSessionsUpdated();
};
