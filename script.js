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

// --- 2. INITIALIZATION ---
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const provider = new firebase.auth.GoogleAuthProvider();

// --- 3. DOM ELEMENTS ---
// Views
const homeView = document.getElementById('home-view');
const editorView = document.getElementById('editor-view');

// Home View
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
const homeButton = document.getElementById('home-button');

// Editor View
const editorProjectName = document.getElementById('editor-project-name');
const fileExplorer = document.getElementById('file-explorer');
const currentFileName = document.getElementById('current-file-name');
const codeEditor = document.getElementById('code-editor');
const saveButton = document.getElementById('save-button');
const chatWindow = document.getElementById('chat-window');
const chatInput = document.getElementById('chat-input');
const chatSendButton = document.getElementById('chat-send-button');
const compileButton = document.getElementById('compile-button');
const compileButtonText = document.getElementById('compile-button-text');
const compileSpinner = document.getElementById('compile-spinner');
const compileStatus = document.getElementById('compile-status');

// --- 4. GLOBAL STATE ---
let user = null;
let currentProject = null;
let currentFile = 'mainJava'; // Default to Java file
const FILES_TO_DISPLAY = {
    mainJava: 'Main.java',
    pluginYml: 'plugin.yml'
};

// --- 5. UI/LOADING/ERROR HELPERS ---

function navigateTo(view, projectId = null) {
    if (view === 'home') {
        homeView.classList.remove('hidden');
        editorView.classList.add('hidden');
    } else if (view === 'editor' && projectId) {
        homeView.classList.add('hidden');
        editorView.classList.remove('hidden');
        loadProject(projectId);
    }
}

function updateLoading(buttonElement, spinnerElement, text, isLoading, statusTextElement = null, originalText = 'Generate') {
    
    if (isLoading) {
        buttonElement.disabled = true;
        document.getElementById(buttonElement.id + '-text').textContent = text;
        spinnerElement.classList.remove('hidden');
        if (statusTextElement) statusTextElement.textContent = '';
    } else {
        buttonElement.disabled = false;
        document.getElementById(buttonElement.id + '-text').textContent = originalText;
        spinnerElement.classList.add('hidden');
    }
}

function showError(message, element = errorBox) {
    element.textContent = message;
    element.classList.remove('hidden');
    // For editor view errors, use the status bar
    if (element === editorProjectName) {
        compileStatus.textContent = message;
        compileStatus.classList.add('text-red-500');
    }
    setTimeout(() => {
        element.classList.add('hidden');
        if (element === editorProjectName) {
            compileStatus.textContent = '';
            compileStatus.classList.remove('text-red-500');
        }
    }, 5000);
}

// --- 6. AUTHENTICATION ---

homeButton.addEventListener('click', () => navigateTo('home'));
loginButton.addEventListener('click', () => {
    auth.signInWithPopup(provider).catch(error => console.error("Login failed:", error));
});

auth.onAuthStateChanged(currentUser => {
    user = currentUser;
    if (user) {
        showAuthenticatedUI(user);
        listenForProjects(user.uid);
    } else {
        showUnauthenticatedUI();
    }
});

function showAuthenticatedUI(user) {
    loginPrompt.classList.add('hidden');
    generatorContainer.classList.remove('hidden');
    projectsContainer.classList.remove('hidden');
    
    // Display name in the header
    const displayName = user.displayName ? user.displayName.split(' ')[0] : 'User';
    authContainer.innerHTML = `<span class="text-sm mr-4 text-gray-400">Hi, ${displayName}!</span><button id="logout-button" class="px-3 py-1 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 text-sm">Logout</button>`;
    document.getElementById('logout-button').addEventListener('click', () => auth.signOut());
}

function showUnauthenticatedUI() {
    loginPrompt.classList.remove('hidden');
    generatorContainer.classList.add('hidden');
    projectsContainer.classList.add('hidden');
    authContainer.innerHTML = ``;
    navigateTo('home');
}

// --- 7. PROJECT LISTING & DELETION ---

function listenForProjects(userId) {
    const projectsRef = db.collection('users').doc(userId).collection('projects').orderBy('createdAt', 'desc');
    
    projectsRef.onSnapshot(snapshot => {
        if (snapshot.empty) {
            projectsList.innerHTML = `<p class="text-gray-400">You haven't generated any plugins yet.</p>`;
            return;
        }

        projectsList.innerHTML = '';
        snapshot.forEach(doc => {
            const project = doc.data();
            const projectId = doc.id;

            const projectItem = document.createElement('div');
            projectItem.className = 'project-list-item p-4 rounded-lg flex justify-between items-center';
            projectItem.innerHTML = `
                <div class="flex-grow">
                    <h3 class="text-lg font-medium">${project.name}</h3>
                    <p class="text-sm text-gray-400">ID: ${projectId.substring(0, 8)}...</p>
                </div>
                <div class="flex space-x-2">
                    <button class="open-button px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500 text-sm" data-project-id="${projectId}">
                        Open Editor
                    </button>
                    <button class="delete-button p-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-500 text-sm" data-project-id="${projectId}">
                        Delete
                    </button>
                </div>
            `;
            projectsList.appendChild(projectItem);
        });

        // Event delegation for opening and deleting
        projectsList.querySelectorAll('.open-button').forEach(button => {
            button.addEventListener('click', (e) => {
                navigateTo('editor', e.target.dataset.projectId);
            });
        });
        projectsList.querySelectorAll('.delete-button').forEach(button => {
            button.addEventListener('click', (e) => {
                handleDeleteClick(e.target.dataset.projectId, e.target);
            });
        });
    }, error => {
        console.error("Error listening for projects: ", error);
        projectsList.innerHTML = `<p class="text-red-400">Error loading projects.</p>`;
    });
}

async function handleDeleteClick(projectId, button) {
    if (!user) return showError('You must be logged in.');

    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Deleting...';

    // Simple custom confirmation (since we can't use alert/confirm)
    if (!window.confirm(`Are you sure you want to delete project ${projectId.substring(0, 8)}...? This cannot be undone.`)) {
        button.textContent = originalText;
        button.disabled = false;
        return;
    }

    try {
        await db.collection('users').doc(user.uid).collection('projects').doc(projectId).delete();
        
        // Success is handled by the onSnapshot listener, which automatically removes the item.
        // Provide visual feedback if the listener is slow.
        button.textContent = 'Deleted!';

    } catch (error) {
        console.error("Delete Error:", error);
        showError('Failed to delete project: ' + error.message);
        button.textContent = 'Failed!';
        setTimeout(() => { button.textContent = originalText; button.disabled = false; }, 3000);
    }
}


// --- 8. PROJECT GENERATION (Directs to Editor) ---

generateButton.addEventListener('click', handleGenerateClick);

async function handleGenerateClick() {
    if (!user) return showError('You must be logged in.');
    const prompt = promptInput.value;
    if (!prompt) return showError('Please enter a description for your plugin.');

    updateLoading(generateButton, generateSpinner, 'Thinking...', true);
    
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
            throw new Error(errorData.error || 'The AI failed to generate and save the code.');
        }

        const data = await response.json();
        promptInput.value = '';
        updateLoading(generateButton, generateSpinner, 'Generate', false);
        
        // --- Navigate directly to the new project's editor ---
        navigateTo('editor', data.projectId);

    } catch (error) {
        console.error('Generation Error:', error);
        showError(error.message);
        updateLoading(generateButton, generateSpinner, 'Generate', false);
    }
}

// --- 9. EDITOR FUNCTIONALITY ---

async function loadProject(projectId) {
    currentProject = null;
    editorProjectName.textContent = 'Loading...';
    codeEditor.value = '';
    chatWindow.innerHTML = '<p class="text-gray-400 p-2">Loading project data...</p>';
    compileStatus.textContent = '';
    compileStatus.classList.remove('text-yellow-400', 'text-red-500');

    try {
        const docRef = db.collection('users').doc(user.uid).collection('projects').doc(projectId);
        const doc = await docRef.get();
        
        if (!doc.exists) {
            return showError('Project not found.', editorProjectName);
        }

        const projectData = doc.data();
        // Add a temporary owner field for the compile link
        currentProject = { id: doc.id, owner: user.uid, ...projectData }; 
        editorProjectName.textContent = currentProject.name;
        
        // Populate Editor
        displayFile('mainJava');
        
        // Populate File Explorer
        renderFileExplorer();
        
        // Populate Chat (Initial explanation and prompt feedback)
        renderEditorChat(projectData.explanation, projectData.name);
        
        // Set up editor event listeners 
        saveButton.removeEventListener('click', handleSaveClick);
        saveButton.addEventListener('click', handleSaveClick);
        compileButton.removeEventListener('click', handleCompileClick);
        compileButton.addEventListener('click', handleCompileClick);
        chatSendButton.removeEventListener('click', handleChatSendClick);
        chatSendButton.addEventListener('click', handleChatSendClick);
        
    } catch (error) {
        console.error("Error loading project:", error);
        showError('Failed to load project data. Please try again.', editorProjectName);
    }
}

function renderFileExplorer() {
    fileExplorer.innerHTML = '';
    Object.keys(FILES_TO_DISPLAY).forEach(key => {
        const fileElement = document.createElement('div');
        fileElement.className = `file-item ${key === currentFile ? 'active' : ''} rounded`;
        fileElement.textContent = FILES_TO_DISPLAY[key];
        fileElement.dataset.fileKey = key;
        
        fileElement.addEventListener('click', () => displayFile(key));
        fileExplorer.appendChild(fileElement);
    });
}

function displayFile(fileKey) {
    // 1. Save current changes before switching
    if (currentProject && currentFile && codeEditor.value) {
        currentProject[currentFile] = codeEditor.value;
    }
    
    // 2. Load new file
    currentFile = fileKey;
    currentFileName.textContent = FILES_TO_DISPLAY[fileKey];
    codeEditor.value = currentProject[fileKey] || '';
    
    // 3. Update active state in explorer
    renderFileExplorer();
}

function renderEditorChat(explanation, prompt) {
    chatWindow.innerHTML = `
        <div class="chat-message ai-message rounded-lg p-3 text-sm">
            <h4 class="font-bold text-indigo-300 mb-2">Your Prompt:</h4>
            <p class="text-gray-400 italic">${prompt}</p>
        </div>
        <div class="chat-message ai-message rounded-lg p-3 text-sm">
            <h4 class="font-bold text-indigo-300 mb-2">AI Explanation:</h4>
            ${explanation.replace(/\n/g, '<br>')}
        </div>
    `;
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

// --- 10. EDITOR ACTIONS ---

async function handleSaveClick() {
    if (!currentProject || !user) return showError('Login or project error.', editorProjectName);

    // Save content from the editor to the currentProject state
    if (currentFile) {
        currentProject[currentFile] = codeEditor.value;
    }
    
    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';
    
    try {
        const projectRef = db.collection('users').doc(user.uid).collection('projects').doc(currentProject.id);

        await projectRef.update({
            mainJava: currentProject.mainJava,
            pluginYml: currentProject.pluginYml,
        });
        
        saveButton.textContent = 'Saved!';
        setTimeout(() => { saveButton.textContent = 'Save Changes'; saveButton.disabled = false; }, 2000);
        
    } catch (error) {
        console.error('Save Error:', error);
        showError('Failed to save project changes.', editorProjectName);
        saveButton.textContent = 'Save Failed';
        setTimeout(() => { saveButton.textContent = 'Save Changes'; saveButton.disabled = false; }, 5000);
    }
}

async function handleCompileClick() {
    if (!currentProject || !user) return showError('Login or project error.', editorProjectName);
    
    // 1. Ensure latest changes are saved before compiling
    if (currentFile) {
        currentProject[currentFile] = codeEditor.value;
    }
    
    updateLoading(compileButton, compileSpinner, 'Starting Build...', true, compileStatus);
    compileStatus.textContent = 'Saving final changes...';
    
    try {
        const token = await user.getIdToken();
        const projectRef = db.collection('users').doc(user.uid).collection('projects').doc(currentProject.id);

        // Update database with latest code
        await projectRef.update({
            mainJava: currentProject.mainJava,
            pluginYml: currentProject.pluginYml,
        });

        compileStatus.textContent = 'Saved. Triggering GitHub Bot...';

        // 2. Trigger the build bot
        const buildResponse = await fetch('/api/startBuild', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ projectId: currentProject.id })
        });
        
        if (!buildResponse.ok) {
            const errorData = await buildResponse.json();
            throw new Error(errorData.error || 'Build trigger failed at Vercel API level.');
        }

        // Success!
        const githubUserSpan = document.querySelector('#auth-container span');
        const githubUser = githubUserSpan ? githubUserSpan.textContent.replace('Hi, ', '').replace('!', '') : 'user-repo-name'; 
        
        compileStatus.classList.remove('text-gray-400');
        compileStatus.classList.add('text-yellow-400');
        compileStatus.innerHTML = `Build started! Check your <a href="https://github.com/${githubUser}/${currentProject.name}/actions" target="_blank" class="underline font-medium">GitHub Actions</a> in 2 mins.`;

    } catch (error) {
        console.error('Compile Error:', error);
        compileStatus.classList.remove('text-gray-400', 'text-yellow-400');
        compileStatus.classList.add('text-red-500');
        compileStatus.textContent = `Build Error: ${error.message}`;
        
    } finally {
        updateLoading(compileButton, compileSpinner, 'Compile & Build JAR', false);
    }
}

// Placeholder for future chat functionality
async function handleChatSendClick() {
    const message = chatInput.value.trim();
    if (!message) return;
    
    // Append user message
    chatWindow.innerHTML += `
        <div class="chat-message user-message rounded-lg p-3 text-sm ml-auto">
            ${message}
        </div>
    `;
    
    chatInput.value = '';
    chatWindow.scrollTop = chatWindow.scrollHeight;
    
    // Placeholder AI response
    chatWindow.innerHTML += `
        <div class="chat-message ai-message rounded-lg p-3 text-sm">
            <h4 class="font-bold text-indigo-300 mb-1">AI Thinking...</h4>
            <p class="text-gray-400">The AI code modification feature is complex and pending implementation in a later version. For now, you can edit the code directly.</p>
        </div>
    `;
    chatWindow.scrollTop = chatWindow.scrollHeight;
}
