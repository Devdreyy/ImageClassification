// ========================================
// MODEL CONFIGURATION
// ========================================

const MODEL_URL =
    "https://teachablemachine.withgoogle.com/models/6pWNgomHL/";

let model;

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

let currentImageUrl = null;


// ========================================
// LOAD MODEL
// ========================================

async function loadModel() {

    try {

        modelStatus.textContent = "Loading model...";

        model = await tmImage.load(
            MODEL_URL + "model.json",
            MODEL_URL + "metadata.json"
        );

        modelStatus.textContent = "Model Ready";
        modelStatus.classList.add("model-ready");

        appMessage.textContent =
            "Model loaded successfully. Upload an image.";

        console.log("Model loaded successfully!");

    } catch (error) {

        console.error("Model loading error:", error);

        modelStatus.textContent = "Model Error";

        appMessage.textContent =
            "Unable to load model. Check your model URL.";

    }

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

    // Get highest prediction
    const bestPrediction = predictions[0];

    const percentage =
        (bestPrediction.probability * 100).toFixed(1);

    // Display top prediction
    topPrediction.textContent =
        bestPrediction.className;

    topConfidence.textContent =
        percentage + "%";


    // Clear previous scores
    scoreList.innerHTML = "";


    // Display all class predictions
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


// Safely display class names in HTML
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


    // Release previous image
    if (currentImageUrl) {

        URL.revokeObjectURL(currentImageUrl);

    }


    // Preview uploaded image
    currentImageUrl =
        URL.createObjectURL(selectedFile);

    imagePreview.src = currentImageUrl;

    imagePreview.alt =
        `Preview of ${selectedFile.name}`;

    fileName.textContent =
        selectedFile.name;

    previewWrap.hidden = false;


    // Reset previous prediction
    topPrediction.textContent =
        "Analyzing image...";

    topConfidence.textContent =
        "--%";

    scoreList.innerHTML =
        "<p>Analyzing image...</p>";


    try {

        // Wait for image to load
        await imagePreview.decode();

        // Wait for model if it is not loaded
        if (!model) {
            await loadModel();
        }

        if (!model) {
            throw new Error("Model is unavailable.");
        }

        appMessage.textContent =
            "Recognizing object...";


        // Get predictions
        const predictions =
            await classifyImage(imagePreview);


        // Update interface
        displayPredictions(predictions);

        appMessage.textContent =
            "Recognition completed successfully.";

    } catch (error) {

        console.error(error);

        topPrediction.textContent =
            "Unable to classify";

        topConfidence.textContent =
            "--%";

        scoreList.innerHTML = "";

        appMessage.textContent =
            error.message;

    }

});


// ========================================
// INITIALIZE APPLICATION
// ========================================

loadModel();