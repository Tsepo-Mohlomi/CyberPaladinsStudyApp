diff --git a/src/app/pages/StudyGroup.tsx b/src/app/pages/StudyGroup.tsx
index f39248cadb174047506c344aa4a661ac54d610b1..afe41fd37673be771164b0c98924ea060b2b6781 100644
--- a/src/app/pages/StudyGroup.tsx
+++ b/src/app/pages/StudyGroup.tsx
@@ -1,29 +1,29 @@
 import { useState, useEffect, useRef } from 'react';
 import { useParams, useNavigate } from 'react-router';
 import { useAuth } from '../context/AuthContext';
-import { projectId, publicAnonKey } from '/utils/supabase/info';
+import { apiUrl } from '../lib/api';
 import {
   ArrowLeft,
   Send,
   MessageCircle,
   HelpCircle,
   FileText,
   Megaphone,
   Users,
 } from 'lucide-react';
 
 interface Message {
   id: string;
   userId: string;
   userName: string;
   content: string;
   type: 'text' | 'question' | 'resource' | 'announcement';
   timestamp: string;
 }
 
 interface StudyGroup {
   id: string;
   name: string;
   subject: string;
   description: string;
   memberCount: number;
@@ -40,99 +40,92 @@ export function StudyGroup() {
   const [isLoading, setIsLoading] = useState(true);
   const messagesEndRef = useRef<HTMLDivElement>(null);
 
   useEffect(() => {
     if (id) {
       fetchStudyGroup();
       fetchMessages();
       // Poll for new messages every 3 seconds
       const interval = setInterval(() => {
         fetchMessages();
       }, 3000);
       return () => clearInterval(interval);
     }
   }, [id]);
 
   useEffect(() => {
     scrollToBottom();
   }, [messages]);
 
   const scrollToBottom = () => {
     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
   };
 
   const fetchStudyGroup = async () => {
     try {
-      const response = await fetch(
-        `https://${projectId}.supabase.co/functions/v1/make-server-b2f88e04/study-groups`,
-        {
-          headers: {
-            'Authorization': `Bearer ${publicAnonKey}`,
-          },
-        }
-      );
+      const response = await fetch(apiUrl('/study-groups'));
 
       if (response.ok) {
         const data = await response.json();
         const group = data.studyGroups.find((g: StudyGroup) => g.id === id);
         setStudyGroup(group);
       }
     } catch (error) {
       console.error('Error fetching study group:', error);
     }
   };
 
   const fetchMessages = async () => {
     try {
       const response = await fetch(
-        `https://${projectId}.supabase.co/functions/v1/make-server-b2f88e04/study-groups/${id}/messages`,
+        apiUrl(`/study-groups/${id}/messages`),
         {
           headers: {
-            'Authorization': `Bearer ${publicAnonKey}`,
+            'Authorization': `Bearer ${accessToken}`,
           },
         }
       );
 
       if (response.ok) {
         const data = await response.json();
         setMessages(data.messages);
       }
     } catch (error) {
       console.error('Error fetching messages:', error);
     } finally {
       setIsLoading(false);
     }
   };
 
   const handleSendMessage = async (e: React.FormEvent) => {
     e.preventDefault();
 
     if (!newMessage.trim()) return;
 
     try {
       const response = await fetch(
-        `https://${projectId}.supabase.co/functions/v1/make-server-b2f88e04/study-groups/${id}/messages`,
+        apiUrl(`/study-groups/${id}/messages`),
         {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
             'Authorization': `Bearer ${accessToken}`,
           },
           body: JSON.stringify({
             content: newMessage,
             type: messageType,
           }),
         }
       );
 
       if (response.ok) {
         setNewMessage('');
         setMessageType('text');
         fetchMessages();
       }
     } catch (error) {
       console.error('Error sending message:', error);
     }
   };
 
   const getMessageIcon = (type: Message['type']) => {
     switch (type) {
