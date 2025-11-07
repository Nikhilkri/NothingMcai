// This is the FIXED version that uses modern 'import' syntax

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// --- Initialize Firebase Admin ---
// This is the key: we check if the app is ALREADY initialized
// This prevents errors in a serverless environment
if (getApps().length === 0) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_JSON);
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();
const auth = getAuth();

// --- Main Serverless Function ---
export default async function handler(req, res) {
  // 1. Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 2. Get the user's login token from the header
    const { authorization } = req.headers;
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }
    const token = authorization.split('Bearer ')[1];

    // 3. Verify the token (check if the user is real)
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // 4. Get the project data from the request body
    const { name, pluginYml, mainJava } = req.body;
    if (!name || !pluginYml || !mainJava) {
      return res.status(400).json({ error: 'Bad Request: Missing project data' });
    }

    // 5. Create the new project object
    const newProject = {
      name: name,
      pluginYml: pluginYml,
      mainJava: mainJava,
      userId: userId,
      createdAt: new Date().toISOString(), // Save the current time
    };

    // 6. Save the project to the database
    // This creates a document in: /users/{userId}/projects/{newProjectId}
    const projectRef = await db.collection('users').doc(userId).collection('projects').add(newProject);

    // 7. Success!
    res.status(200).json({
      message: 'Project saved successfully!',
      projectId: projectRef.id,
    });
    
  } catch (error) {
    console.error('Error in /api/saveProject:', error);
    // Check for different error types
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'Unauthorized: Token expired' });
    }
    if (error.code === 'permission-denied') {
      return res.status(403).json({ error: 'Forbidden: Database permission denied.' });
    }
    // General error
    res.status(500).json({ error: 'Internal Server Error: Could not save project.' });
  }
}
