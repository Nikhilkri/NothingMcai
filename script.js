// This is the client-side JavaScript.
// It's almost the same, but the backend URL is now MUCH simpler.

// ! ! ! IMPORTANT ! ! !
// We don't need a full URL. We just call our own website's API folder.
const BACKEND_URL = ''; // This is all we need!

document.addEventListener('DOMContentLoaded', () => {
    const generateButton = document.getElementById('generateButton');
    const buildButton = document.getElementById('buildButton');
    // ... (all the other element selectors are the same) ...
    const promptInput = document.getElementById('promptInput');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const outputSection = document.getElementById('outputSection');
    const errorMessage = document.getElementById('errorMessage');
    const pluginYmlContent = document.getElementById('pluginYmlContent');
    const mainJavaContent = document.getElementById('mainJavaContent');
    const buildLoading = document.getElementById('buildLoading');
    const buildResult = document.getElementById('buildResult');
    const downloadLink = document.getElementById('downloadLink');

    generateButton.addEventListener('click', async () => {
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
            // This now calls '/api/generate' on our own website
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
        buildButton.disabled = true;
        buildButton.classList.add('btn-disabled');
        buildResult.classList.add('hidden');
        buildLoading.classList.remove('hidden');

        const javaCode = mainJavaContent.textContent;
        const ymlCode = pluginYmlContent.textContent;

        try {
            // This now calls '/api/build' on our own website
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
