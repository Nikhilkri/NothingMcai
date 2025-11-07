// This is the UPDATED file using modern 'import' syntax
// This will fix the conflict with 'api/saveProject.js'

import { GoogleGenerativeAI } from "@google/generative-ai";

// Get the API key from Vercel's Environment Variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// This is the main function
export default async (req, res) => {
  // We only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).send({ error: 'Method Not Allowed' });
  }

  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).send({ error: 'Prompt is required' });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-09-2025" });

    // This is the powerful prompt that forces the AI to give us JSON
    const fullPrompt = `
      You are an expert Minecraft Paper plugin developer.
      A user wants a plugin for this prompt: "${prompt}"

      You MUST provide your response in a single, minified JSON object.
      You MUST NOT use markdown (e.g. \`\`\`json).
      The JSON object must have two keys: "pluginYml" and "mainJava".

      "pluginYml" must be a string containing the complete, valid plugin.yml file.
      "mainJava" must be a string containing the complete, valid Java code for the main plugin class.
      The Java code MUST be a single class that extends JavaPlugin.
      The Java code MUST correctly register all commands and events mentioned in the plugin.yml.
      
      Example:
      {"pluginYml": "name: HealPlugin\\nversion: 1.0\\nmain: me.example.HealPlugin\\napi-version: 1.19\\ncommands:\\n  heal:\\n    description: Heals the player.", "mainJava": "package me.example;\\nimport org.bukkit.command.Command;\\nimport org.bukkit.command.CommandSender;\\nimport org.bukkit.entity.Player;\\nimport org.bukkit.plugin.java.JavaPlugin;\\n\\npublic class HealPlugin extends JavaPlugin {\\n    @Override\\n    public boolean onCommand(CommandSender sender, Command cmd, String label, String[] args) {\\n        if (cmd.getName().equalsIgnoreCase(\\"heal\\")) {\\n            if (sender instanceof Player) {\\n                Player p = (Player) sender;\\n                p.setHealth(20.0);\\n                p.sendMessage(\\"You have been healed!\\");\\n                return true;\\n            }\\n            return false;\\n        }\\n        return false;\\n    }\\n}"}
    `;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    // Parse the JSON string from the AI
    const jsonResponse = JSON.parse(text);

    // Send the two keys (pluginYml, mainJava) back to the frontend
    res.status(200).json({
      pluginYml: jsonResponse.pluginYml,
      mainJava: jsonResponse.mainJava
    });

  } catch (error) {
    console.error('Error in /api/generate:', error);
    res.status(500).json({ error: 'The AI failed to generate the code. This might be due to a safety block or an API error.' });
  }
};
