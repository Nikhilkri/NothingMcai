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
const provider = new firebase.auth.GoogleAuthProvider();

// --- DOM Elements ---
const loginPrompt = document.getElementById('login-prompt');
const loginButton = document.getElementById('login-button');
const authContainer = document.getElementById('auth-container');
const generatorContainer = document.getElementById('generator-container');
const projectsContainer = document.getElementById('projects-container');
const projectsList = document.getElementById('projects-list');

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
let projectsListener = null;

// --- Functions ---

function showLoading(text) {
    generateButton.disabled = true;
    generateButtonText.textContent = text;
    generateSpinner.classList.remove('hidden');
    errorBox.classList.add('hidden');
}

function hideLoading() {
    generateButton.disabled = false;
    generateButtonText.textContent = 'Generate Plugin';
    generateSpinner.classList.add('hidden');
}

function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.remove('hidden');
}

/**
 * NEW: Shows a temporary message on a build button
 */
function showBuildMessage(button, message, isError = false) {
    const originalText = button.innerHTML;
    button.disabled = true;
    button.textContent = message;
    
    if (isError) {
        button.classList.remove('bg-green-600', 'hover:bg-green-500');
        button.classList.add('bg-red-600');
    }

    setTimeout(() => {
        button.disabled = false;
        button.innerHTML = originalText;
        if (isError) {
            button.classList.add('bg-green-600', 'hover:bg-green-500');
            button.classList.remove('bg-red-600');
        }
    }, 5000); // Show message for 5 seconds
}

function updateUI(currentUser) {
    user = currentUser;
    if (user) {
        loginPrompt.classList.add('hidden');
        generatorContainer.classList.remove('hidden');
        projectsContainer.classList.remove('hidden');
        
        authContainer.innerHTML = `<button id="logout-button" class="px-4 py-2 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600">Logout</button>`;
        document.getElementById('logout-button').addEventListener('click', () => auth.signOut());

        listenForProjects(user.uid);

    } else {
        loginPrompt.classList.remove('hidden');
        generatorContainer.classList.add('hidden');
        projectsContainer.classList.add('hidden');
        authContainer.innerHTML = ``;
        
        if (projectsListener) {
            projectsListener();
            projectsListener = null;
        }
    }
}

function listenForProjects(userId) {
    if (projectsListener) {
        projectsListener();
    }

    const projectsRef = db.collection('users').doc(userId).collection('projects');
    
    projectsListener = projectsRef.orderBy('createdAt', 'desc').onSnapshot(snapshot => {
        if (snapshot.empty) {
            projectsList.innerHTML = `<p class="text-gray-400">You haven't generated any plugins yet.</p>`;
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const project = doc.data();
            const projectId = doc.id;

            html += `
                <div class="project-item p-4 rounded-lg">
                    <h3 class="text-lg font-medium">${project.name}</h3>
                    <p class="text-sm text-gray-400 mb-3">Saved: ${new Date(project.createdAt).toLocaleString()}</p>
                    <button 
                        class="build-button px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-500" 
                        data-project-id="${projectId}"
                        data-user-id="${userId}"
                    >
                        Build Plugin
                    </button>
                    <span class="build-status-text ml-4 text-sm text-gray-400"></span>
                </div>
            `;
        });
        
        projectsList.innerHTML = html;

        // --- THIS IS THE NEW BUILD BUTTON LOGIC ---
        // Add event listeners for ALL build buttons
        document.querySelectorAll('.build-button').forEach(button => {
            button.addEventListener('click', handleBuildClick);
        });

    }, error => {
        console.error("Error listening for projects: ", error);
        projectsList.innerHTML = `<p class="text-red-400">Error loading projects.</p>`;
    });
}

/**
 * NEW: Handles the "Build Plugin" button click
 */
async function handleBuildClick(event) {
    const button = event.target;
    const { projectId } = button.dataset;

    if (!user || !projectId) {
        showBuildMessage(button, 'Error: Not logged in', true);
        return;
    }

    // Show a loading state on the button
    const statusText = button.nextElementSibling;
    statusText.textContent = 'Starting build...';
    button.disabled = true;

    try {
        const token = await user.getIdToken();
        const response = await fetch('/api/startBuild', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ projectId: projectId })
        });

        if (!response.ok) {
            throw new Error('Failed to start build job.');
        }

        // --- SUCCESS! ---
        // This is the simplest v1. We just tell the user where to go.
        statusText.textContent = 'Build started! Check the "Actions" tab on your GitHub repo in 2-3 mins.';
        
        // Re-enable button after 10 seconds
        setTimeout(() => {
            button.disabled = false;
            statusText.textContent = '';
        }, 10000);

    } catch (error) {
        console.error('Error starting build:', error);
        statusText.textContent = `Error: ${error.message}`;
        button.disabled = false;
    }
}


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

        outputContainer.classList.remove('hidden');
        codeOutput.textContent = currentCode.pluginYml;
        tabYml.classList.add('active');
        tabJava.classList.remove('active');

        showLoading('Saving project...');
        
        const saveResponse = await fetch('/api/saveProject', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: prompt.substring(0, 50) || 'Untitled Plugin',
                pluginYml: data.pluginYml,
                mainJava: data.mainJava
            })
        });

        if (!saveResponse.ok) {
            throw new Error('AI worked, but failed to save project.');
        }
        hideLoading();
        promptInput.value = '';

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
auth.onAuthStateChanged(updateUI);
