// autopubli24 - Background Service Worker (Manifest V3)

chrome.runtime.onInstalled.addListener(() => {
  console.log('autopubli24 Auto-Sender instalado.');
});

// Helper: Find or create single WhatsApp Web tab, closing any duplicate tabs
async function getOrCreateWhatsAppTab() {
  const tabs = await chrome.tabs.query({ url: '*://web.whatsapp.com/*' });
  if (tabs.length > 0) {
    // Keep first tab, close any accidental duplicate tabs
    const mainTab = tabs[0];
    for (let i = 1; i < tabs.length; i++) {
      chrome.tabs.remove(tabs[i].id).catch(() => {});
    }
    return mainTab;
  }
  return await chrome.tabs.create({ url: 'https://web.whatsapp.com', active: true });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'DISPATCH_WHATSAPP_URL') {
    (async () => {
      try {
        const { targetUrl, phone } = request;
        let tab = await getOrCreateWhatsAppTab();

        // Update tab URL
        await chrome.tabs.update(tab.id, { url: targetUrl, active: true });

        // Wait for page to load
        const checkTabLoaded = () =>
          new Promise((resolve) => {
            const listener = (tabId, changeInfo) => {
              if (tabId === tab.id && changeInfo.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(listener);
                resolve(true);
              }
            };
            chrome.tabs.onUpdated.addListener(listener);
            // Timeout safety after 25s
            setTimeout(() => {
              chrome.tabs.onUpdated.removeListener(listener);
              resolve(true);
            }, 25000);
          });

        await checkTabLoaded();

        // Give WhatsApp Web 3 seconds to render the prefilled text and chat box
        await new Promise((r) => setTimeout(r, 3500));

        // Send CLICK_SEND message to content script
        chrome.tabs.sendMessage(
          tab.id,
          { action: 'CLICK_SEND', phone },
          (response) => {
            if (chrome.runtime.lastError) {
              sendResponse({
                success: false,
                error: chrome.runtime.lastError.message,
              });
            } else {
              sendResponse(response || { success: true });
            }
          }
        );
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true; // Keep channel open
  }
});
