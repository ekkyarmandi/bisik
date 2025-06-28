/**
 * Toast Notification System
 * A lightweight, self-contained toast notification system
 */

class ToastNotification {
  constructor() {
    this.toastContainer = null;
    this.init();
  }

  init() {
    // Ensure toast container exists
    this.ensureToastContainer();
  }

  ensureToastContainer() {
    this.toastContainer = document.getElementById('toastContainer');
    if (!this.toastContainer) {
      this.toastContainer = document.createElement('div');
      this.toastContainer.id = 'toastContainer';
      document.body.appendChild(this.toastContainer);
    }
  }

  show(type, title, message, duration = 5000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    // Icons for different toast types
    const icons = {
      error: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>',
      success: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>',
      info: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>'
    };

    toast.innerHTML = `
      <div class="toast-icon">${icons[type] || icons.info}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        ${message ? `<div class="toast-message">${message}</div>` : ''}
      </div>
      <button class="toast-close" onclick="this.parentElement.remove()">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
    `;

    this.toastContainer.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Auto-remove after duration
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // Convenience methods for different toast types
  error(title, message, duration) {
    this.show('error', title, message, duration);
  }

  success(title, message, duration) {
    this.show('success', title, message, duration);
  }

  info(title, message, duration) {
    this.show('info', title, message, duration);
  }
}

// Create global instance
const Toast = new ToastNotification();

// Export for global use (backward compatibility)
window.showToast = function (type, title, message, duration) {
  Toast.show(type, title, message, duration);
};

// Export the Toast instance for modern usage
window.Toast = Toast; 