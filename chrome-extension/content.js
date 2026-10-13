// autopubli24 - Content Script for web.whatsapp.com
console.log('autopubli24 Auto-Sender Content Script activo en WhatsApp Web.');

// Helper: Wait for selector
function waitForElement(selector, timeout = 25000) {
  return new Promise((resolve) => {
    const el = document.querySelector(selector);
    if (el) return resolve(el);

    const start = Date.now();
    const interval = setInterval(() => {
      const found = document.querySelector(selector);
      if (found) {
        clearInterval(interval);
        resolve(found);
      } else if (Date.now() - start > timeout) {
        clearInterval(interval);
        resolve(null);
      }
    }, 400);
  });
}

// Helper: Check for "Use here" / "Usar aquí" dialog and auto-click it
function checkForUseHereModal() {
  const buttons = document.querySelectorAll('button, div[role="button"]');
  for (const btn of buttons) {
    const text = (btn.innerText || '').toUpperCase();
    if (text.includes('USAR AQUÍ') || text.includes('USE HERE')) {
      console.log('autopubli24: Detectado aviso "Usar aquí". Haciendo clic automático...');
      btn.click();
      return true;
    }
  }
  return false;
}

// Helper: Check for invalid number dialog
function checkForInvalidNumberModal() {
  const dialogs = document.querySelectorAll('div[role="dialog"], div[data-animate-modal-popup="true"], div.modal');
  for (const dialog of dialogs) {
    const text = dialog.innerText || '';
    if (
      text.includes('no es válido') ||
      text.includes('invalid') ||
      text.includes('no está en WhatsApp') ||
      text.includes('not on WhatsApp')
    ) {
      // Find OK button to dismiss
      const okBtn = dialog.querySelector('button, div[role="button"]');
      if (okBtn) okBtn.click();
      return true;
    }
  }
  return false;
}

// Helper: Dismiss link preview box if WhatsApp created one
function dismissLinkPreviewIfPresent() {
  const closePreviewBtn =
    document.querySelector('button[data-testid="close-link-preview"]') ||
    document.querySelector('div[data-testid="link-preview"] button') ||
    document.querySelector('div[data-testid="link-preview"] span[data-icon="x"]')?.closest('button');
  if (closePreviewBtn) {
    console.log('autopubli24: Cerrando vista previa de enlace para enviar mensaje limpio.');
    closePreviewBtn.click();
  }
}

// Find WhatsApp send button
function findSendButton() {
  return (
    document.querySelector('button[data-testid="send"]') ||
    document.querySelector('span[data-icon="send"]')?.closest('button') ||
    document.querySelector('span[data-testid="send"]')?.closest('button') ||
    document.querySelector('button[aria-label="Enviar"]') ||
    document.querySelector('button[aria-label="Send"]')
  );
}

// Find main chat message input
function findMessageInput() {
  return (
    document.querySelector('footer div[contenteditable="true"]') ||
    document.querySelector('div[contenteditable="true"][data-tab="10"]') ||
    document.querySelector('div[contenteditable="true"][role="textbox"]')
  );
}

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'CHECK_READY') {
    // Check if user is logged into WhatsApp Web
    const appEl = document.querySelector('#app') || document.querySelector('#main');
    const qrEl = document.querySelector('canvas') || document.querySelector('div[data-ref]');
    const isLogged = !!appEl && !qrEl;
    sendResponse({ ready: isLogged });
    return true;
  }

  if (request.action === 'CLICK_SEND') {
    (async () => {
      try {
        console.log('autopubli24: Intentando enviar mensaje...', request);

        // 1. Wait a moment for page to stabilize
        await new Promise((r) => setTimeout(r, 1500));
        checkForUseHereModal();

        // 2. Check for invalid number modal
        if (checkForInvalidNumberModal()) {
          console.warn('autopubli24: Número no válido en WhatsApp.');
          sendResponse({ success: false, reason: 'INVALID_NUMBER' });
          return;
        }

        // 3. Wait for send button or input
        let sendBtn = findSendButton();
        let retries = 0;

        while (!sendBtn && retries < 25) {
          checkForUseHereModal();
          if (checkForInvalidNumberModal()) {
            sendResponse({ success: false, reason: 'INVALID_NUMBER' });
            return;
          }
          await new Promise((r) => setTimeout(r, 600));
          sendBtn = findSendButton();
          retries++;
        }

        const inputEl = findMessageInput();

        // 4. Dismiss any unwanted link preview card & click send button
        dismissLinkPreviewIfPresent();
        if (sendBtn) {
          sendBtn.click();
          console.log('autopubli24: Clic en botón de enviar realizado.');
        } else if (inputEl) {
          // Fallback: Dispatch Enter key event
          inputEl.focus();
          const enterEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            which: 13,
            keyCode: 13,
            bubbles: true,
          });
          inputEl.dispatchEvent(enterEvent);
          console.log('autopubli24: Pulsación Enter despachada.');
        } else {
          sendResponse({ success: false, reason: 'SEND_BUTTON_NOT_FOUND' });
          return;
        }

        // 5. Short pause to confirm send dispatch
        await new Promise((r) => setTimeout(r, 1500));

        sendResponse({ success: true, phone: request.phone });
      } catch (err) {
        console.error('autopubli24 error:', err);
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true; // Keep message channel open for async response
  }
});
