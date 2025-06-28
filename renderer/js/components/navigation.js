// Navigation component
import { loadSettings } from './settings.js';
import { loadModes } from './modes.js';
import { updateActiveModeIndicator } from './recording.js';

export function showPage(pageId) {
  // Hide all pages
  const allPages = document.querySelectorAll(".page");
  allPages.forEach((page) => {
    page.classList.remove("flex");
    page.classList.add("hidden");
  });

  // Remove active classes from all nav items
  document.querySelectorAll(".nav-item").forEach((nav) => {
    nav.classList.remove("bg-blue-500");
    nav.classList.add("hover:bg-gray-100");
    const svg = nav.querySelector("svg");
    if (svg) {
      svg.classList.remove("fill-white");
      svg.classList.add("fill-gray-600");
    }
  });

  // Show selected page
  const targetPage = document.getElementById(pageId);
  if (targetPage) {
    targetPage.classList.remove("hidden");
    targetPage.classList.add("flex");
  }

  // Update active nav item
  const searchKey = pageId.replace("Page", "");
  const activeNav = document.querySelector(`[data-page="${searchKey}"]`);
  if (activeNav) {
    activeNav.classList.remove("hover:bg-gray-100");
    activeNav.classList.add("bg-blue-500");
    const svg = activeNav.querySelector("svg");
    if (svg) {
      svg.classList.remove("fill-gray-600");
      svg.classList.add("fill-white");
    }
  }
}

export function showSettingsPage() {
  showPage("settingsPage");
  loadSettings();
  loadModes();
}

export function showAddModePage() {
  showPage("addModePage");
  // Clear form
  document.getElementById("modeName").value = "";
  document.getElementById("systemPrompt").value = "";
}

export function showRecordPage() {
  showPage("recordPage");
  updateActiveModeIndicator();
}

// Make functions available globally for onclick handlers
window.showPage = showPage;
window.showSettingsPage = showSettingsPage;
window.showAddModePage = showAddModePage;
window.showRecordPage = showRecordPage;