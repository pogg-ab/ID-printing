// Event emitter for toast notifications
const toastListeners = new Set();

export const toast = {
  subscribe(listener) {
    toastListeners.add(listener);
    return () => toastListeners.delete(listener);
  },
  show(message, type = 'error') {
    const msgLower = String(message).toLowerCase();
    
    // Auto-detect success/warning indicators
    const isSuccess = msgLower.includes('success') || 
                      msgLower.includes('perfect') || 
                      msgLower.includes('imported successfully') || 
                      msgLower.includes('record saved') || 
                      msgLower.includes('updated') ||
                      msgLower.includes('saved') ||
                      msgLower.includes('created') ||
                      msgLower.includes('completed');
                      
    const isWarning = msgLower.includes('allow popups') || 
                      msgLower.includes('pop-up') || 
                      msgLower.includes('template required') ||
                      msgLower.includes('configure a template');
    
    const calculatedType = isSuccess ? 'success' : (isWarning ? 'warning' : type);
    
    toastListeners.forEach(l => l(message, calculatedType));
  }
};

// Event emitter for confirm dialogs
const confirmListeners = new Set();

export const confirmDialog = {
  subscribe(listener) {
    confirmListeners.add(listener);
    return () => confirmListeners.delete(listener);
  },
  show(message, resolve) {
    confirmListeners.forEach(l => l(message, resolve));
  }
};

// Global override for window.alert
window.alert = (message) => {
  if (message === undefined || message === null) return;
  
  if (typeof message === 'string' || message instanceof Error) {
    toast.show(String(message));
  } else {
    toast.show(JSON.stringify(message));
  }
};

// Global override for window.confirm (Async dialog wrapper)
window.confirm = (message) => {
  return new Promise((resolve) => {
    confirmDialog.show(message, resolve);
  });
};
