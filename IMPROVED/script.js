
// ========================================
// MODEL CONFIGURATION
// ========================================

const MODELS = {
    v1: {
        name: "Version 1",
        description: "Original model",
        url: "https://teachablemachine.withgoogle.com/models/pnBTobRHF/"
    },

    v2: {
        name: "Version 2",
        description: "Improved model",
        url: "https://teachablemachine.withgoogle.com/models/6pWNgomHL/"
    }
};

let model = null;
let currentVersion = "v1";

let modelLoadId = 0;
let imageAnalysisId = 0;

let currentImageUrl = null;


// ========================================
// HTML ELEMENTS
// ========================================

const imageInput = document.getElementById("imageInput");
const imagePreview = document.getElementById("imagePreview");
const previewWrap = document.getElementById("previewWrap");
const fileName = document.getElementById("fileName");

const modelStatus = document.getElementById("modelStatus");
const topPrediction = document.getElementById("topPrediction");
const topConfidence = document.getElementById("topConfidence");

const scoreList = document.getElementById("scoreList");
const appMessage = document.getElementById("appMessage");

const version1Button = document.getElementById("version1Button");
const version2Button = document.getElementById("version2Button");
const selectedVersion = document.getElementById("selectedVersion");


// ========================================
// MODEL VERSION SELECTOR
// ========================================

version1Button.addEventListener("click", () => {
    switchModel("v1");
});

version2Button.addEventListener("click", () => {
    switchModel("v2");
});

function updateVersionInterface() {

    version1Button.classList.toggle(
        "selected",
        currentVersion === "v1"
    );

    version2Button.classList.toggle(
        "selected",
        currentVersion === "v2"
    );

    const selectedModel = MODELS[currentVersion];

    selectedVersion.textContent =
        `Currently selected: ${selectedModel.name} — ${selectedModel.description}`;

}


// ========================================
// LOAD MODEL
// ========================================

async function loadModel(version) {

    const loadId = ++modelLoadId;

    const selectedModel = MODELS[version];

    model = null;

    modelStatus.textContent = "Loading model...";
    modelStatus.classList.remove("model-ready");

    appMessage.textContent =
        `Loading ${selectedModel.name}...`;

    topPrediction.textContent = "Waiting for model...";
    topConfidence.textContent = "--%";

    scoreList.innerHTML =
        "<p>Loading recognition model...</p>";

    const buttons = [
        version1Button,
        version2Button
    ];

    buttons.forEach(button => {
        button.disabled = true;
    });

    try {

        const modelUrl = selectedModel.url.trim();

        if (
            !modelUrl.startsWith("https://") ||
            modelUrl.includes("PASTE_VERSION_2")
        ) {
            throw new Error(
                `${selectedModel.name} URL is not configured.`
            );
        }

        const baseUrl = modelUrl.endsWith("/")
            ? modelUrl
            : modelUrl + "/";

        const loadedModel = await tmImage.load(
            baseUrl + "model.json",
            baseUrl + "metadata.json"
        );

        // Ignore outdated model-loading requests.
        if (loadId !== modelLoadId) {

            loadedModel.dispose();

            return;

        }

        model = loadedModel;

        modelStatus.textContent = "Model Ready";
        modelStatus.classList.add("model-ready");

        appMessage.textContent =
            `${selectedModel.name} loaded successfully.`;

        console.log(
            `${selectedModel.name} loaded successfully!`
        );

        // Reclassify the existing image if available.
        if (imagePreview.src && !previewWrap.hidden) {
            await analyzeImage();
        } else {

            topPrediction.textContent = "Waiting for image";
            topConfidence.textContent = "--%";

            scoreList.innerHTML =
                "<p>Upload an image to see prediction results.</p>";

            appMessage.textContent =
                `${selectedModel.name} is ready. Upload an image.`;

        }

    } catch (error) {

        if (loadId !== modelLoadId) return;

        console.error("Model loading error:", error);

        model = null;

        modelStatus.textContent = "Model Error";

        modelStatus.classList.remove("model-ready");

        topPrediction.textContent = "Model unavailable";
        topConfidence.textContent = "--%";

        scoreList.innerHTML = "";

        appMessage.textContent = error.message;

    } finally {

        if (loadId === modelLoadId) {

            buttons.forEach(button => {
                button.disabled = false;
            });

        }

    }

}


// ========================================
// SWITCH MODEL
// ========================================

async function switchModel(version) {

    if (version === currentVersion && model) {
        return;
    }

    if (version === "v2" && !MODELS.v2.url.startsWith("https://")) {

        currentVersion = version;

        updateVersionInterface();

        await loadModel(version);

        return;
    }

    if (version === currentVersion && !model) {
        return;
    }

    currentVersion = version;

    updateVersionInterface();

    await loadModel(version);

}


// ========================================
// CLASSIFY IMAGE
// ========================================

async function classifyImage(imageElement) {

    if (!model) {
        throw new Error("Model is not loaded.");
    }

    const predictions = await model.predict(imageElement);

    return predictions.sort(
        (a, b) => b.probability - a.probability
    );

}


// ========================================
// DISPLAY PREDICTIONS
// ========================================

function displayPredictions(predictions) {

    const bestPrediction = predictions[0];

    const percentage =
        (bestPrediction.probability * 100).toFixed(1);

    topPrediction.textContent =
        bestPrediction.className;

    topConfidence.textContent =
        percentage + "%";

    scoreList.innerHTML = "";

    predictions.forEach(prediction => {

        const percentage =
            prediction.probability * 100;

        const roundedPercentage =
            percentage.toFixed(1);

        const scoreItem = document.createElement("div");

        scoreItem.className = "score-item";

        scoreItem.innerHTML = `
            <div class="score-label">
                <span>${escapeHTML(prediction.className)}</span>
                <span>${roundedPercentage}%</span>
            </div>

            <div class="progress-track">
                <div
                    class="progress-fill"
                    style="width: ${percentage}%"
                ></div>
            </div>
        `;

        scoreList.appendChild(scoreItem);

    });

}


// ========================================
// ESCAPE HTML
// ========================================

function escapeHTML(value) {

    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);

}


// ========================================
// ANALYZE IMAGE
// ========================================

async function analyzeImage() {

    if (!model || !imagePreview.src) {
        return;
    }

    const analysisId = ++imageAnalysisId;
    const activeModel = model;

    topPrediction.textContent = "Analyzing image...";
    topConfidence.textContent = "--%";

    scoreList.innerHTML =
        "<p>Analyzing image...</p>";

    appMessage.textContent =
        `Recognizing using ${MODELS[currentVersion].name}...`;

    try {

        const predictions =
            await classifyImage(imagePreview);

        // Ignore results from an old image or model.
        if (
            analysisId !== imageAnalysisId ||
            activeModel !== model
        ) {
            return;
        }

        displayPredictions(predictions);

        appMessage.textContent =
            `Recognition completed using ${MODELS[currentVersion].name}.`;

    } catch (error) {

        if (
            analysisId !== imageAnalysisId ||
            activeModel !== model
        ) {
            return;
        }

        console.error(error);

        topPrediction.textContent = "Unable to classify";
        topConfidence.textContent = "--%";

        scoreList.innerHTML = "";

        appMessage.textContent = error.message;

    }

}


// ========================================
// IMAGE UPLOAD
// ========================================

imageInput.addEventListener("change", async (event) => {

    const selectedFile = event.target.files[0];

    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("image/")) {

        fileName.textContent =
            "Please choose a valid image.";

        return;

    }

    if (currentImageUrl) {
        URL.revokeObjectURL(currentImageUrl);
    }

    currentImageUrl = URL.createObjectURL(selectedFile);

    imagePreview.src = currentImageUrl;

    imagePreview.alt =
        `Preview of ${selectedFile.name}`;

    fileName.textContent = selectedFile.name;

    previewWrap.hidden = false;

    // Invalidate any previous prediction.
    imageAnalysisId++;

    topPrediction.textContent = "Analyzing image...";
    topConfidence.textContent = "--%";

    scoreList.innerHTML =
        "<p>Analyzing image...</p>";

    try {

        await imagePreview.decode();

        if (!model) {

            appMessage.textContent =
                "Waiting for recognition model...";

            return;

        }

        await analyzeImage();

    } catch (error) {

        console.error(error);

        topPrediction.textContent = "Unable to load image";
        topConfidence.textContent = "--%";

        scoreList.innerHTML = "";

        appMessage.textContent =
            "There was a problem loading the selected image.";

    }

});


// ========================================
// INITIALIZE APPLICATION
// ========================================

updateVersionInterface();

loadModel(currentVersion);
