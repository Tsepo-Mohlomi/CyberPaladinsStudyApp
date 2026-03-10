import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.js';

function makeClient(baseUrl) {
  return {
    get: (path, token) =>
      fetch(`${baseUrl}${path}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      }),
    post: (path, body, token) =>
      fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      }),
    patch: (path, body, token) =>
      fetch(`${baseUrl}${path}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      }),
  };
}

async function withServer(run) {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, resolve));
  try {
    const addr = server.address();
    const baseUrl = `http://127.0.0.1:${addr.port}`;
    await run(makeClient(baseUrl));
  } finally {
    server.close();
  }
}

test('signup/login and current user endpoint', async () => {
  await withServer(async (client) => {
    const email = `backend.test+${Date.now()}@example.com`;
    const signupRes = await client.post('/api/signup', {
      name: 'Backend Test User',
      email,
      password: 'password123',
    });
    assert.equal(signupRes.status, 201);

    const loginRes = await client.post('/api/login', {
      email,
      password: 'password123',
    });
    assert.equal(loginRes.status, 200);
    const loginPayload = await loginRes.json();

    const meRes = await client.get('/api/me', loginPayload.accessToken);
    assert.equal(meRes.status, 200);
    const mePayload = await meRes.json();
    assert.equal(mePayload.user.email, email);

    const logoutRes = await client.post('/api/logout', undefined, loginPayload.accessToken);
    assert.equal(logoutRes.status, 200);

    const meAfterLogoutRes = await client.get('/api/me', loginPayload.accessToken);
    assert.equal(meAfterLogoutRes.status, 401);
  });
});

test('study group listing supports search + pagination', async () => {
  await withServer(async (client) => {
    const groupsRes = await client.get('/api/study-groups?search=calculus&page=1&limit=1');
    assert.equal(groupsRes.status, 200);

    const payload = await groupsRes.json();
    assert.ok(Array.isArray(payload.studyGroups));
    assert.equal(payload.pagination.page, 1);
    assert.equal(payload.pagination.limit, 1);
  });
});

test('task status patch validates transitions', async () => {
  await withServer(async (client) => {
    const loginRes = await client.post('/api/login', {
      email: 'demo@learnhub.dev',
      password: 'demo1234',
    });
    const { accessToken } = await loginRes.json();

    const createTaskRes = await client.post(
      '/api/tasks',
      { groupId: 'group-math', title: 'Read chapter 4' },
      accessToken,
    );
    assert.equal(createTaskRes.status, 201);
    const created = await createTaskRes.json();

    const patchRes = await client.patch(
      `/api/tasks/${created.task.id}/status`,
      { status: 'done' },
      accessToken,
    );
    assert.equal(patchRes.status, 200);

    const invalidPatchRes = await client.patch(
      `/api/tasks/${created.task.id}/status`,
      { status: 'unknown' },
      accessToken,
    );
    assert.equal(invalidPatchRes.status, 400);
  });
});
