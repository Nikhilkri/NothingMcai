/*
  This is PART 3: The Simulated Build Server.
  Vercel will turn this file into a live API endpoint
  at the URL '/api/build'.
*/

// This function simulates the build
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Method not allowed. Use POST." });
    }

    // Get the code from the request body
    const { javaCode, ymlCode } = req.body;
    if (!javaCode || !ymlCode) {
        return res.status(400).json({ error: "Missing Java or YML code." });
    }

    console.log("Simulating build... (This is the Vercel-only version)");
    
    // =================================================================
    // This is still simulated.
    // The "No Credit Card" way to make this REAL is to use
    // GitHub Actions, which is more advanced but free.
    // For now, this simulation is the best and simplest path.
    // =================================================================
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // Fake 1s build
    console.log("Build server returned a .jar file!");

    const fakeJarContent = `--- THIS IS A SIMULATED .JAR FILE ---
This "build" was simulated by a Vercel Serverless Function.
To make this real (for free), you would need to set up
a GitHub Action to compile the Java code.

The code inside this "build" is 100% REAL and from the AI:

Your plugin.yml:
----------------
${ymlCode}

Your Main.java:
----------------
${javaCode}
`;
    
    // Set the headers to make the browser download the file
    res.setHeader('Content-Type', 'application/java-archive');
    res.setHeader('Content-Disposition', 'attachment; filename="MyPlugin-simulated.jar"');
    
    // Send the fake file content
    res.send(fakeJarContent);
}
