import * as FileSystem from "expo-file-system/legacy";
import { ConversationSession, AgentChatMessage } from "../agent/agentTypes";

const CONVERSATIONS_DIR = `${FileSystem.documentDirectory}conversations/`;
const WORKSPACES_DIR = `${FileSystem.documentDirectory}workspaces/`;

function getSafeWorkspaceId(workspaceId: string): string {
  return (workspaceId || "default").replace(/[^a-zA-Z0-9_-]/g, "_");
}

function getConversationsFile(workspaceId: string): string {
  return `${CONVERSATIONS_DIR}${getSafeWorkspaceId(workspaceId)}.json`;
}

async function ensureConversationsDir(): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(CONVERSATIONS_DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(CONVERSATIONS_DIR, { intermediates: true });
    }
  } catch (e) {
    console.error("Error ensuring conversations directory:", e);
  }
}

async function migrateLegacyConversations(workspaceId: string): Promise<void> {
  if (!workspaceId) return;
  const legacyDir = `${WORKSPACES_DIR}${workspaceId}/.ai/`;
  const legacyFile = `${legacyDir}conversations.json`;
  const newFile = getConversationsFile(workspaceId);

  try {
    const legacyInfo = await FileSystem.getInfoAsync(legacyFile);
    if (legacyInfo.exists) {
      const newInfo = await FileSystem.getInfoAsync(newFile);
      if (!newInfo.exists) {
        await ensureConversationsDir();
        await FileSystem.copyAsync({ from: legacyFile, to: newFile });
      }
      // Purge legacy .ai folder from the user workspace
      await FileSystem.deleteAsync(legacyDir, { idempotent: true });
    }
  } catch (_) {}
}

export async function listSessions(workspaceId: string): Promise<ConversationSession[]> {
  if (!workspaceId) return [];
  await ensureConversationsDir();
  await migrateLegacyConversations(workspaceId);
  const filePath = getConversationsFile(workspaceId);

  try {
    const info = await FileSystem.getInfoAsync(filePath);
    if (info.exists) {
      const data = await FileSystem.readAsStringAsync(filePath);
      const sessions: ConversationSession[] = JSON.parse(data);
      return Array.isArray(sessions) ? sessions.sort((a, b) => b.updatedAt - a.updatedAt) : [];
    }
  } catch (e) {
    console.error("Error loading conversation sessions:", e);
  }
  return [];
}

type SessionChangeListener = (workspaceId: string, sessionId?: string) => void;
const sessionChangeListeners = new Set<SessionChangeListener>();

export function subscribeSessionChanges(listener: SessionChangeListener): () => void {
  sessionChangeListeners.add(listener);
  return () => sessionChangeListeners.delete(listener);
}

export function notifySessionChanged(workspaceId: string, sessionId?: string): void {
  sessionChangeListeners.forEach((listener) => {
    try {
      listener(workspaceId, sessionId);
    } catch (e) {
      console.error("Session change listener error:", e);
    }
  });
}

export async function saveAllSessions(workspaceId: string, sessions: ConversationSession[], silent = false): Promise<void> {
  if (!workspaceId) return;
  await ensureConversationsDir();
  const filePath = getConversationsFile(workspaceId);
  try {
    await FileSystem.writeAsStringAsync(filePath, JSON.stringify(sessions, null, 2));
    if (!silent) {
      notifySessionChanged(workspaceId);
    }
  } catch (e) {
    console.error("Error saving conversation sessions:", e);
  }
}

export async function createSession(workspaceId: string, title = "Astra AI"): Promise<ConversationSession> {
  const sessions = await listSessions(workspaceId);
  const now = Date.now();
  const newSession: ConversationSession = {
    id: `session-${now}-${Math.random().toString(36).substr(2, 4)}`,
    workspaceId,
    title,
    createdAt: now,
    updatedAt: now,
    messages: [],
  };

  sessions.unshift(newSession);
  await saveAllSessions(workspaceId, sessions);
  return newSession;
}

export async function getActiveSession(workspaceId: string): Promise<ConversationSession> {
  const sessions = await listSessions(workspaceId);
  if (sessions.length > 0) {
    return sessions[0];
  }
  return await createSession(workspaceId, "Astra AI");
}

export async function loadSession(workspaceId: string, sessionId: string): Promise<ConversationSession | null> {
  const sessions = await listSessions(workspaceId);
  return sessions.find((s) => s.id === sessionId) || null;
}

export async function saveSession(workspaceId: string, session: ConversationSession): Promise<void> {
  const sessions = await listSessions(workspaceId);
  const index = sessions.findIndex((s) => s.id === session.id);
  const updatedSession = { ...session, updatedAt: Date.now() };

  if (index >= 0) {
    sessions[index] = updatedSession;
  } else {
    sessions.unshift(updatedSession);
  }

  await saveAllSessions(workspaceId, sessions);
}

export async function appendMessageToSession(
  workspaceId: string,
  sessionId: string,
  message: AgentChatMessage
): Promise<ConversationSession> {
  const sessions = await listSessions(workspaceId);
  let session = sessions.find((s) => s.id === sessionId);

  if (!session) {
    session = await createSession(workspaceId, "Astra AI");
  }

  // Update title from first user message if title is default
  let title = session.title;
  if (message.role === "user" && (title === "New Conversation" || title === "Astra AI" || title.startsWith("Chat "))) {
    title = message.text.slice(0, 30).trim() + (message.text.length > 30 ? "..." : "");
  }

  const updatedSession: ConversationSession = {
    ...session,
    title,
    updatedAt: Date.now(),
    messages: [...session.messages, message],
  };

  const updatedList = sessions.map((s) => (s.id === sessionId ? updatedSession : s));
  if (!sessions.some((s) => s.id === sessionId)) {
    updatedList.unshift(updatedSession);
  }

  await saveAllSessions(workspaceId, updatedList);
  return updatedSession;
}

export async function updateSessionMessages(
  workspaceId: string,
  sessionId: string,
  messages: AgentChatMessage[]
): Promise<void> {
  const sessions = await listSessions(workspaceId);
  const index = sessions.findIndex((s) => s.id === sessionId);
  if (index >= 0) {
    sessions[index] = {
      ...sessions[index],
      messages,
      updatedAt: Date.now(),
    };
    await saveAllSessions(workspaceId, sessions, true);
  }
}

export async function updateSessionId(
  workspaceId: string,
  sessionId: string,
  remoteSessionId: string
): Promise<void> {
  const sessions = await listSessions(workspaceId);
  const index = sessions.findIndex((s) => s.id === sessionId);
  if (index >= 0 && sessions[index].sessionId !== remoteSessionId) {
    sessions[index] = {
      ...sessions[index],
      sessionId: remoteSessionId,
      updatedAt: Date.now(),
    };
    await saveAllSessions(workspaceId, sessions);
  }
}

export const updateSessionAstraSessionId = updateSessionId;

export async function deleteSession(workspaceId: string, sessionId: string): Promise<ConversationSession[]> {
  const sessions = await listSessions(workspaceId);
  const filtered = sessions.filter((s) => s.id !== sessionId);
  await saveAllSessions(workspaceId, filtered);
  return filtered;
}

export async function renameSession(workspaceId: string, sessionId: string, newTitle: string): Promise<void> {
  const sessions = await listSessions(workspaceId);
  const index = sessions.findIndex((s) => s.id === sessionId);
  if (index >= 0) {
    sessions[index] = {
      ...sessions[index],
      title: newTitle.trim(),
      updatedAt: Date.now(),
    };
    await saveAllSessions(workspaceId, sessions);
  }
}
