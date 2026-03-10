diff --git a/src/app/pages/Dashboard.tsx b/src/app/pages/Dashboard.tsx
index 2ea4cfdb263758dc96f62907abb2e852decfbfb6..6aaf397d538d99166a9ce7fdd59f094500b571be 100644
--- a/src/app/pages/Dashboard.tsx
+++ b/src/app/pages/Dashboard.tsx
@@ -1,140 +1,133 @@
 import { useState, useEffect } from 'react';
 import { useNavigate } from 'react-router';
 import { useAuth } from '../context/AuthContext';
-import { projectId, publicAnonKey } from '/utils/supabase/info';
+import { apiUrl } from '../lib/api';
 import { 
   GraduationCap, 
   LogOut, 
   Plus, 
   Users, 
   BookOpen, 
   MessageCircle,
   Search,
   X,
   Shield
 } from 'lucide-react';
 
 interface StudyGroup {
   id: string;
   name: string;
   subject: string;
   description: string;
   memberCount: number;
   createdAt: string;
 }
 
 export function Dashboard() {
   const { user, logout, accessToken } = useAuth();
   const navigate = useNavigate();
   const [studyGroups, setStudyGroups] = useState<StudyGroup[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [showCreateModal, setShowCreateModal] = useState(false);
   const [searchQuery, setSearchQuery] = useState('');
   const [newGroup, setNewGroup] = useState({
     name: '',
     subject: '',
     description: '',
   });
 
   useEffect(() => {
     fetchStudyGroups();
   }, []);
 
   const fetchStudyGroups = async () => {
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
         setStudyGroups(data.studyGroups);
       }
     } catch (error) {
       console.error('Error fetching study groups:', error);
     } finally {
       setIsLoading(false);
     }
   };
 
   const handleCreateGroup = async (e: React.FormEvent) => {
     e.preventDefault();
 
     try {
       const response = await fetch(
-        `https://${projectId}.supabase.co/functions/v1/make-server-b2f88e04/study-groups`,
+        apiUrl('/study-groups'),
         {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
             'Authorization': `Bearer ${accessToken}`,
           },
           body: JSON.stringify(newGroup),
         }
       );
 
       if (response.ok) {
         const data = await response.json();
         setStudyGroups([...studyGroups, data.studyGroup]);
         setShowCreateModal(false);
         setNewGroup({ name: '', subject: '', description: '' });
         // Navigate to the new group
         navigate(`/study-group/${data.studyGroup.id}`);
       }
     } catch (error) {
       console.error('Error creating study group:', error);
     }
   };
 
   const handleJoinGroup = async (groupId: string) => {
     try {
       const response = await fetch(
-        `https://${projectId}.supabase.co/functions/v1/make-server-b2f88e04/study-groups/${groupId}/join`,
+        apiUrl(`/study-groups/${groupId}/join`),
         {
           method: 'POST',
           headers: {
             'Authorization': `Bearer ${accessToken}`,
           },
         }
       );
 
       if (response.ok) {
         navigate(`/study-group/${groupId}`);
       }
     } catch (error) {
       console.error('Error joining study group:', error);
     }
   };
 
-  const handleLogout = () => {
-    logout();
+  const handleLogout = async () => {
+    await logout();
     navigate('/');
   };
 
   const filteredGroups = studyGroups.filter(
     (group) =>
       group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
       group.subject.toLowerCase().includes(searchQuery.toLowerCase())
   );
 
   const subjects = [...new Set(studyGroups.map((g) => g.subject))];
 
   return (
     <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
       {/* Header */}
       <header className="bg-white shadow-sm border-b border-gray-200">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-3">
               <div className="flex items-center justify-center w-10 h-10 bg-indigo-100 rounded-lg">
                 <GraduationCap className="w-6 h-6 text-indigo-600" />
               </div>
               <div>
                 <h1 className="text-xl font-bold text-gray-900">LearnHub</h1>
                 <p className="text-sm text-gray-600">Welcome, {user?.name}!</p>
               </div>
