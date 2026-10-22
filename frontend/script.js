
const API_URL = "https://skinsight-4tzf.onrender.com/predict";

const form = document.getElementById("upload-form");
const imageInput = document.getElementById("image-input");
const uploadBox = document.getElementById("upload-box");
const preview = document.getElementById("preview");
const uploadIcon = document.getElementById("upload-icon");
const uploadTitle = document.getElementById("upload-title");
const uploadSubtitle = document.getElementById("upload-subtitle");
const analyzeButton = document.getElementById("analyze-button");
const message = document.getElementById("message");
const result = document.getElementById("result");

const predictedClass = document.getElementById("predicted-class");
const classDescription = document.getElementById("class-description");

const CLASS_INFO = {
  AKIEC: {
    name: "Actinic keratosis / Bowen-like lesion",
    shortName: "Actinic / Bowen-like",
    description: "This category includes sun-damage-related precancerous lesions and Bowen's disease. A dermatologist must assess any real skin lesion."
  },
  BCC: {
    name: "Basal cell carcinoma",
    shortName: "Basal cell carcinoma",
    description: "A type of skin cancer. This model cannot confirm a diagnosis; seek professional medical assessment for a concerning spot."
  },
  BKL: {
    name: "Benign keratosis-like lesion",
    shortName: "Keratosis-like lesion",
    description: "This category includes some non-cancerous, keratosis-like skin lesions. The AI result does not confirm that a spot is harmless."
  },
  DF: {
    name: "Dermatofibroma",
    shortName: "Dermatofibroma",
    description: "A category commonly associated with a firm, usually benign skin nodule. An image-based prediction cannot confirm what a real lesion is."
  },
  MEL: {
    name: "Melanoma",
    shortName: "Melanoma",
    description: "A potentially serious type of skin cancer. This model cannot diagnose or rule out melanoma. Seek prompt medical assessment for a concerning or changing spot."
  },
  NV: {
    name: "Mole-like lesion (melanocytic nevus)",
    shortName: "Mole-like lesion",
    description: "This category commonly represents moles, which are often benign. A new, changing, bleeding, or unusual spot should be assessed by a dermatologist."
  },
  VASC: {
    name: "Vascular lesion",
    shortName: "Vascular lesion",
    description: "A category of skin lesions related to blood vessels. A healthcare professional can assess the actual lesion."
  }
};
const probability = document.getElementById("probability");
const probabilityList = document.getElementById("probability-list");
const disclaimer = document.getElementById("disclaimer");

const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
const maxSize = 10 * 1024 * 1024;

let selectedFile = null;
let previewUrl = null;

imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];

  message.textContent = "";
  message.className = "message";

  if (!file) return;

  if (!allowedTypes.includes(file.type)) {
    showError("Please choose a JPG, PNG, or WEBP image.");
    imageInput.value = "";
    return;
  }

  if (file.size > maxSize) {
    showError("Image must be smaller than 10 MB.");
    imageInput.value = "";
    return;
  }

  selectedFile = file;

  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
  }

  previewUrl = URL.createObjectURL(file);
  preview.src = previewUrl;
  preview.hidden = false;

  uploadIcon.hidden = true;
  uploadTitle.textContent = file.name;
  uploadSubtitle.textContent = "Image selected successfully";

  analyzeButton.disabled = false;
  result.hidden = true;
});

function showError(text) {
  message.textContent = text;
  message.className = "message error";
  analyzeButton.disabled = !selectedFile;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!selectedFile) {
    showError("Please select an image first.");
    return;
  }

  analyzeButton.disabled = true;
  analyzeButton.textContent = "Analyzing image...";
  message.className = "message";
  message.textContent = "Uploading image to SkinSight AI...";
  result.hidden = true;

  try {
    const formData = new FormData();
    formData.append("file", selectedFile);

    const response = await fetch(API_URL, {
      method: "POST",
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Image analysis failed.");
    }

   const info = CLASS_INFO[data.predicted_class];

predictedClass.textContent = info
  ? info.name
  : data.predicted_class;

classDescription.textContent = info
  ? info.description
  : "The model returned a category that has no available explanation.";

probability.textContent =
  (Number(data.probability) * 100).toFixed(2) + "%";

    probabilityList.replaceChildren();

    for (const [name, score] of Object.entries(data.probabilities)) {
      const percentage = Number(score) * 100;

      const row = document.createElement("div");
      row.className = "probability-row";

      if (name === data.predicted_class) {
        row.classList.add("top");
      }

      const label = document.createElement("span");
      label.textContent = CLASS_INFO[name]?.shortName ?? name;
label.title = name;

      const bar = document.createElement("div");
      bar.className = "bar";

      const fill = document.createElement("div");
      fill.className = "bar-fill";
      fill.style.width = `${Math.max(0, Math.min(100, percentage))}%`;

      bar.appendChild(fill);

      const scoreLabel = document.createElement("span");
      scoreLabel.className = "percentage";
      scoreLabel.textContent = percentage.toFixed(2) + "%";

      row.append(label, bar, scoreLabel);
      probabilityList.appendChild(row);
    }

    disclaimer.textContent = data.disclaimer;
    result.hidden = false;

    message.textContent = "Analysis complete.";
    message.className = "message";

    result.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  } catch (error) {
    showError(
      error instanceof TypeError
        ? "Could not connect to the API. Check that your backend is running."
        : error.message
    );
  } finally {
    analyzeButton.disabled = !selectedFile;
    analyzeButton.innerHTML = 'Analyze image <span>→</span>';
  }
});
