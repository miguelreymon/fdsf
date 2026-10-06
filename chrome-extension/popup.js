// autopubli24 - Extension Popup Controller

let queue = [];
let currentIndex = 0;
let isRunning = false;
let timerId = null;
let templates = [];
let rotationMode = 'round_robin';

// DOM Elements
const serverUrlInput = document.getElementById('serverUrl');
const btnSync = document.getElementById('btnSync');
const btnStart = document.getElementById('btnStart');
const btnStop = document.getElementById('btnStop');
const delaySelect = document.getElementById('delaySelect');
const jitterSelect = document.getElementById('jitterSelect');
const syncScopeSelect = document.getElementById('syncScopeSelect');
const statusBadge = document.getElementById('statusBadge');
const counterText = document.getElementById('counterText');
const progressFill = document.getElementById('progressFill');
const statusLog = document.getElementById('statusLog');
const contactList = document.getElementById('contactList');

// Initialize saved state
chrome.storage.local.get(['serverUrl', 'delaySeconds', 'jitter', 'syncScope'], (res) => {
  if (res.serverUrl) serverUrlInput.value = res.serverUrl;
  if (res.delaySeconds) delaySelect.value = res.delaySeconds;
  if (res.jitter) jitterSelect.value = res.jitter;
  if (res.syncScope && syncScopeSelect) syncScopeSelect.value = res.syncScope;
});

// Helper: Format message text with dynamic tags (cleanly omitting empty name and cleaning portal link)
function formatMessage(tplText, name, city, portal) {
  let text = tplText;
  const rawName = (name || '').trim();
  const cleanCity = (city || '').split('(')[0].trim() || 'tu zona';
  
  // Clean portal name to plain text so WhatsApp doesn't create links
  let cleanPortal = (portal || 'el portal')
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\.(com|es|net|org|co|eu|info|cat|club|online).*$/i, '')
    .trim();

  const lowerPortal = cleanPortal.toLowerCase();
  if (lowerPortal.includes('mundosexanuncio')) cleanPortal = 'Mundosexanuncio';
  else if (lowerPortal.includes('milanuncios')) cleanPortal = 'Milanuncios';
  else if (lowerPortal.includes('pasion')) cleanPortal = 'Pasión';
  else if (lowerPortal.includes('loquo')) cleanPortal = 'Loquo';
  else if (lowerPortal.includes('slumi')) cleanPortal = 'Slumi';
  else if (cleanPortal && cleanPortal !== 'el portal') {
    cleanPortal = cleanPortal.charAt(0).toUpperCase() + cleanPortal.slice(1);
  }

  if (rawName) {
    text = text.replace(/{nombre}/gi, rawName);
  } else {
    text = text
      .replace(/\b(hola|buenas)\s*\{nombre\}\s*,/gi, '$1,')
      .replace(/\b(hola|buenas)\s*\{nombre\}\s*/gi, '$1 ')
      .replace(/\s*\{nombre\}\s*/gi, ' ')
      .replace(/{nombre}/gi, '');
  }

  text = text
    .replace(/{ciudad}/gi, cleanCity)
    .replace(/{portal}/gi, cleanPortal);

  return text
    .split('\n')
    .map(l => l.trim())
    .join('\n')
    .trim();
}

// Render queue list in popup
function renderList() {
  if (queue.length === 0) {
    contactList.innerHTML = '<div style="padding: 10px; text-align: center; color: #64748b; font-size: 11px;">No hay contactos pendientes</div>';
    counterText.textContent = '0 / 0';
    progressFill.style.width = '0%';
    btnStart.disabled = true;
    return;
  }

  const sentCount = queue.filter(q => q.status === 'sent').length;
  counterText.textContent = `${sentCount} / ${queue.length}`;
  const pct = Math.round((sentCount / queue.length) * 100);
  progressFill.style.width = `${pct}%`;

  let html = '';
  queue.forEach((item, idx) => {
    let icon = '⏳';
    let cls = '';
    if (item.status === 'sent') { icon = '✓'; cls = 'sent'; }
    if (item.status === 'sending') { icon = '▶'; cls = 'sending'; }
    if (item.status === 'failed') { icon = '✕'; cls = 'failed'; }

    html += `
      <div class="contact-row ${cls}">
        <div>
          <strong>${idx + 1}. ${item.displayName}</strong>
          <span style="color: #64748b; margin-left: 4px;">(${item.location})</span>
        </div>
        <div style="font-family: monospace;">${item.phone} ${icon}</div>
      </div>
    `;
  });
  contactList.innerHTML = html;
  btnStart.disabled = queue.length === 0 || isRunning;
}

// 1. Sync contacts and templates from autopubli24 web panel
btnSync.addEventListener('click', async () => {
  const host = serverUrlInput.value.trim().replace(/\/$/, '');
  chrome.storage.local.set({ serverUrl: host });

  statusLog.textContent = 'Sincronizando con panel autopubli24...';
  btnSync.disabled = true;

  try {
    // Fetch WhatsApp templates & config
    const cfgRes = await fetch(`${host}/api/whatsapp/config`);
    const cfgData = await cfgRes.json();
    if (cfgData.success && cfgData.config) {
      templates = cfgData.config.templates || [];
      rotationMode = cfgData.config.rotationMode || 'round_robin';
    }

    const scope = syncScopeSelect?.value || 'selection';
    chrome.storage.local.set({ syncScope: scope });

    let pendingAds = [];

    if (scope === 'selection') {
      // 1. First fetch active selection from web panel
      const selRes = await fetch(`${host}/api/whatsapp/active-selection`);
      const selData = await selRes.json();
      if (selData.success && Array.isArray(selData.ads) && selData.ads.length > 0) {
        pendingAds = selData.ads;
        statusLog.textContent = `✓ Sincronizados ${pendingAds.length} contactos de tu selección en la web.`;
      } else {
        // Fallback: if no active selection, fetch all uncontacted
        const dirRes = await fetch(`${host}/api/directory`);
        const dirData = await dirRes.json();
        pendingAds = (dirData.ads || []).filter(a => a.status === 'nuevo' && a.phone);
        statusLog.textContent = `(Sin selección manual) Sincronizados ${pendingAds.length} contactos nuevos.`;
      }
    } else {
      // All uncontacted
      const dirRes = await fetch(`${host}/api/directory`);
      const dirData = await dirRes.json();
      pendingAds = (dirData.ads || []).filter(a => a.status === 'nuevo' && a.phone);
      statusLog.textContent = `✓ Sincronizados ${pendingAds.length} contactos nuevos sin contactar.`;
    }

    queue = pendingAds.map((ad, i) => {
      let chosenTpl = templates[0];
      if (templates.length > 0) {
        if (rotationMode === 'round_robin') {
          chosenTpl = templates[i % templates.length];
        } else {
          chosenTpl = templates[Math.floor(Math.random() * templates.length)];
        }
      }

      const msgText = formatMessage(
        chosenTpl?.text || 'Hola {nombre} vi tu anuncio en {portal}',
        ad.detectedName,
        ad.location,
        ad.sourceSite
      );

      const cleanPhone = (ad.normalizedPhone || ad.phone).replace(/[^0-9]/g, '');
      const encoded = encodeURIComponent(msgText);
      const whatsappUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`;

      return {
        id: ad.id,
        displayName: ad.detectedName || ad.phone,
        phone: cleanPhone,
        location: ad.location || 'Madrid',
        sourceSite: ad.sourceSite || 'portal',
        messageText: msgText,
        whatsappUrl,
        status: 'pending',
      };
    });

    statusLog.textContent = `✓ Sincronizados ${queue.length} contactos pendientes con rotación.`;
    renderList();
  } catch (err) {
    statusLog.textContent = `Error de conexión: ${err.message}`;
  } finally {
    btnSync.disabled = false;
  }
});

// 2. Dispatch items automatically
async function runNextItem() {
  if (!isRunning) return;

  const nextIdx = queue.findIndex(q => q.status === 'pending');
  if (nextIdx === -1) {
    isRunning = false;
    statusBadge.textContent = 'Completado';
    statusLog.textContent = '🎉 ¡Todos los contactos han sido enviados!';
    btnStart.disabled = false;
    btnStop.disabled = true;
    return;
  }

  currentIndex = nextIdx;
  const item = queue[currentIndex];
  item.status = 'sending';
  renderList();

  statusBadge.textContent = 'Enviando';
  statusLog.textContent = `Enviando a ${item.displayName} (${item.phone})...`;

  // Request background script to dispatch WhatsApp Web message
  chrome.runtime.sendMessage(
    {
      action: 'DISPATCH_WHATSAPP_URL',
      targetUrl: item.whatsappUrl,
      phone: item.phone,
    },
    async (response) => {
      if (response && response.success) {
        item.status = 'sent';
        statusLog.textContent = `✓ Mensaje enviado a ${item.phone}`;

        // Mark as contacted in autopubli24 web panel
        const host = serverUrlInput.value.trim().replace(/\/$/, '');
        fetch(`${host}/api/whatsapp/mark-contacted`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adId: item.id }),
        }).catch(() => {});
      } else {
        item.status = 'failed';
        statusLog.textContent = `Aviso en ${item.phone}: ${response?.reason || 'Error'}`;
      }

      renderList();

      if (!isRunning) return;

      // Calculate safe delay with jitter
      let delay = parseInt(delaySelect.value, 10) || 90;
      if (jitterSelect.value === 'yes') {
        const jitter = Math.floor(Math.random() * 31) - 15; // ±15s
        delay = Math.max(30, delay + jitter);
      }

      // Start countdown
      let remaining = delay;
      statusBadge.textContent = `Espera ${remaining}s`;
      statusLog.textContent = `Pausa anti-bloqueo: próximo envío en ${remaining} seg...`;

      timerId = setInterval(() => {
        if (!isRunning) {
          clearInterval(timerId);
          return;
        }
        remaining--;
        if (remaining <= 0) {
          clearInterval(timerId);
          runNextItem();
        } else {
          statusBadge.textContent = `Espera ${remaining}s`;
          statusLog.textContent = `Pausa anti-bloqueo: próximo envío en ${remaining} seg...`;
        }
      }, 1000);
    }
  );
}

// Start Campaign Button
btnStart.addEventListener('click', () => {
  if (queue.length === 0) return;
  isRunning = true;
  btnStart.disabled = true;
  btnStop.disabled = false;
  statusBadge.textContent = 'Enviando...';
  runNextItem();
});

// Stop Campaign Button
btnStop.addEventListener('click', () => {
  isRunning = false;
  if (timerId) clearInterval(timerId);
  statusBadge.textContent = 'Detenido';
  statusLog.textContent = 'Envío automático detenido.';
  btnStart.disabled = false;
  btnStop.disabled = true;
  if (queue[currentIndex] && queue[currentIndex].status === 'sending') {
    queue[currentIndex].status = 'pending';
  }
  renderList();
});
