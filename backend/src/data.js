import { randomUUID } from 'node:crypto';

const now = () => new Date().toISOString();
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

const adminUser = {
  id: 'user-admin',
  email: 'admin@learnhub.dev',
  name: 'Tsepo Mohlomi',
  role: 'admin',
  createdAt: now(),
};

export const db = {
  users: [
    adminUser,
    {
      id: 'user-demo',
      email: 'demo@learnhub.dev',
      name: 'Demo Student',
      role: 'student',
      createdAt: now(),
    },
  ],
  credentials: new Map([
    [adminUser.email, 'admin1234'],
    ['demo@learnhub.dev', 'demo1234'],
  ]),
  tokens: new Map(),
  studyGroups: [
    {
      id: 'group-math',
      name: 'Calculus Circle',
      subject: 'Mathematics',
      description: 'Limits, derivatives, integrals, and exam prep.',
      ownerId: adminUser.id,
      memberIds: new Set([adminUser.id, 'user-demo']),
      createdAt: now(),
      tags: ['calculus', 'finals'],
      visibility: 'public',
    },
  ],
  groupMessages: [
    {
      id: randomUUID(),
      groupId: 'group-math',
      userId: adminUser.id,
      userName: adminUser.name,
      content: 'Welcome to Calculus Circle! Share your toughest problem set here.',
      type: 'announcement',
      createdAt: now(),
      isPinned: true,
    },
  ],
  privateMessages: [],
  tasks: [],
  events: [],
  flashcards: [],
  quizSubmissions: [],
  notifications: [],
};

export function createTokenForUser(user) {
  const token = `learnhub_${randomUUID()}`;
  db.tokens.set(token, { userId: user.id, issuedAt: Date.now(), expiresAt: Date.now() + TOKEN_TTL_MS });
  return token;
}

export function revokeToken(token) {
  db.tokens.delete(token);
}

export function getUserByToken(token) {
  const session = db.tokens.get(token);
  if (!session) return null;

  if (session.expiresAt <= Date.now()) {
    db.tokens.delete(token);
    return null;
  }

  return db.users.find((user) => user.id === session.userId) ?? null;
}

export function makeNotification(userId, type, message) {
  const notification = {
    id: randomUUID(),
    userId,
    type,
    message,
    isRead: false,
    createdAt: now(),
  };

  db.notifications.push(notification);
  return notification;
}

export function toStudyGroupResponse(group) {
  return {
    id: group.id,
    name: group.name,
    subject: group.subject,
    description: group.description,
    memberCount: group.memberIds.size,
    createdAt: group.createdAt,
    tags: group.tags,
    visibility: group.visibility,
  };
}
