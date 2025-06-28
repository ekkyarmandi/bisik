// Transcription component
export function clearTranscription() {
  document.getElementById("transcriptionText").value = "";
  updateButtonStates();
}

export function updateTranscription(text) {
  document.getElementById("transcriptionText").value = text;
  updateButtonStates();
}

export function copyTranscription() {
  const text = document.getElementById("transcriptionText").value;
  if (text) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        // Show brief feedback
        const button = document.getElementById("copyButton");
        const originalSvg = button.innerHTML;
        button.innerHTML = '<svg viewBox="0 0 24 24" class="w-4 h-4 fill-green-500"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
        setTimeout(() => {
          button.innerHTML = originalSvg;
        }, 1000);
      })
      .catch((err) => {
        console.error("Failed to copy text:", err);
      });
  }
}

export function clearTranscriptionManually() {
  document.getElementById("transcriptionText").value = "";
  updateButtonStates();
}

function updateButtonStates() {
  const text = document.getElementById("transcriptionText").value;
  const hasText = text.trim().length > 0;

  document.getElementById("copyButton").disabled = !hasText;
  document.getElementById("clearButton").disabled = !hasText;
}

// Make functions available globally for onclick handlers
window.copyTranscription = copyTranscription;
window.clearTranscriptionManually = clearTranscriptionManually;