import type { ExtensionMessage } from '../types/messages';

/**
 * Safely sends a message to the background script.
 * Handles extension reload gracefully.
 */
export function safeSendMessage(message: ExtensionMessage): void {
  try {
    chrome.runtime.sendMessage(message, () => {
      if (chrome.runtime.lastError) {
        // Extension was reloaded - silently ignore
      }
    });
  } catch {
    // Extension context invalidated - silently ignore
  }
}
