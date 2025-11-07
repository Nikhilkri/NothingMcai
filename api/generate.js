/*
  This is PART 2: The Backend.
  This is our AI "Generate" function.
  Vercel will turn this single file into a live API endpoint
  at the URL '/api/generate'.
*/

// We only import the AI library
const { GoogleGenerativeAI } = require("@google/generative-ai");

// This is the Vercel-way to write a serverless function
// It's not Express.js, it's simpler.
export default async function handler(req, res) {
    // 1. Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Method not allowed. Use POST." });
    }

    // 2. Get the prompt from the request body
    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: "No prompt provided." });
    }

    // 3. Get the API key from Vercel's Environment Variables
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("GEMINI_API_KEY is not set in Vercel!");
        return res.status(500).json({ error: "Server is missing its API key." });
    }

    console.log(`Vercel function received REAL prompt: "${prompt}"`);
    const genAI = new GoogleGenerativeAI(apiKey);

    // 4. Run the AI generation (same logic as before)
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
        
        // 5. Send the successful response
        res.status(200).json(aiJson);

    } catch (error) {
        console.error("Error calling Gemini AI:", error);
        res.status(500).json({ error: "The AI failed to generate the code. This might be due to a safety block or an API error." });
    }
}
