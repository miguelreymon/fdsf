import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Smartphone,
  ShieldCheck,
  Send,
  Play,
  Pause,
  Square,
  Settings,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Coins,
  RefreshCw,
  FlaskConical,
  Sparkles,
  HelpCircle,
  Eye,
  Check,
  Lock,
} from 'lucide-react';
import type { AdItem, BrevoSmsConfig, SmsCampaignItem } from '../types.ts';

interface SmsCampaignModalProps {
  selectedAds: AdItem[];
  onClose: () => void;
  onAdStatusUpdated: (adId: string, newStatus: 'contactado') => void;
}

export const SmsCampaignModal: React.FC<SmsCampaignModalProps> = ({
  selectedAds,
  onClose,
  onAdStatusUpdated,
}) => {
  // Configuration State
  const [config, setConfig] = useState<BrevoSmsConfig>({
    apiKey: '',
    senderName: 'AutoPubli',
    whatsappNumber: '+34669175153',
    whatsappGreetingText: 'Hola, quiero info de autopubli24',
    templateText: 'Hola, vi tu anuncio en {portal}. En autopubli24 subimos tu anuncio a primera posicion las 24h. Escribenos a WhatsApp: wa.me/34669175153',
    delaySeconds: 2,
  });

  const [simulationPortal, setSimulationPortal] = useState<string>('Mundosexanuncio');

  const [hasApiKey, setHasApiKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState('');
  const [inputApiKey, setInputApiKey] = useState('');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configSaveSuccess, setConfigSaveSuccess] = useState(false);

  // Balance State
  const [smsCredits, setSmsCredits] = useState<number | null>(null);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  // Test SMS State
  const [isTestOpen, setIsTestOpen] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);

  // Queue & Dispatch State
  const [queue, setQueue] = useState<SmsCampaignItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [totalSent, setTotalSent] = useState(0);
  const [totalFailed, setTotalFailed] = useState(0);

  const timerRef = useRef<any>(null);

  // Helper: Clean portal name
  const cleanPortalName = (rawPortal?: string) => {
    if (!rawPortal) return 'el portal';
    let clean = rawPortal
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .replace(/\.(com|es|net|org|co|eu|info|cat|club|online).*$/i, '')
      .trim();

    const lower = clean.toLowerCase();
    if (lower.includes('pasionvalencia')) return 'Pasion Valencia';
    if (lower.includes('mundosexanuncio')) return 'Mundosexanuncio';
    if (lower.includes('milanuncios')) return 'Milanuncios';
    if (lower.includes('pasion')) return 'Pasion';
    if (lower.includes('loquo')) return 'Loquo';
    if (lower.includes('slumi')) return 'Slumi';
    if (lower.includes('skokka')) return 'Skokka';
    return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : 'el portal';
  };

  // Helper: Render message with dynamic variables
  const formatSmsText = (tpl: string, ad?: AdItem, customPortal?: string) => {
    const rawName = (ad?.detectedName || '').trim();
    const portal = customPortal || cleanPortalName(ad?.sourceSite);
    const city = (ad?.location || '').split('(')[0].trim() || 'tu zona';
    const waClean = (config.whatsappNumber || '+34669175153').replace(/[^0-9]/g, '');
    const waLink = `wa.me/${waClean}`;

    let text = tpl;
    if (rawName && text.includes('{nombre}')) {
      text = text.replace(/{nombre}/gi, rawName);
    } else {
      text = text
        .replace(/\b(hola|buenas)\s*\{nombre\}\s*,/gi, '$1,')
        .replace(/\b(hola|buenas)\s*\{nombre\}\s*/gi, '$1 ')
        .replace(/\s*\{nombre\}\s*/gi, ' ')
        .replace(/{nombre}/gi, '');
    }

    text = text
      .replace(/{portal}/gi, portal)
      .replace(/{ciudad}/gi, city)
      .replace(/{enlace_whatsapp}/gi, waLink)
      .replace(/{whatsapp}/gi, waLink);

    return text
      .split('\n')
      .map(l => l.trim())
      .join('\n')
      .trim();
  };

  // 1. Fetch SMS config on mount
  useEffect(() => {
    fetch('/api/sms/config')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.config) {
          setConfig(data.config);
          setHasApiKey(data.config.hasKey);
          setMaskedKey(data.config.maskedKey || '');
          if (data.config.hasKey) {
            checkBalance();
          }
        }
      })
      .catch(() => {});
  }, []);

  // 2. Build Queue whenever selectedAds or templateText changes
  useEffect(() => {
    if (isRunning) return;

    const items: SmsCampaignItem[] = selectedAds.map(ad => {
      const msg = formatSmsText(config.templateText, ad);
      return {
        adId: ad.id,
        name: ad.detectedName || ad.phone,
        phone: ad.phone,
        normalizedPhone: ad.normalizedPhone || ad.phone,
        location: ad.location || 'Madrid',
        sourceSite: ad.sourceSite || 'el portal',
        messageText: msg,
        charCount: msg.length,
        status: ad.status === 'contactado' ? 'skipped' : 'pending',
      };
    });

    setQueue(items);
    setCurrentIndex(0);
    setTotalSent(0);
    setTotalFailed(0);
  }, [selectedAds, config.templateText, config.whatsappNumber]);

  // Check Brevo balance
  const checkBalance = async () => {
    setIsCheckingBalance(true);
    setBalanceError(null);
    try {
      const res = await fetch('/api/sms/balance');
      const data = await res.json();
      if (data.success) {
        setSmsCredits(data.credits ?? 0);
      } else {
        setBalanceError(data.error || 'No se pudo verificar el saldo');
      }
    } catch (e: any) {
      setBalanceError(e.message);
    } finally {
      setIsCheckingBalance(false);
    }
  };

  // Save Config
  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    try {
      const body: any = {
        senderName: config.senderName.slice(0, 11),
        whatsappNumber: config.whatsappNumber,
        whatsappGreetingText: config.whatsappGreetingText,
        templateText: config.templateText,
        delaySeconds: config.delaySeconds,
      };
      if (inputApiKey.trim()) {
        body.apiKey = inputApiKey.trim();
      }

      const res = await fetch('/api/sms/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        setHasApiKey(data.config.hasKey);
        setMaskedKey(data.config.maskedKey || '');
        setInputApiKey('');
        setConfigSaveSuccess(true);
        setTimeout(() => setConfigSaveSuccess(false), 3000);
        checkBalance();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Send single test SMS
  const handleSendTestSms = async () => {
    if (!testPhoneNumber.trim()) return;
    setIsSendingTest(true);
    setTestResult(null);
    try {
      const sampleMsg = formatSmsText(config.templateText, selectedAds[0]);
      const res = await fetch('/api/sms/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testPhone: testPhoneNumber,
          messageText: sampleMsg,
          senderName: config.senderName,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({
          success: true,
          msg: `✓ SMS enviado con éxito. Ref: ${data.reference || data.messageId}`,
        });
        checkBalance();
      } else {
        setTestResult({
          success: false,
          msg: `Error: ${data.error || 'No se pudo enviar el SMS de prueba'}`,
        });
      }
    } catch (e: any) {
      setTestResult({ success: false, msg: e.message });
    } finally {
      setIsSendingTest(false);
    }
  };

  // Dispatch Queue Item
  const dispatchItem = async (index: number) => {
    if (index >= queue.length) {
      setIsRunning(false);
      setIsPaused(false);
      return;
    }

    const item = queue[index];

    // Skip already contacted
    if (item.status === 'skipped') {
      setCurrentIndex(index + 1);
      dispatchItem(index + 1);
      return;
    }

    setQueue(prev =>
      prev.map((it, idx) => (idx === index ? { ...it, status: 'sending' } : it))
    );

    try {
      const res = await fetch('/api/sms/send-single-ad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adId: item.adId,
          customMessage: item.messageText,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setQueue(prev =>
          prev.map((it, idx) =>
            idx === index
              ? {
                  ...it,
                  status: 'sent',
                  sentAt: new Date().toLocaleTimeString(),
                  messageId: data.messageId,
                }
              : it
          )
        );
        setTotalSent(c => c + 1);
        onAdStatusUpdated(item.adId, 'contactado');

        // Deduct 1 credit locally
        setSmsCredits(prev => (prev !== null && prev > 0 ? prev - 1 : prev));
      } else {
        setQueue(prev =>
          prev.map((it, idx) =>
            idx === index ? { ...it, status: 'failed', error: data.error } : it
          )
        );
        setTotalFailed(c => c + 1);
      }
    } catch (e: any) {
      setQueue(prev =>
        prev.map((it, idx) =>
          idx === index ? { ...it, status: 'failed', error: e.message } : it
        )
      );
      setTotalFailed(c => c + 1);
    }

    const nextIdx = index + 1;
    setCurrentIndex(nextIdx);

    if (nextIdx < queue.length) {
      timerRef.current = setTimeout(() => {
        dispatchItem(nextIdx);
      }, (config.delaySeconds || 2) * 1000);
    } else {
      setIsRunning(false);
      setIsPaused(false);
      checkBalance();
    }
  };

  // Campaign Controls
  const handleStartCampaign = () => {
    if (queue.length === 0) return;
    if (!hasApiKey) {
      setIsConfigOpen(true);
      return;
    }
    setIsRunning(true);
    setIsPaused(false);
    dispatchItem(currentIndex);
  };

  const handlePauseCampaign = () => {
    setIsPaused(true);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const handleResumeCampaign = () => {
    setIsPaused(false);
    dispatchItem(currentIndex);
  };

  const handleStopCampaign = () => {
    setIsRunning(false);
    setIsPaused(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  // Clean WhatsApp number and build direct link
  const waCleanNumber = (config.whatsappNumber || '+34669175153').replace(/[^0-9]/g, '');
  const directWaLink = `wa.me/${waCleanNumber}`;
  const waLinkChars = directWaLink.length;

  // Active sample ad or simulated portal
  const activeAd = selectedAds[0];
  const activePortalName = activeAd ? cleanPortalName(activeAd.sourceSite) : simulationPortal;
  const sampleText = formatSmsText(config.templateText, activeAd || undefined, simulationPortal);

  // Exact character counting
  const charLength = sampleText.length;
  const isSingleSms = charLength <= 160;
  const charsRemaining = 160 - charLength;

  // Detect non-GSM accents that reduce limit from 160 to 70
  const hasUnicodeAccents = /[áíóúÁÍÓÚ]/.test(config.templateText);

  // Quick action: Remove accents to ensure 160 chars GSM-7
  const handleNormalizeAccents = () => {
    const cleaned = config.templateText
      .replace(/[áàäâ]/g, 'a')
      .replace(/[íìïî]/g, 'i')
      .replace(/[óòöô]/g, 'o')
      .replace(/[úùüû]/g, 'u')
      .replace(/[ÁÀÄÂ]/g, 'A')
      .replace(/[ÍÌÏÎ]/g, 'I')
      .replace(/[ÓÒÖÔ]/g, 'O')
      .replace(/[ÚÙÜÛ]/g, 'U');
    setConfig({ ...config, templateText: cleaned });
  };

  // Quick action: Replace {enlace_whatsapp} with literal direct link or append it
  const handleInsertDirectWaLink = () => {
    if (config.templateText.includes('{enlace_whatsapp}')) {
      setConfig({
        ...config,
        templateText: config.templateText.replace(/{enlace_whatsapp}/gi, directWaLink),
      });
    } else if (config.templateText.includes('{whatsapp}')) {
      setConfig({
        ...config,
        templateText: config.templateText.replace(/{whatsapp}/gi, directWaLink),
      });
    } else if (!config.templateText.includes(directWaLink)) {
      setConfig({
        ...config,
        templateText: config.templateText + ` ${directWaLink}`,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-4xl w-full border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between shrink-0 bg-neutral-50/70 dark:bg-neutral-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Campaña SMS Inbound (Brevo)
                </h3>
                <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  0% Riesgo de Baneo WhatsApp
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Envía SMS con remitente profesional y enlace directo para que las chicas te escriban a ti primero
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Balance Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs">
              <Coins className="w-3.5 h-3.5 text-amber-500" />
              <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                {smsCredits !== null ? `${smsCredits} SMS` : 'Consultar'}
              </span>
              <button
                onClick={checkBalance}
                disabled={isCheckingBalance}
                title="Actualizar saldo de créditos"
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${isCheckingBalance ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Test Tool Button */}
            <button
              onClick={() => setIsTestOpen(prev => !prev)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${
                isTestOpen
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Probar a mi Móvil</span>
            </button>

            {/* Config Button */}
            <button
              onClick={() => setIsConfigOpen(prev => !prev)}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                isConfigOpen
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900'
                  : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100'
              }`}
              title="Configurar Brevo API Key y remitente"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Ajustes</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Settings Drawer (Brevo API Key & Remitente) */}
          {isConfigOpen && (
            <div className="p-4 sm:p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-700 pb-3">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-blue-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white">
                    Configuración de Brevo (Sin DNI ni contratos)
                  </h4>
                </div>
                <a
                  href="https://app.brevo.com/settings/keys/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                >
                  <span>Obtener API Key en Brevo</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* API Key */}
                <div className="sm:col-span-1 space-y-1">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Brevo API Key (v3):
                  </label>
                  <input
                    type="password"
                    value={inputApiKey}
                    onChange={e => setInputApiKey(e.target.value)}
                    placeholder={hasApiKey ? maskedKey : 'xkeysib-...'}
                    className="w-full p-2.5 text-xs rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 font-mono text-neutral-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-neutral-400 block">
                    {hasApiKey ? '✓ Clave guardada correctamente' : 'Pega tu clave generada en Brevo'}
                  </span>
                </div>

                {/* Sender Name */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Nombre del Remitente (Sender ID):
                  </label>
                  <input
                    type="text"
                    maxLength={11}
                    value={config.senderName}
                    onChange={e => setConfig({ ...config, senderName: e.target.value.slice(0, 11) })}
                    placeholder="AutoPubli"
                    className="w-full p-2.5 text-xs rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-semibold"
                  />
                  <span className="text-[10px] text-neutral-400 block">
                    Máx. 11 letras (ej: <code>AutoPubli</code> o <code>INFO</code>).
                  </span>
                </div>

                {/* Target WhatsApp Phone */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Tu WhatsApp de Destino (Virtual):
                  </label>
                  <input
                    type="text"
                    value={config.whatsappNumber}
                    onChange={e => setConfig({ ...config, whatsappNumber: e.target.value })}
                    placeholder="+34600000000"
                    className="w-full p-2.5 text-xs rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 font-mono text-neutral-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-neutral-400 block">
                    El número al que ellas harán clic para escribirte.
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="text-xs">
                  {configSaveSuccess && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4" />
                      Configuración guardada correctamente
                    </span>
                  )}
                  {balanceError && (
                    <span className="text-rose-500 text-xs">
                      Aviso: {balanceError}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={isSavingConfig}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSavingConfig ? 'Guardando...' : 'Guardar Ajustes'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick Test Tool Box */}
          {isTestOpen && (
            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
                  <FlaskConical className="w-4 h-4 text-blue-600" />
                  Envía 1 SMS de prueba a tu móvil para verificar cómo llega
                </span>
                <span className="text-[11px] text-blue-700 dark:text-blue-300">
                  Coste: 1 crédito Brevo (~0,04€)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="tel"
                  value={testPhoneNumber}
                  onChange={e => setTestPhoneNumber(e.target.value)}
                  placeholder="Tu número móvil (ej: 600112233)"
                  className="p-2.5 text-xs rounded-xl border border-blue-300 dark:border-blue-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white flex-1 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleSendTestSms}
                  disabled={isSendingTest || !testPhoneNumber.trim()}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shrink-0 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSendingTest ? 'Enviando SMS...' : 'Enviar Prueba Ahora'}</span>
                </button>
              </div>

              {testResult && (
                <div
                  className={`p-2.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
                    testResult.success
                      ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-300'
                      : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border border-rose-300'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  )}
                  <span>{testResult.msg}</span>
                </div>
              )}
            </div>
          )}

          {/* SMS TEMPLATE EDITOR & LIVE PREVIEW */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Left: Template Editor */}
            <div className="md:col-span-7 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-neutral-900 dark:text-white uppercase tracking-wider text-[11px]">
                  Plantilla de Mensaje SMS
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-xs ${
                      isSingleSms
                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700'
                        : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-700'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                    {charLength} / 160 caracteres ({isSingleSms ? '1 SMS = 0,043€' : '2 SMS = 0,086€'})
                  </span>
                </div>
              </div>

              {/* Tag Insertion & Quick Actions */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 mr-1">Insertar:</span>
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, templateText: config.templateText + ' {portal}' })}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors shadow-2xs"
                  title="Inserta el nombre limpio del portal donde se publicó el anuncio"
                >
                  + &#123;portal&#125;
                </button>
                <button
                  type="button"
                  onClick={handleInsertDirectWaLink}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors shadow-2xs flex items-center gap-1"
                  title="Inserta directamente los caracteres reales del enlace de WhatsApp"
                >
                  <span>+ Enlace directo WhatsApp</span>
                  <span className="text-[10px] bg-blue-200/80 dark:bg-blue-900/80 text-blue-900 dark:text-blue-100 px-1 py-0.2 rounded font-mono">
                    {waLinkChars} car.
                  </span>
                </button>
                {hasUnicodeAccents && (
                  <button
                    type="button"
                    onClick={handleNormalizeAccents}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-100 transition-colors flex items-center gap-1"
                    title="Elimina tildes (á, í, ó, ú) para asegurar el estándar GSM-7 de 160 caracteres"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Limpiar tildes (GSM-7)</span>
                  </button>
                )}
              </div>

              <textarea
                rows={4}
                value={config.templateText}
                onChange={e => setConfig({ ...config, templateText: e.target.value })}
                placeholder="Escribe el texto del SMS..."
                className="w-full p-3 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
              />

              {/* Exact Character Breakdown Card */}
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    Desglose Exacto de Caracteres:
                  </span>
                  <span className={`text-[11px] font-bold ${isSingleSms ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {isSingleSms ? `✓ Te sobran ${charsRemaining} caracteres` : `⚠️ Superas por ${Math.abs(charsRemaining)} caracteres`}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                    <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block">Enlace WhatsApp:</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400 block text-sm">
                      {waLinkChars} car.
                    </span>
                    <span className="text-[9px] text-neutral-400 truncate block font-mono">
                      {directWaLink}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                    <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block">Portal ({activePortalName}):</span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 block text-sm">
                      {activePortalName.length} car.
                    </span>
                    <span className="text-[9px] text-neutral-400 block">
                      según origen
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                    <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block">Texto Base Fijo:</span>
                    <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200 block text-sm">
                      {Math.max(0, charLength - activePortalName.length)} car.
                    </span>
                    <span className="text-[9px] text-neutral-400 block">
                      incluye enlace
                    </span>
                  </div>

                  <div className={`p-2 rounded-lg border ${
                    isSingleSms
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                  }`}>
                    <span className="text-[10px] font-semibold opacity-75 block">Total Mensaje:</span>
                    <span className="font-mono font-bold block text-sm">
                      {charLength} / 160
                    </span>
                    <span className="text-[9px] font-semibold block">
                      {isSingleSms ? '✓ 1 Solo Mensaje' : '⚠️ 2 Mensajes'}
                    </span>
                  </div>
                </div>

                {/* Portal Simulator Selector */}
                <div className="pt-1.5 border-t border-neutral-200 dark:border-neutral-700/60 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400">
                    Simular Portal:
                  </span>
                  {[
                    { name: 'Mundosexanuncio', chars: 15 },
                    { name: 'Milanuncios', chars: 11 },
                    { name: 'Pasion', chars: 6 },
                    { name: 'Skokka', chars: 6 },
                  ].map(p => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => setSimulationPortal(p.name)}
                      className={`px-2 py-0.5 text-[10px] rounded-md font-medium transition-all ${
                        simulationPortal === p.name
                          ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                          : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300'
                      }`}
                    >
                      {p.name} ({p.chars} car.)
                    </button>
                  ))}
                </div>
              </div>

              {/* Warning for Accents or Length */}
              {hasUnicodeAccents && (
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-200 flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Atención tildes:</strong> Se han detectado vocales con tilde (ej: <code>í, ó, ú</code>). En redes móviles estándar, las tildes fuerzan la codificación Unicode (UCS-2) reduciendo el límite a solo 70 caracteres.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleNormalizeAccents}
                    className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold rounded-lg shrink-0"
                  >
                    Quitar tildes
                  </button>
                </div>
              )}

              {!isSingleSms && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-[11px] text-rose-800 dark:text-rose-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>
                    El mensaje supera los 160 caracteres ({charLength} car.). Para pagar solo <strong>1 crédito (0,043€)</strong> por mensaje, te recomendamos acortarlo en {Math.abs(charsRemaining)} caracteres.
                  </span>
                </div>
              )}
            </div>

            {/* Right: Live Smartphone SMS Preview */}
            <div className="md:col-span-5 space-y-2">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                Vista Previa en el Móvil del Destinatario:
              </span>

              <div className="bg-neutral-100 dark:bg-neutral-950 p-4 rounded-2xl border border-neutral-300 dark:border-neutral-800 shadow-inner space-y-3">
                {/* Simulated SMS Header */}
                <div className="text-center border-b border-neutral-200 dark:border-neutral-800 pb-2">
                  <span className="text-[10px] text-neutral-400 block uppercase">Mensaje de Texto (SMS)</span>
                  <span className="text-xs font-bold text-neutral-900 dark:text-white">
                    {config.senderName || 'AutoPubli'}
                  </span>
                </div>

                {/* Simulated SMS Bubble */}
                <div className="bg-blue-600 text-white p-3 rounded-2xl rounded-tl-xs text-xs shadow-sm leading-relaxed whitespace-pre-wrap font-sans">
                  {sampleText}
                </div>

                {/* How the link works */}
                <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 space-y-1">
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block uppercase flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Enlace Directo Verificado ({waLinkChars} caracteres):
                  </span>
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block leading-relaxed">
                    El enlace <code className="text-blue-600 dark:text-blue-400 font-bold">{directWaLink}</code> está directamente escrito en el texto. En Android e iOS se convierte automáticamente en enlace clickable al recibirlo.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* PROGRESS & DISPATCH BAR */}
          <div className="p-4 sm:p-5 rounded-2xl bg-neutral-950 text-white space-y-4 shadow-xl border border-neutral-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs text-neutral-400 block">Progreso de Envío SMS</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-mono text-blue-400">
                    {totalSent} / {queue.length}
                  </span>
                  <span className="text-xs text-neutral-400">
                    contactos ({Math.round(queue.length > 0 ? (totalSent / queue.length) * 100 : 0)}%)
                  </span>
                  {totalFailed > 0 && (
                    <span className="text-xs text-rose-400 font-bold ml-2">
                      ({totalFailed} fallidos)
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {!isRunning ? (
                  <button
                    onClick={handleStartCampaign}
                    disabled={queue.length === 0}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Iniciar Envío de SMS</span>
                  </button>
                ) : (
                  <>
                    {!isPaused ? (
                      <button
                        onClick={handlePauseCampaign}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                      >
                        <Pause className="w-3.5 h-3.5 fill-white" />
                        <span>Pausar</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleResumeCampaign}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Reanudar</span>
                      </button>
                    )}

                    <button
                      onClick={handleStopCampaign}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <Square className="w-3.5 h-3.5 fill-white" />
                      <span>Detener</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-500 h-2 transition-all duration-300"
                style={{
                  width: `${queue.length > 0 ? (totalSent / queue.length) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          {/* QUEUE LIST */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
              <span className="font-semibold uppercase tracking-wider text-[11px]">
                Lista de Contactos Seleccionados ({queue.length})
              </span>
              <span>Pausa entre envíos: {config.delaySeconds} seg</span>
            </div>

            <div className="max-h-60 overflow-y-auto rounded-xl border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800 bg-white dark:bg-neutral-900">
              {queue.map((item, idx) => (
                <div
                  key={item.adId}
                  className={`p-3 text-xs flex items-center justify-between transition-colors ${
                    item.status === 'sending'
                      ? 'bg-blue-50/80 dark:bg-blue-950/40 font-semibold'
                      : item.status === 'sent'
                      ? 'bg-emerald-50/40 dark:bg-emerald-950/20 text-neutral-700 dark:text-neutral-300'
                      : item.status === 'failed'
                      ? 'bg-rose-50/60 dark:bg-rose-950/30'
                      : item.status === 'skipped'
                      ? 'opacity-40 line-through'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-neutral-400 text-[11px] w-6">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="font-semibold text-neutral-900 dark:text-white flex items-center gap-1.5">
                        <span>{item.name}</span>
                        <span className="text-[10px] text-neutral-400 font-normal">
                          ({item.location})
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-neutral-500">
                        {item.phone}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {item.status === 'pending' && (
                      <span className="text-[10px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 px-2 py-0.5 rounded-full">
                        En cola
                      </span>
                    )}
                    {item.status === 'sending' && (
                      <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1">
                        <Send className="w-3 h-3" />
                        Enviando...
                      </span>
                    )}
                    {item.status === 'sent' && (
                      <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Enviado ({item.sentAt})
                      </span>
                    )}
                    {item.status === 'failed' && (
                      <span className="text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-full flex items-center gap-1" title={item.error}>
                        <AlertCircle className="w-3 h-3" />
                        Error
                      </span>
                    )}
                    {item.status === 'skipped' && (
                      <span className="text-[10px] text-neutral-400">
                        Ya contactado
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <Coins className="w-4 h-4 text-amber-500" />
            <span>
              Tarifa Brevo: <strong>0,043€</strong> por SMS a España (+34)
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-semibold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
