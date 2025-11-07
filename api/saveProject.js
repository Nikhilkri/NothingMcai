// This is our new "Save to Database" serverless function
// It uses the "Admin SDK" to act as a secure administrator

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// 1. Initialize the Admin SDK
// We securely get our key from the Vercel Environment Variable
const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_JSON);

// Only initialize if it hasn't been already
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount)
  });
}

const db = getFirestore();
const auth = getAuth();

// This is the main function that Vercel will run
export default async (req, res) => {
  // We only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).send({ error: 'Method Not Allowed' });
  }

  try {
    // 1. Get the data from the frontend
    const { idToken, prompt, pluginYml, mainJava } = req.body;
    
    if (!idToken || !prompt || !pluginYml || !mainJava) {
      return res.status(400).send({ error: 'Missing required fields' });
    }

    // 2. VERIFY THE USER
    // This is the "security check". We check if the token is real.
    const decodedToken = await auth.verifyIdToken(idToken);
    const uid = decodedToken.uid; // This is the user's unique ID

    // 3. Prepare the data for the database
    const projectData = {
      userId: uid,
      prompt: prompt,
      pluginYml: pluginYml,
      mainJava: mainJava,
      createdAt: new Date().toISOString(), // Save the current time
      name: prompt.substring(0, 30) + '...' // Use the prompt as a name
    };

    // 4. SAVE TO FIRESTORE
    // We create a new "project" inside a "users" collection
    // This is like: users -> (user's ID) -> projects -> (new project ID)
    const projectRef = await db.collection('users').doc(uid).collection('projects').add(projectData);

    // 5. Send a "Success" message back
    console.log('Project saved with ID:', projectRef.id);
    res.status(200).json({ success: true, projectId: projectRef.id });

  } catch (error) {
    console.error('Error in /api/saveProject:', error);
    
    // Handle specific errors
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).send({ error: 'Authentication token expired, please log in again.' });
    }
    
    res.status(500).send({ error: 'Failed to save project.', details: error.message });
  }
};
