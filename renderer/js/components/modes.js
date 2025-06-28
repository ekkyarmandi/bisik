// Modes management component
import { getModes, saveModes, getActiveMode, setActiveMode as setActiveModeStorage } from '../utils/storage.js';
import { showSettingsPage, showPage } from './navigation.js';

let editingModeId = null;

export function loadModes() {
  const modes = getModes();
  const activeMode = getActiveMode();
  const modeList = document.getElementById("modeList");

  if (modes.length === 0) {
    modeList.innerHTML = '<p class="text-gray-500 text-center py-5">No modes created yet. Click "Add Mode" to create your first custom mode.</p>';
    return;
  }

  modeList.innerHTML = modes
    .map(
      (mode) => `
      <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg mb-3 bg-white min-h-16">
        <div class="flex items-center gap-3 flex-1">
          <div class="w-2 h-2 rounded-full ${activeMode && activeMode.id === mode.id ? "bg-green-500" : "bg-gray-300"} flex-shrink-0"></div>
          <div class="font-medium text-gray-800 flex-1">${mode.name}</div>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          ${
            activeMode && activeMode.id === mode.id
              ? '<span class="text-green-500 text-xs font-medium px-2 py-1 bg-green-50 rounded">ACTIVE</span>'
              : `<button class="px-3 py-1 bg-gray-100 text-gray-800 rounded text-sm font-medium transition-colors duration-200 hover:bg-gray-200" onclick="setActiveMode('${mode.id}')">Activate</button>`
          }
          <button class="px-3 py-1 bg-blue-50 text-blue-600 rounded text-sm font-medium transition-colors duration-200 hover:bg-blue-100" onclick="editMode('${mode.id}')">Edit</button>
          <button class="px-3 py-1 bg-red-50 text-red-600 rounded text-sm font-medium transition-colors duration-200 hover:bg-red-100" onclick="deleteMode('${mode.id}')">Delete</button>
        </div>
      </div>
    `
    )
    .join("");
}

export function saveMode() {
  const name = document.getElementById("modeName").value.trim();
  const prompt = document.getElementById("systemPrompt").value.trim();

  if (!name || !prompt) {
    alert("Please fill in both mode name and system prompt.");
    return;
  }

  const modes = getModes();
  const newMode = {
    id: Date.now().toString(),
    name: name,
    prompt: prompt,
    createdAt: new Date().toISOString(),
  };

  modes.push(newMode);
  saveModes(modes);

  // If this is the first mode, make it active
  if (modes.length === 1) {
    setActiveMode(newMode.id);
  }

  showSettingsPage();
}

export function deleteMode(modeId) {
  const modes = getModes();

  if (confirm("Are you sure you want to delete this mode?")) {
    const filteredModes = modes.filter((mode) => mode.id !== modeId);
    saveModes(filteredModes);

    // If deleted mode was active, clear active mode
    if (localStorage.getItem("active_mode_id") === modeId) {
      localStorage.removeItem("active_mode_id");
    }

    loadModes();
  }
}

export function editMode(modeId) {
  const modes = getModes();
  const mode = modes.find((m) => m.id === modeId);
  
  if (mode) {
    editingModeId = modeId;
    document.getElementById("editModeName").value = mode.name;
    document.getElementById("editSystemPrompt").value = mode.prompt;
    showPage("editModePage");
  }
}

export function updateMode() {
  if (!editingModeId) return;

  const name = document.getElementById("editModeName").value.trim();
  const prompt = document.getElementById("editSystemPrompt").value.trim();

  if (!name || !prompt) {
    alert("Please fill in both mode name and system prompt.");
    return;
  }

  const modes = getModes();
  const modeIndex = modes.findIndex((m) => m.id === editingModeId);

  if (modeIndex !== -1) {
    modes[modeIndex].name = name;
    modes[modeIndex].prompt = prompt;
    modes[modeIndex].updatedAt = new Date().toISOString();
    saveModes(modes);
    editingModeId = null;
    showSettingsPage();
  }
}

export function setActiveMode(modeId) {
  setActiveModeStorage(modeId);
  loadModes();
}

// Make functions available globally for onclick handlers
window.setActiveMode = setActiveMode;
window.saveMode = saveMode;
window.deleteMode = deleteMode;
window.editMode = editMode;
window.updateMode = updateMode;