// This file is now MUCH smarter.
// It handles login, logout, and the generator.

// ! ! ! IMPORTANT ! ! !
// This is where you paste the `firebaseConfig` object you copied from Firebase.
const firebaseConfig = {
  apiKey: "AIzaSyAj4KrhPiKw3CZwG2EUJ-sif04qF09zwJo",
  authDomain: "nothing-ai-bd3dd.firebaseapp.com",
  projectId: "nothing-ai-bd3dd",
  storageBucket: "nothing-ai-bd3dd.firebasestorage.app",
  messagingSenderId: "442150692363",
  appId: "1:442150692363:web:27a04a4543d8977dc0890e",
  measurementId: "G-MW5B6PQEYP"
};
// ! ! ! IMPORTANT ! ! !


// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore(); 

const BACKEND_URL = '';

document.addEventListener('DOMContentLoaded', () => {
    // Get all the new Login/Logout buttons
    const authContainer = document.getElementById('auth-container');
    const loginButton = document.getElementById('loginButton');
    const logoutButton = document.getElementById('logoutButton');
    const userInfo = document.getElementById('userInfo');
    const userName = document.getElementById('userName');
    
    // Get the main content sections
    const mainContent = document.getElementById('mainContent');
    const loginMessage = document.getElementById('loginMessage');
    
    // Get all the "Generator" buttons (same as before)
    const generateButton = document.getElementById('generateButton');
    const buildButton = document.getElementById('buildButton');
    const promptInput = document.getElementById('promptInput');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const outputSection = document.getElementById('outputSection');
    const errorMessage = document.getElementById('errorMessage');
    const pluginYmlContent = document.getElementById('pluginYmlContent');
    const mainJavaContent = document.getElementById('mainJavaContent');
    const buildLoading = document.getElementById('buildLoading');
    const buildResult = document.getElementById('buildResult');
    const downloadLink = document.getElementById('downloadLink');

    // --- NEW LOADING INDICATOR TEXT ---
    const loadingText = document.querySelector('#loadingIndicator p'); // Get the text element

    // --- AUTHENTICATION LOGIC (Same as before) ---
    auth.onAuthStateChanged(user => {
        if (user) {
            mainContent.classList.remove('hidden');
            loginMessage.classList.add('hidden');
            userName.textContent = user.displayName;
            userInfo.classList.remove('hidden');
            loginButton.classList.add('hidden');
            authContainer.style.display = 'flex';
        } else {
            mainContent.classList.add('hidden');
            loginMessage.classList.remove('hidden');
            userInfo.classList.add('hidden');
            loginButton.classList.remove('hidden');
            authContainer.style.display = 'flex';
        }
    });
    loginButton.addEventListener('click', () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider).catch(error => {
            console.error("Login Error:", error);
            showError("Failed to log in with Google: " + error.message);
        });
    });
    logoutButton.addEventListener('click', () => { auth.signOut(); });

    // --- *** UPDATED GENERATOR LOGIC *** ---
    generateButton.addEventListener('click', async () => {
        const prompt = promptInput.value;
        if (!prompt) {
            showError("Please enter a prompt.");
            return;
        }
        
        // Check if user is logged in
        const user = auth.currentUser;
        if (!user) {
            showError("You must be logged in to generate a plugin.");
            return;
        }

        resetUI();
        loadingText.textContent = "Contacting REAL AI... this may take a moment."; // Set text
        loadingIndicator.classList.remove('hidden');
        generateButton.disabled = true;
        generateButton.classList.add('btn-disabled');

        let generatedData; // To store AI response

        try {
            // --- Step 1: Call the AI (Same as before) ---
            const response = await fetch(`${BACKEND_URL}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: prompt })
            });
            generatedData = await response.json();
            if (!response.ok) {
                throw new Error(generatedData.error || 'Unknown server error');
            }

            // --- Step 2: NEW! Save to Database ---
            loadingText.textContent = "Saving project to your account..."; // Update text
            
            // Get the user's secret ID Token
            const idToken = await user.getIdToken();

            const saveResponse = await fetch(`${BACKEND_URL}/api/saveProject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idToken: idToken,
                    prompt: prompt,
                    pluginYml: generatedData.pluginYml,
                    mainJava: generatedData.mainJava
                })
            });

            const saveData = await saveResponse.json();
            if (!saveResponse.ok) {
                throw new Error(saveData.error || 'Failed to save project');
            }

            console.log("Project saved successfully!", saveData.projectId);

            // --- Step 3: Show results (Same as before) ---
            pluginYmlContent.textContent = generatedData.pluginYml;
            mainJavaContent.textContent = generatedData.mainJava;

            loadingIndicator.classList.add('hidden');
            outputSection.classList.remove('hidden');
            buildButton.disabled = false;
            buildButton.classList.remove('btn-disabled');

        } catch (err) {
            console.error(err);
            showError(err.message);
        } finally {
            generateButton.disabled = false;
            generateButton.classList.remove('btn-disabled');
        }
    });

    // --- BUILD BUTTON LOGIC (Same as before) ---
    buildButton.addEventListener('click', async () => {
        buildButton.disabled = true;
        buildButton.classList.add('btn-disabled');
        buildResult.classList.add('hidden');
        buildLoading.classList.remove('hidden');

        const javaCode = mainJavaContent.textContent;
        const ymlCode = pluginYmlContent.textContent;

        try {
            const response = await fetch(`${BACKEND_URL}/api/build`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ javaCode, ymlCode })
            });
            if (!response.ok) { throw new Error('Build server failed.'); }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            downloadLink.href = url;
            downloadLink.download = "MyPlugin-simulated.jar";
            buildLoading.classList.add('hidden');
            buildResult.classList.remove('hidden');
        } catch (err) {
            showError(err.message);
            buildLoading.classList.add('hidden');
        }
    });
    
    // Helper functions (Same as before)
    function showError(message) {
        errorMessage.textContent = 'Error: ' + message;
        errorMessage.classList.remove('hidden');
        loadingIndicator.classList.add('hidden');
    }
    function resetUI() {
        errorMessage.classList.add('hidden');
        outputSection.classList.add('hidden');
        buildResult.classList.add('hidden');
        buildLoading.classList.add('hidden');
    }
    const tabs = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const target = tab.getAttribute('data-tab');
            tabContents.forEach(content => {
                content.id === `tab-${target}`
                    ? content.classList.remove('hidden')
                    : content.classList.add('hidden');
            });
        });
    });
});
