diff --git a/src/app/pages/PrivateMessages.tsx b/src/app/pages/PrivateMessages.tsx
index fd37394014347a3cb701a3f77e91704d17a82ab2..0d0d2fa4de3344b0013d6be05f812e98e2bb8571 100644
--- a/src/app/pages/PrivateMessages.tsx
+++ b/src/app/pages/PrivateMessages.tsx
@@ -1,95 +1,95 @@
 import { useState, useEffect, useRef } from 'react';
 import { useNavigate } from 'react-router';
 import { useAuth } from '../context/AuthContext';
-import { projectId, publicAnonKey } from '/utils/supabase/info';
+import { apiUrl } from '../lib/api';
 import { ArrowLeft, Send, Shield, Mail } from 'lucide-react';
 
 interface PrivateMessage {
   id: string;
   userId: string;
   userName: string;
   content: string;
   isFromAdmin: boolean;
   timestamp: string;
 }
 
 export function PrivateMessages() {
   const navigate = useNavigate();
   const { user, accessToken } = useAuth();
   const [messages, setMessages] = useState<PrivateMessage[]>([]);
   const [newMessage, setNewMessage] = useState('');
   const [isLoading, setIsLoading] = useState(true);
   const messagesEndRef = useRef<HTMLDivElement>(null);
 
   useEffect(() => {
     fetchMessages();
     // Poll for new messages every 3 seconds
     const interval = setInterval(() => {
       fetchMessages();
     }, 3000);
     return () => clearInterval(interval);
   }, []);
 
   useEffect(() => {
     scrollToBottom();
   }, [messages]);
 
   const scrollToBottom = () => {
     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
   };
 
   const fetchMessages = async () => {
     try {
       const response = await fetch(
-        `https://${projectId}.supabase.co/functions/v1/make-server-b2f88e04/private-messages`,
+        apiUrl('/private-messages'),
         {
           headers: {
             'Authorization': `Bearer ${accessToken}`,
           },
         }
       );
 
       if (response.ok) {
         const data = await response.json();
         setMessages(data.messages);
       }
     } catch (error) {
       console.error('Error fetching private messages:', error);
     } finally {
       setIsLoading(false);
     }
   };
 
   const handleSendMessage = async (e: React.FormEvent) => {
     e.preventDefault();
 
     if (!newMessage.trim()) return;
 
     try {
       const response = await fetch(
-        `https://${projectId}.supabase.co/functions/v1/make-server-b2f88e04/private-messages`,
+        apiUrl('/private-messages'),
         {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
             'Authorization': `Bearer ${accessToken}`,
           },
           body: JSON.stringify({ content: newMessage }),
         }
       );
 
       if (response.ok) {
         setNewMessage('');
         fetchMessages();
       }
     } catch (error) {
       console.error('Error sending private message:', error);
     }
   };
 
   const formatTime = (timestamp: string) => {
     const date = new Date(timestamp);
     const today = new Date();
     const isToday = date.toDateString() === today.toDateString();
 
     if (isToday) {
