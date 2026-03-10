diff --git a/backend/src/index.js b/backend/src/index.js
new file mode 100644
index 0000000000000000000000000000000000000000..0491834c9d7e18a7f4ce049e0a2c9caf1380c4f8
--- /dev/null
+++ b/backend/src/index.js
@@ -0,0 +1,8 @@
+import { createServer } from './server.js';
+
+const port = Number(process.env.BACKEND_PORT ?? 8787);
+const server = createServer();
+
+server.listen(port, '0.0.0.0', () => {
+  console.log(`LearnHub backend listening on http://0.0.0.0:${port}`);
+});
