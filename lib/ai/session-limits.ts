// Retention and size limits for AI sessions.
//
// Sessions are working memory for the design agent, not an archive. They
// expire a fixed time after the last activity, and each user keeps only a
// handful per project, so storage stays small.
//
// Kept free of server imports so the sidebar can show the same numbers.

export const AI_SESSION_TTL_DAYS = 7;

/** A session expires this long after its last activity. */
export const AI_SESSION_TTL_MS = AI_SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

/** Sessions one user keeps per project. Creating one more drops the oldest. */
export const MAX_SESSIONS_PER_USER_PROJECT = 10;

/** Messages allowed in one session before the user must start a new one. */
export const MAX_MESSAGES_PER_SESSION = 60;

/** Longest message text accepted from the client. */
export const MAX_MESSAGE_LENGTH = 4000;

export const MAX_SESSION_TITLE_LENGTH = 80;

export const DEFAULT_SESSION_TITLE = "New chat";
