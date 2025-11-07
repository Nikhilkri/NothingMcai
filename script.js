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
const db = firebase.firestore(); // Our database
const provider = new firebase.auth.GoogleAuthProvider();

// --- DOM Elements ---
const loginPrompt = document.getElementById('login-prompt');
const loginButton = document.getElementById('login-button');
const authContainer = document.getElementById('auth-container');
const generatorContainer = document.getElementById('generator-container');
const projectsContainer = document.getElementById('projects-container'); // NEW: The "My Projects" container
const projectsList = document.getElementById('projects-list'); // NEW: The list itself

const promptInput = document.getElementById('prompt-input');
const generateButton = document.getElementById('generate-button');
const generateButtonText = document.getElementById('generate-button-text');
const generateSpinner = document.getElementById('generate-spinner');
const errorBox = document.getElementById('error-box');

const outputContainer = document.getElementById('output-container');
const tabYml = document.getElementById('tab-yml');
const tabJava = document.getElementById('tab-java');
const codeOutput = document.getElementById('code-output');

// --- Global State ---
let user = null;
let currentCode = { pluginYml: '', mainJava: '' };
let projectsListener = null; // NEW: This will be our real-time database listener

// --- Functions ---

/**
 * Shows a loading spinner on the generate button
 */
function showLoading(text) {
    generateButton.disabled = true;
    generateButtonText.textContent = text;
    generateSpinner.classList.remove('hidden');
    errorBox.classList.add('hidden');
}

/**
 * Hides the loading spinner
 */
function hideLoading() {
    generateButton.disabled = false;
    generateButtonText.textContent = 'Generate Plugin';
    generateSpinner.classList.add('hidden');
}

/**
 * Shows an error message
 */
function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.remove('hidden');
}

/**
 * Updates the UI based on login state
 */
function updateUI(currentUser) {
    user = currentUser;
    if (user) {
        // User is logged in
        loginPrompt.classList.add('hidden');
        generatorContainer.classList.remove('hidden');
        projectsContainer.classList.remove('hidden'); // NEW: Show the "My Projects" section
        
        // Create logout button
        authContainer.innerHTML = `<button id="logout-button" class="px-4 py-2 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600">Logout</button>`;
        document.getElementById('logout-button').addEventListener('click', () => auth.signOut());

        // NEW: Start listening for this user's projects
        listenForProjects(user.uid);

    } else {
        // User is logged out
        loginPrompt.classList.remove('hidden');
        generatorContainer.classList.add('hidden');
        projectsContainer.classList.add('hidden'); // NEW: Hide the "My Projects" section

        // Show login button
        authContainer.innerHTML = ``; // No button in header when logged out
        
        // NEW: Stop listening to the database if we log out
        if (projectsListener) {
            projectsListener(); // This detaches the listener
            projectsListener = null;
        }
    }
}

/**
 * NEW: Listens to the database in real-time
 */
function listenForProjects(userId) {
    // If we're already listening, stop the old listener
    if (projectsListener) {
        projectsListener();
    }

    const projectsRef = db.collection('users').doc(userId).collection('projects');
    
    // onSnapshot is a real-time listener. It auto-updates
    // whenever the database changes!
    projectsListener = projectsRef.onSnapshot(snapshot => {
        if (snapshot.empty) {
            projectsList.innerHTML = `<p class="text-gray-400">You haven't generated any plugins yet.</p>`;
            return;
        }

        // We have projects, let's build the HTML
        let html = '';
        snapshot.forEach(doc => {
            const project = doc.data();
            const projectId = doc.id; // This is the unique ID (e.g., aBcDeF123)

            // We create a card for each project
            // Note the data-project-id attribute on the button. This is CRITICAL.
            html += `
                <div class="project-item p-4 rounded-lg">
                    <h3 class="text-lg font-medium">${project.name}</h3>
                    <p class="text-sm text-gray-400 mb-3">Saved: ${new Date(project.createdAt).toLocaleString()}</p>
                    <button 
                        class="build-button px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-500" 
                        data-project-id="${projectId}"
                    >
                        Build Plugin (Coming Soon)
                    </button>
                </div>
            `;
        });
        
        // Update the list on the webpage
        projectsList.innerHTML = html;

        // NEW: We will add event listeners for all the new "Build" buttons
        // For now, they just show an alert.
        document.querySelectorAll('.build-button').forEach(button => {
            button.addEventListener('click', () => {
                const projectId = button.dataset.projectId;
                alert(`Build button clicked for Project ID: ${projectId}\nThis feature is the final step!`);
            });
        });

    }, error => {
        console.error("Error listening for projects: ", error);
        projectsList.innerHTML = `<p class="text-red-400">Error loading projects.</p>`;
    });
}


/**
 * Handles the "Generate" button click
 */
async function handleGenerateClick() {
    if (!user) {
        showError('You must be logged in to generate a plugin.');
        return;
    }

    const prompt = promptInput.value;
    if (!prompt) {
        showError('Please enter a description for your plugin.');
        return;
    }

    showLoading('Contacting REAL AI...');

    try {
        // --- Step 1: Call the AI ---
        const token = await user.getIdToken();
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ prompt: prompt })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'The AI failed to generate the code.');
        }

        const data = await response.json();
        currentCode = { pluginYml: data.pluginYml, mainJava: data.mainJava };

        // Show the code in the tabs
        outputContainer.classList.remove('hidden');
        codeOutput.textContent = currentCode.pluginYml;
        tabYml.classList.add('active');
        tabJava.classList.remove('active');

        // --- Step 2: Save the Project ---
        // This part now happens *after* the AI is successful
        showLoading('Saving project...');
        
        const saveResponse = await fetch('/api/saveProject', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: prompt.substring(0, 50), // Use the first 50 chars of the prompt as a name
                pluginYml: data.pluginYml,
                mainJava: data.mainJava
            })
        });

        if (!saveResponse.ok) {
            throw new Error('AI worked, but failed to save project.');
        }

        // Success!
        hideLoading();
        promptInput.value = ''; // Clear the input box
        // The real-time listener will automatically see this new project and update the list!

    } catch (error) {
        console.error('Error:', error);
        showError(error.message);
        hideLoading();
    }
}

// --- Event Listeners ---
loginButton.addEventListener('click', () => {
    auth.signInWithPopup(provider).catch(error => console.error("Login failed:", error));
});

generateButton.addEventListener('click', handleGenerateClick);

tabYml.addEventListener('click', () => {
    tabYml.classList.add('active');
    tabJava.classList.remove('active');
    codeOutput.textContent = currentCode.pluginYml;
});

tabJava.addEventListener('click', () => {
    tabJava.classList.add('active');
    tabYml.classList.remove('active');
    codeOutput.textContent = currentCode.mainJava;
});

// --- Startup ---
// Listen for changes in login state
auth.onAuthStateChanged(updateUI);
