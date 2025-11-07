// This file is the "Build" button's backend
// It tells GitHub to wake up the build robot

import { getAuth } from 'firebase-admin/auth';
import { initializeApp, cert, getApps } from 'firebase-admin/app';

// --- Initialize Firebase Admin (to verify the user) ---
if (getApps().length === 0) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_JSON);
  initializeApp({
    credential: cert(serviceAccount),
  });
}
const auth = getAuth();

// --- Main Serverless Function ---
export default async function handler(req, res) {
  // 1. Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 2. Get our GitHub info from Vercel secrets
  const GITHUB_PAT = process.env.GITHUB_PAT;
  const GITHUB_USER = process.env.GITHUB_USER;
  const GITHUB_REPO = process.env.GITHUB_REPO;
  const WORKFLOW_FILE = 'build-plugin.yml'; // The name of our robot's .yml file

  if (!GITHUB_PAT || !GITHUB_USER || !GITHUB_REPO) {
    console.error('Missing GitHub env variables');
    return res.status(500).json({ error: 'Server is not configured for builds.' });
  }

  try {
    // 3. Verify the user is real and logged in
    const { authorization } = req.headers;
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }
    const token = authorization.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // 4. Get the projectId from the request
    const { projectId } = req.body;
    if (!projectId) {
      return res.status(400).json({ error: 'Bad Request: Missing projectId' });
    }
    
    // This is a unique ID so we can find the build later
    const runId = `${userId.substring(0, 5)}-${projectId.substring(0, 5)}`;

    // 5. This is the API call to GitHub
    // It "dispatches" (wakes up) our workflow
    const dispatchUrl = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`;

    console.log(`Dispatching build for user ${userId} and project ${projectId}`);
    
    const response = await fetch(dispatchUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${GITHUB_PAT}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: 'main', // The branch our workflow is on
        inputs: {   // This is how we send data to the robot
          userId: userId,
          projectId: projectId,
          runId: runId
        }
      })
    });

    if (response.status !== 204) {
      // 204 No Content is the success code for this API
      console.error('GitHub API error:', await response.text());
      throw new Error('Failed to start build job on GitHub.');
    }
    
    // 6. Success!
    res.status(200).json({ 
      message: 'Build started successfully!',
      runId: runId 
    });

  } catch (error) {
    console.error('Error in /api/startBuild:', error);
    res.status(500).json({ error: 'Internal Server Error: Could not start build.' });
  }
}
