// This file is now MUCH smarter.
// It handles login, logout, and the generator.

// ! ! ! IMPORTANT ! ! !
// This is where you paste the `firebaseConfig` object you copied from Firebase.
const firebaseConfig = {
  apiKey: "AIzaSy...PASTE_YOUR_KEY_HERE...",
  authDomain: "PASTE_YOUR_DOMAIN_HERE",
  projectId: "PASTE_YOUR_PROJECT_ID_HERE",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
// ! ! ! IMPORTANT ! ! !


// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore(); // We will use this database in the NEXT step.

// We don't need a full URL. We just call our own website's API folder.
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

    // --- NEW AUTHENTICATION LOGIC ---

    // This is the "brain" that listens for login/logout
    auth.onAuthStateChanged(user => {
        if (user) {
            // --- User is LOGGED IN ---
            console.log("User is logged in:", user.displayName);
            // Show the main generator content, hide login message
            mainContent.classList.remove('hidden');
            loginMessage.classList.add('hidden');
            
            // Update the navigation bar
            userName.textContent = user.displayName; // Show user's name
            userInfo.classList.remove('hidden');
            loginButton.classList.add('hidden');
            
            // We can now see the auth container
            authContainer.style.display = 'flex';
            
        } else {
            // --- User is LOGGED OUT ---
            console.log("User is logged out.");
            // Hide the main generator content, show login message
            mainContent.classList.add('hidden');
            loginMessage.classList.remove('hidden');
            
            // Update the navigation bar
            userInfo.classList.add('hidden');
            loginButton.classList.remove('hidden');
            
            // We can now see the auth container
            authContainer.style.display = 'flex';
        }
    });

    // Handle Google Login button click
    loginButton.addEventListener('click', () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider).catch(error => {
            console.error("Login Error:", error);
            showError("Failed to log in with Google: " + error.message);
        });
    });

    // Handle Logout button click
    logoutButton.addEventListener('click', () => {
        auth.signOut();
    });

    // --- ORIGINAL GENERATOR LOGIC (No changes needed) ---

    generateButton.addEventListener('click', async () => {
        // This function is identical to our previous version.
        // It's just inside the 'DOMContentLoaded' event now.
        const prompt = promptInput.value;
        if (!prompt) {
            showError("Please enter a prompt.");
            return;
        }
        resetUI();
        loadingIndicator.classList.remove('hidden');
        generateButton.disabled = true;
        generateButton.classList.add('btn-disabled');

        try {
            const response = await fetch(`${BACKEND_URL}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: prompt })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Unknown server error');
            }

            pluginYmlContent.textContent = data.pluginYml;
            mainJavaContent.textContent = data.mainJava;

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

    buildButton.addEventListener('click', async () => {
        // This function is also identical
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
        } catch (err)
 {
            showError(err.message);
            buildLoading.classList.add('hidden');
        }
    });
    
    // ... (the rest of the helper functions are identical) ...
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
