/*
  This is PART 2: The Node.js Backend (The "Web Kitchen").
  This file will be hosted on GOOGLE CLOUD RUN.
  It's just the server code. It doesn't serve the HTML anymore.
*/

const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const cors = require('cors'); // We NEED this to allow Vercel to call GCR

const app = express();
// This is the port Google Cloud Run expects
const port = process.env.PORT || 8080;

// Set up CORS
// This tells the server to accept requests from your Vercel website
app.use(cors()); // For development, allow all.
// For production, you should restrict it:
// app.use(cors({ origin: 'https://your-vercel-site.vercel.app' }));

app.use(express.json());

// Get your secret key from Environment Variables
// (GCR will let you add these just like CodeSandbox did)
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("FATAL ERROR: GEMINI_API_KEY is not set!");
}
const genAI = new GoogleGenerativeAI(apiKey);

// --- API ENDPOINT 1: THE "GENERATE" BUTTON (REAL) ---
app.post('/generate', async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: "No prompt provided." });
    }
    if (!apiKey) {
         return res.status(500).json({ error: "Server is missing its API key." });
    }

    console.log(`Received REAL prompt: "${prompt}"`);
    console.log("Contacting Google Gemini AI...");

    try {
        const systemPrompt = `You are an expert Minecraft Paper API (1.19+) plugin developer.
Your task is to generate a complete, runnable plugin from a user's prompt.
You MUST return ONLY a single JSON object in this exact format:
{
  "pluginYml": "name: ...\nversion: 1.0\nmain: ...\napi-version: 1.19\ncommands: ...",
  "mainJava": "package com.nothingai.plugin;\n\nimport ...\n\npublic class MyPlugin extends JavaPlugin { ... }"
}
The 'main' in plugin.yml MUST match the package and class in mainJava.
The package MUST be 'com.nothingai.plugin'.
The class name MUST be 'MyPlugin'.
The code must be complete, runnable, and correct. Do not use placeholders.
Do not add any text or markdown formatting before or after the JSON object.
`;

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-09-2025" });
        const fullPrompt = systemPrompt + "\n\nUser Prompt: " + prompt;
        
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const aiText = response.text();

        let jsonString = aiText.replace("```json", "").replace("```", "").trim();
        console.log("AI Response Received. Parsing JSON...");
        const aiJson = JSON.parse(jsonString);

        if (!aiJson.pluginYml || !aiJson.mainJava) {
             throw new Error("AI did not return the expected JSON format.");
        }
        res.json(aiJson);

    } catch (error) {
        console.error("Error calling Gemini AI:", error);
        res.status(500).json({ error: "The AI failed to generate the code. This might be due to a safety block or an API error." });
    }
});

// --- API ENDPOINT 2: THE "BUILD" BUTTON (SIMULATED) ---
app.post('/build', async (req, res) => {
    const { javaCode, ymlCode } = req.body;
    console.log("Received code for building...");
    
    // =================================================================
    // This is still simulated.
    // To make this real, you would replace this with an `fetch` call
    // to your *other* Google Cloud Run service: the Java Build Server
    // (from the /backend-java folder)
    // =================================================================
    
    console.log("Simulating call to Java Build Server (Part 3)...");
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log("Build server returned a .jar file!");

    const fakeJarContent = `--- THIS IS A SIMULATED .JAR FILE ---
This "build" was triggered by your Node.js server (on GCR).
To make this real, this server would need to call a *separate*
Java server (also on GCR) that has the Java JDK installed.

The code inside this "build" is 100% REAL and from the AI:

Your plugin.yml:
----------------
${ymlCode}

Your Main.java:
----------------
${javaCode}
`;
    
    res.setHeader('Content-Type', 'application/java-archive');
    res.setHeader('Content-Disposition', 'attachment; filename="MyPlugin-simulated.jar"');
    res.send(fakeJarContent);
});

// We DO NOT need app.get('/') because GCR is not hosting our HTML.
// Vercel is doing that.

// Start the server
app.listen(port, () => {
    console.log(`Nothing AI *Backend* (with REAL AI) is running on port ${port}`);
});
