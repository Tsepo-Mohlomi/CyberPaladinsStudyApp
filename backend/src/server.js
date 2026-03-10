import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { URL } from 'node:url';
import {
  createTokenForUser,
  db,
  getUserByToken,
  makeNotification,
  revokeToken,
  toStudyGroupResponse,
} from './data.js';

function json(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  });
  res.end(JSON.stringify(payload));
}

function error(res, status, message, details) {
  return json(res, status, { error: message, ...(details ? { details } : {}) });
}

async function readBody(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getToken(req) {
  const auth = req.headers.authorization;
  if (!auth) return null;
  const [scheme, token] = auth.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

function getAuthedUser(req) {
  const token = getToken(req);
  if (!token) return null;
  return getUserByToken(token);
}

function withAuth(req, res) {
  const user = getAuthedUser(req);
  if (!user) {
    error(res, 401, 'Unauthorized');
    return null;
  }
  return user;
}

function requireBody(body, keys) {
  if (!body) return false;
  return keys.every((k) => Boolean(body[k]));
}

function listGroups(userId, query) {
  let groups = db.studyGroups
    .filter((group) => group.visibility === 'public' || group.memberIds.has(userId))
    .map(toStudyGroupResponse);

  if (query.search) {
    const search = query.search.toLowerCase();
    groups = groups.filter(
      (group) =>
        group.name.toLowerCase().includes(search) ||
        group.subject.toLowerCase().includes(search) ||
        group.description.toLowerCase().includes(search),
    );
  }

  if (query.subject) {
    groups = groups.filter((group) => group.subject.toLowerCase() === query.subject.toLowerCase());
  }

  const sort = query.sort === 'oldest' ? 'oldest' : 'newest';
  groups.sort((a, b) =>
    sort === 'newest'
      ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const page = Math.max(1, Number(query.page ?? 1));
  const limit = Math.max(1, Math.min(50, Number(query.limit ?? 20)));
  const start = (page - 1) * limit;
  const paged = groups.slice(start, start + limit);

  return {
    studyGroups: paged,
    pagination: {
      page,
      limit,
      total: groups.length,
      totalPages: Math.ceil(groups.length / limit) || 1,
    },
  };
}

function enrichMessage(message) {
  return {
    id: message.id,
    content: message.content,
    timestamp: message.createdAt,
    user: { id: message.userId, name: message.userName },
    userId: message.userId,
    userName: message.userName,
    type: message.type ?? 'text',
    isFromAdmin: message.userId === 'user-admin',
    isPinned: Boolean(message.isPinned),
  };
}

function sendAdminAutoReply(content, user) {
  const lower = content.toLowerCase();
  let reply = 'Thanks for reaching out. I will get back to you shortly.';
  if (lower.includes('exam')) reply = 'Exam prep tip: break revision into 25-minute focused sessions.';
  if (lower.includes('group')) reply = 'You can create a group from the dashboard and invite friends with the join code.';

  const adminReply = {
    id: randomUUID(),
    fromUserId: 'user-admin',
    fromName: 'Tsepo Mohlomi',
    toUserId: user.id,
    content: reply,
    createdAt: new Date().toISOString(),
  };

  db.privateMessages.push(adminReply);
}

async function handle(req, res) {
  if (req.method === 'OPTIONS') return json(res, 200, { ok: true });

  const url = new URL(req.url, 'http://localhost');
  const { pathname } = url;

  if (pathname === '/api/health' && req.method === 'GET') {
    return json(res, 200, {
      status: 'ok',
      service: 'learnhub-backend',
      uptimeSeconds: Math.floor(process.uptime()),
      features: ['auth', 'study-groups', 'messaging', 'tasks', 'events', 'flashcards', 'quiz'],
    });
  }

  if (pathname === '/api/signup' && req.method === 'POST') {
    const body = await readBody(req);
    if (!requireBody(body, ['email', 'password', 'name'])) {
      return error(res, 400, 'name, email, password are required');
    }

    const email = String(body.email).toLowerCase().trim();
    if (!email.includes('@')) return error(res, 400, 'Invalid email format');
    if (String(body.password).length < 8) return error(res, 400, 'Password must be at least 8 chars');

    if (db.users.some((u) => u.email === email)) {
      return error(res, 409, 'User already exists');
    }

    const user = {
      id: randomUUID(),
      email,
      name: String(body.name).trim(),
      role: 'student',
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
    db.credentials.set(email, body.password);

    makeNotification(user.id, 'system', 'Welcome to LearnHub!');
    return json(res, 201, { user: { id: user.id, email: user.email, name: user.name } });
  }

  if (pathname === '/api/login' && req.method === 'POST') {
    const body = await readBody(req);
    if (!requireBody(body, ['email', 'password'])) {
      return error(res, 400, 'email and password are required');
    }

    const user = db.users.find((u) => u.email === String(body.email).toLowerCase());
    if (!user || db.credentials.get(user.email) !== body.password) {
      return error(res, 401, 'Invalid credentials');
    }

    const accessToken = createTokenForUser(user);
    return json(res, 200, {
      accessToken,
      user: { id: user.id, email: user.email, name: user.name },
    });
  }

  if (pathname === '/api/logout' && req.method === 'POST') {
    const token = getToken(req);
    if (token) revokeToken(token);
    return json(res, 200, { ok: true });
  }

  if (pathname === '/api/me' && req.method === 'GET') {
    const user = withAuth(req, res);
    if (!user) return;
    return json(res, 200, {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  }

  if (pathname === '/api/study-groups' && req.method === 'GET') {
    const user = getAuthedUser(req);
    return json(res, 200, listGroups(user?.id, Object.fromEntries(url.searchParams.entries())));
  }

  if (pathname === '/api/study-groups' && req.method === 'POST') {
    const user = withAuth(req, res);
    if (!user) return;

    const body = await readBody(req);
    if (!requireBody(body, ['name', 'subject', 'description'])) {
      return error(res, 400, 'name, subject, description are required');
    }

    const studyGroup = {
      id: randomUUID(),
      name: String(body.name).trim(),
      subject: String(body.subject).trim(),
      description: String(body.description).trim(),
      ownerId: user.id,
      memberIds: new Set([user.id]),
      createdAt: new Date().toISOString(),
      tags: Array.isArray(body.tags) ? body.tags : [],
      visibility: body.visibility === 'private' ? 'private' : 'public',
    };

    db.studyGroups.push(studyGroup);
    return json(res, 201, { studyGroup: toStudyGroupResponse(studyGroup) });
  }

  const joinMatch = pathname.match(/^\/api\/study-groups\/([^/]+)\/join$/);
  if (joinMatch && req.method === 'POST') {
    const user = withAuth(req, res);
    if (!user) return;
    const group = db.studyGroups.find((item) => item.id === joinMatch[1]);
    if (!group) return error(res, 404, 'Group not found');

    group.memberIds.add(user.id);
    makeNotification(user.id, 'group', `You joined ${group.name}`);
    return json(res, 200, { joined: true, studyGroup: toStudyGroupResponse(group) });
  }

  const groupMessagesMatch = pathname.match(/^\/api\/study-groups\/([^/]+)\/messages$/);
  if (groupMessagesMatch && req.method === 'GET') {
    const user = withAuth(req, res);
    if (!user) return;
    const groupId = groupMessagesMatch[1];
    const group = db.studyGroups.find((item) => item.id === groupId);
    if (!group) return error(res, 404, 'Group not found');

    const messages = db.groupMessages
      .filter((msg) => msg.groupId === groupId)
      .map(enrichMessage);

    return json(res, 200, { messages });
  }

  if (groupMessagesMatch && req.method === 'POST') {
    const user = withAuth(req, res);
    if (!user) return;
    const groupId = groupMessagesMatch[1];
    const group = db.studyGroups.find((item) => item.id === groupId);
    if (!group) return error(res, 404, 'Group not found');

    const body = await readBody(req);
    if (!body || !body.content?.trim()) {
      return error(res, 400, 'content is required');
    }

    const message = {
      id: randomUUID(),
      groupId,
      userId: user.id,
      userName: user.name,
      content: body.content.trim(),
      type: body.type ?? 'text',
      createdAt: new Date().toISOString(),
      isPinned: false,
    };
    db.groupMessages.push(message);

    return json(res, 201, { message: enrichMessage(message) });
  }

  if (pathname === '/api/private-messages' && req.method === 'GET') {
    const user = withAuth(req, res);
    if (!user) return;

    const messages = db.privateMessages
      .filter((msg) => msg.fromUserId === user.id || msg.toUserId === user.id)
      .map((msg) => ({
        id: msg.id,
        content: msg.content,
        timestamp: msg.createdAt,
        isFromAdmin: msg.fromUserId === 'user-admin',
      }));

    return json(res, 200, { messages });
  }

  if (pathname === '/api/private-messages' && req.method === 'POST') {
    const user = withAuth(req, res);
    if (!user) return;

    const body = await readBody(req);
    if (!body || !body.content?.trim()) {
      return error(res, 400, 'content is required');
    }

    const msg = {
      id: randomUUID(),
      fromUserId: user.id,
      fromName: user.name,
      toUserId: 'user-admin',
      content: body.content.trim(),
      createdAt: new Date().toISOString(),
    };
    db.privateMessages.push(msg);
    sendAdminAutoReply(body.content, user);

    return json(res, 201, { sent: true });
  }

  if (pathname === '/api/tasks' && req.method === 'POST') {
    const user = withAuth(req, res);
    if (!user) return;
    const body = await readBody(req);
    if (!requireBody(body, ['groupId', 'title'])) {
      return error(res, 400, 'groupId and title required');
    }

    const task = {
      id: randomUUID(),
      groupId: body.groupId,
      title: body.title,
      dueDate: body.dueDate ?? null,
      priority: body.priority ?? 'medium',
      status: 'open',
      assigneeId: body.assigneeId ?? user.id,
      createdBy: user.id,
      createdAt: new Date().toISOString(),
    };

    db.tasks.push(task);
    return json(res, 201, { task });
  }

  if (pathname === '/api/tasks' && req.method === 'GET') {
    const user = withAuth(req, res);
    if (!user) return;
    const groupId = url.searchParams.get('groupId');
    const tasks = db.tasks.filter((task) => {
      if (groupId && task.groupId !== groupId) return false;
      return task.assigneeId === user.id || task.createdBy === user.id;
    });

    return json(res, 200, { tasks });
  }

  const taskStatusMatch = pathname.match(/^\/api\/tasks\/([^/]+)\/status$/);
  if (taskStatusMatch && req.method === 'PATCH') {
    const user = withAuth(req, res);
    if (!user) return;
    const body = await readBody(req);
    const task = db.tasks.find((item) => item.id === taskStatusMatch[1]);
    if (!task) return error(res, 404, 'Task not found');

    if (task.assigneeId !== user.id && task.createdBy !== user.id) {
      return error(res, 403, 'Forbidden');
    }

    if (!['open', 'in_progress', 'done'].includes(body?.status)) {
      return error(res, 400, 'Invalid status');
    }

    task.status = body.status;
    return json(res, 200, { task });
  }

  if (pathname === '/api/events' && req.method === 'POST') {
    const user = withAuth(req, res);
    if (!user) return;
    const body = await readBody(req);
    if (!requireBody(body, ['groupId', 'title', 'startsAt'])) {
      return error(res, 400, 'groupId, title, startsAt required');
    }

    const event = {
      id: randomUUID(),
      groupId: body.groupId,
      title: body.title,
      startsAt: body.startsAt,
      location: body.location ?? 'Online',
      notes: body.notes ?? '',
      createdBy: user.id,
    };

    db.events.push(event);
    return json(res, 201, { event });
  }

  if (pathname === '/api/events' && req.method === 'GET') {
    const user = withAuth(req, res);
    if (!user) return;
    return json(res, 200, {
      events: db.events.filter((event) => {
        const group = db.studyGroups.find((item) => item.id === event.groupId);
        return group?.memberIds.has(user.id);
      }),
    });
  }

  if (pathname === '/api/flashcards' && req.method === 'POST') {
    const user = withAuth(req, res);
    if (!user) return;
    const body = await readBody(req);
    if (!requireBody(body, ['groupId', 'front', 'back'])) {
      return error(res, 400, 'groupId, front, back required');
    }

    const card = {
      id: randomUUID(),
      groupId: body.groupId,
      front: body.front,
      back: body.back,
      mastery: 0,
      reviewCount: 0,
      ownerId: user.id,
      lastReviewedAt: null,
    };

    db.flashcards.push(card);
    return json(res, 201, { flashcard: card });
  }

  if (pathname === '/api/flashcards/review' && req.method === 'POST') {
    const user = withAuth(req, res);
    if (!user) return;
    const body = await readBody(req);
    const card = db.flashcards.find((item) => item.id === body?.flashcardId && item.ownerId === user.id);
    if (!card) return error(res, 404, 'Flashcard not found');

    const score = Number(body?.score ?? 0);
    card.reviewCount += 1;
    card.mastery = Math.max(0, Math.min(100, card.mastery + score));
    card.lastReviewedAt = new Date().toISOString();

    return json(res, 200, { flashcard: card });
  }

  if (pathname === '/api/flashcards' && req.method === 'GET') {
    const user = withAuth(req, res);
    if (!user) return;
    const groupId = url.searchParams.get('groupId');
    return json(res, 200, {
      flashcards: db.flashcards.filter(
        (card) => card.ownerId === user.id && (!groupId || card.groupId === groupId),
      ),
    });
  }

  if (pathname === '/api/quiz-submissions' && req.method === 'POST') {
    const user = withAuth(req, res);
    if (!user) return;
    const body = await readBody(req);
    if (!body || !body.quizId || !Array.isArray(body.answers)) {
      return error(res, 400, 'quizId and answers array required');
    }

    const score = body.answers.filter((answer) => answer.correct).length;
    const submission = {
      id: randomUUID(),
      quizId: body.quizId,
      userId: user.id,
      answers: body.answers,
      score,
      createdAt: new Date().toISOString(),
    };
    db.quizSubmissions.push(submission);

    return json(res, 201, { submission });
  }

  if (pathname === '/api/leaderboard' && req.method === 'GET') {
    const points = new Map();
    for (const submission of db.quizSubmissions) {
      points.set(submission.userId, (points.get(submission.userId) ?? 0) + submission.score);
    }

    const leaderboard = [...points.entries()]
      .map(([userId, score]) => {
        const user = db.users.find((entry) => entry.id === userId);
        return { userId, name: user?.name ?? 'Unknown', score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return json(res, 200, { leaderboard });
  }

  if (pathname === '/api/notifications' && req.method === 'GET') {
    const user = withAuth(req, res);
    if (!user) return;
    return json(res, 200, {
      notifications: db.notifications.filter((item) => item.userId === user.id),
    });
  }

  const notificationMatch = pathname.match(/^\/api\/notifications\/([^/]+)\/read$/);
  if (notificationMatch && req.method === 'PATCH') {
    const user = withAuth(req, res);
    if (!user) return;
    const notification = db.notifications.find(
      (item) => item.id === notificationMatch[1] && item.userId === user.id,
    );

    if (!notification) return error(res, 404, 'Notification not found');
    notification.isRead = true;
    return json(res, 200, { notification });
  }

  if (pathname === '/api/analytics/overview' && req.method === 'GET') {
    const user = withAuth(req, res);
    if (!user) return;

    const userGroups = db.studyGroups.filter((group) => group.memberIds.has(user.id));
    const groupIds = new Set(userGroups.map((g) => g.id));

    return json(res, 200, {
      groupsCount: userGroups.length,
      groupMessagesCount: db.groupMessages.filter((m) => groupIds.has(m.groupId)).length,
      tasksOpen: db.tasks.filter((t) => t.assigneeId === user.id && t.status !== 'done').length,
      flashcardsCount: db.flashcards.filter((f) => f.ownerId === user.id).length,
      avgFlashcardMastery:
        db.flashcards.filter((f) => f.ownerId === user.id).reduce((acc, f) => acc + f.mastery, 0) /
          Math.max(1, db.flashcards.filter((f) => f.ownerId === user.id).length),
    });
  }

  error(res, 404, 'Route not found');
}

export function createServer() {
  return http.createServer((req, res) => {
    handle(req, res).catch((err) => {
      error(res, 500, 'Internal server error', err.message);
    });
  });
}
