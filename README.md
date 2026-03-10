
  
  diff --git a/README.md b/README.md
index 65d67715d8972238146180ccdf2f66c6c4e5e1a2..bea91b03c64bf5b55d794a226f1fd9b8302458d2 100644
--- a/README.md
+++ b/README.md
@@ -1,5 +1,33 @@
-A group website managed and created by Osiris also known as Tsepo
-  Run `npm i` to install the dependencies.
+A group website managed and created by Osiris also known as Tsepo.
 
-  Run `npm run dev` to start the development server.
-  
+## Setup
+
+Run `npm i` to install dependencies.
+
+## Frontend
+
+Run `npm run dev` to start the Vite frontend.
+
+## Backend
+
+Run `npm run backend:dev` to start the local LearnHub backend on `http://localhost:8787`.
+
+Set `VITE_API_BASE_URL` if you need a custom API endpoint. By default the frontend uses `http://localhost:8787/api`.
+
+## Backend features included
+
+- Auth: signup + login + logout + `/api/me` session validation
+- Study groups: create, browse, join, and read details
+- Group chat: list + post messages
+- Admin support private messages with auto-reply
+- Tasks API for assignment tracking + status updates (`open`, `in_progress`, `done`)
+- Events API for scheduling study sessions
+- Flashcards API with review/mastery updates
+- Quiz submissions + leaderboard endpoint
+- Notifications endpoint + mark as read
+- Analytics overview endpoint for user activity snapshots
+- Filtering, searching, sorting, and pagination for study group listing
+
+## Tests
+
+Run `npm run backend:test` to execute backend API tests.

