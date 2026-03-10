import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Create Supabase clients
const getSupabaseAdmin = () => createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const getSupabaseClient = () => createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!,
);

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-b2f88e04/health", (c) => {
  return c.json({ status: "ok" });
});

// Sign up endpoint
app.post("/make-server-b2f88e04/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();

    if (!email || !password || !name) {
      return c.json({ error: "Email, password, and name are required" }, 400);
    }

    const supabase = getSupabaseAdmin();
    
    // Create user with Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.log(`Error creating user during signup: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    // Store user profile in KV store
    await kv.set(`user:${data.user.id}`, {
      id: data.user.id,
      email,
      name,
      createdAt: new Date().toISOString(),
    });

    return c.json({ 
      user: { id: data.user.id, email, name },
      message: "User created successfully" 
    });
  } catch (error) {
    console.log(`Server error during signup: ${error}`);
    return c.json({ error: "Internal server error during signup" }, 500);
  }
});

// Login endpoint
app.post("/make-server-b2f88e04/login", async (c) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }

    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.log(`Error signing in user during login: ${error.message}`);
      return c.json({ error: error.message }, 401);
    }

    // Get user profile from KV store
    const userProfile = await kv.get(`user:${data.user.id}`);

    return c.json({ 
      accessToken: data.session.access_token,
      user: userProfile || { id: data.user.id, email: data.user.email }
    });
  } catch (error) {
    console.log(`Server error during login: ${error}`);
    return c.json({ error: "Internal server error during login" }, 500);
  }
});

// Get current user endpoint
app.get("/make-server-b2f88e04/users/me", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: "Unauthorized - no token provided" }, 401);
    }

    const supabase = getSupabaseAdmin();
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      console.log(`Authorization error while getting user: ${error?.message}`);
      return c.json({ error: "Unauthorized" }, 401);
    }

    const userProfile = await kv.get(`user:${user.id}`);

    return c.json({ user: userProfile || { id: user.id, email: user.email } });
  } catch (error) {
    console.log(`Server error getting current user: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Get all study groups
app.get("/make-server-b2f88e04/study-groups", async (c) => {
  try {
    const groups = await kv.getByPrefix("study-group:");
    return c.json({ studyGroups: groups || [] });
  } catch (error) {
    console.log(`Server error getting study groups: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Create a new study group (requires auth)
app.post("/make-server-b2f88e04/study-groups", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: "Unauthorized - no token provided" }, 401);
    }

    const supabase = getSupabaseAdmin();
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      console.log(`Authorization error while creating study group: ${error?.message}`);
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { name, subject, description } = await c.req.json();

    if (!name || !subject) {
      return c.json({ error: "Name and subject are required" }, 400);
    }

    const groupId = crypto.randomUUID();
    const studyGroup = {
      id: groupId,
      name,
      subject,
      description: description || "",
      createdBy: user.id,
      createdAt: new Date().toISOString(),
      memberCount: 1,
    };

    await kv.set(`study-group:${groupId}`, studyGroup);
    
    // Add creator as member
    await kv.set(`study-group:${groupId}:member:${user.id}`, {
      userId: user.id,
      joinedAt: new Date().toISOString(),
    });

    return c.json({ studyGroup });
  } catch (error) {
    console.log(`Server error creating study group: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Join a study group (requires auth)
app.post("/make-server-b2f88e04/study-groups/:id/join", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: "Unauthorized - no token provided" }, 401);
    }

    const supabase = getSupabaseAdmin();
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      console.log(`Authorization error while joining study group: ${error?.message}`);
      return c.json({ error: "Unauthorized" }, 401);
    }

    const groupId = c.req.param('id');
    const studyGroup = await kv.get(`study-group:${groupId}`);

    if (!studyGroup) {
      return c.json({ error: "Study group not found" }, 404);
    }

    // Check if already a member
    const existingMember = await kv.get(`study-group:${groupId}:member:${user.id}`);
    
    if (!existingMember) {
      await kv.set(`study-group:${groupId}:member:${user.id}`, {
        userId: user.id,
        joinedAt: new Date().toISOString(),
      });

      // Update member count
      studyGroup.memberCount = (studyGroup.memberCount || 0) + 1;
      await kv.set(`study-group:${groupId}`, studyGroup);
    }

    return c.json({ message: "Joined study group successfully" });
  } catch (error) {
    console.log(`Server error joining study group: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Get messages for a study group
app.get("/make-server-b2f88e04/study-groups/:id/messages", async (c) => {
  try {
    const groupId = c.req.param('id');
    const messages = await kv.getByPrefix(`message:${groupId}:`);
    
    // Sort messages by timestamp
    const sortedMessages = (messages || []).sort((a: any, b: any) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return c.json({ messages: sortedMessages });
  } catch (error) {
    console.log(`Server error getting messages: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Post a message to a study group (requires auth)
app.post("/make-server-b2f88e04/study-groups/:id/messages", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: "Unauthorized - no token provided" }, 401);
    }

    const supabase = getSupabaseAdmin();
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      console.log(`Authorization error while posting message: ${error?.message}`);
      return c.json({ error: "Unauthorized" }, 401);
    }

    const groupId = c.req.param('id');
    const { content, type } = await c.req.json();

    if (!content) {
      return c.json({ error: "Content is required" }, 400);
    }

    const userProfile = await kv.get(`user:${user.id}`);
    const messageId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    const message = {
      id: messageId,
      groupId,
      userId: user.id,
      userName: userProfile?.name || user.email,
      content,
      type: type || "text", // text, question, resource, announcement
      timestamp,
    };

    await kv.set(`message:${groupId}:${timestamp}:${messageId}`, message);

    return c.json({ message });
  } catch (error) {
    console.log(`Server error posting message: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Get private messages with admin (requires auth)
app.get("/make-server-b2f88e04/private-messages", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: "Unauthorized - no token provided" }, 401);
    }

    const supabase = getSupabaseAdmin();
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      console.log(`Authorization error while getting private messages: ${error?.message}`);
      return c.json({ error: "Unauthorized" }, 401);
    }

    const messages = await kv.getByPrefix(`private-message:${user.id}:`);
    
    // Sort messages by timestamp
    const sortedMessages = (messages || []).sort((a: any, b: any) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return c.json({ messages: sortedMessages });
  } catch (error) {
    console.log(`Server error getting private messages: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Send a private message to admin (requires auth)
app.post("/make-server-b2f88e04/private-messages", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: "Unauthorized - no token provided" }, 401);
    }

    const supabase = getSupabaseAdmin();
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      console.log(`Authorization error while sending private message: ${error?.message}`);
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { content } = await c.req.json();

    if (!content) {
      return c.json({ error: "Content is required" }, 400);
    }

    const userProfile = await kv.get(`user:${user.id}`);
    const messageId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    const message = {
      id: messageId,
      userId: user.id,
      userName: userProfile?.name || user.email,
      content,
      isFromAdmin: false,
      timestamp,
    };

    await kv.set(`private-message:${user.id}:${timestamp}:${messageId}`, message);

    return c.json({ message });
  } catch (error) {
    console.log(`Server error sending private message: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Admin sends message to user (requires auth and admin check)
app.post("/make-server-b2f88e04/private-messages/:userId/admin", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: "Unauthorized - no token provided" }, 401);
    }

    const supabase = getSupabaseAdmin();
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      console.log(`Authorization error while admin sending message: ${error?.message}`);
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Check if user is admin
    const adminEmail = "tsepomohlomi20041231@gmail.com";
    if (user.email !== adminEmail) {
      return c.json({ error: "Forbidden - admin only" }, 403);
    }

    const targetUserId = c.req.param('userId');
    const { content } = await c.req.json();

    if (!content) {
      return c.json({ error: "Content is required" }, 400);
    }

    const messageId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    const message = {
      id: messageId,
      userId: targetUserId,
      userName: "Tsepo Mohlomi (Admin)",
      content,
      isFromAdmin: true,
      timestamp,
    };

    await kv.set(`private-message:${targetUserId}:${timestamp}:${messageId}`, message);

    return c.json({ message });
  } catch (error) {
    console.log(`Server error admin sending private message: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

Deno.serve(app.fetch);