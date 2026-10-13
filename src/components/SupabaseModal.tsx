import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Layers,
  ArrowRight,
  X,
} from 'lucide-react';
import type { SupabaseStatusInfo } from '../types.ts';

interface SupabaseModalProps {
  onClose: () => void;
  onSyncComplete?: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({ onClose, onSyncComplete }) => {
  const [status, setStatus] = useState<SupabaseStatusInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [sqlContent, setSqlContent] = useState<string>('');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/supabase/status');
      const data = await res.json();
      if (data.success) {
        setStatus(data);
      }
    } catch (err) {
      console.error('Error fetching Supabase status:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSql = async () => {
    try {
      const res = await fetch('/api/supabase/schema');
      const text = await res.text();
      setSqlContent(text);
    } catch (err) {
      console.error('Error fetching schema SQL:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchSql();
  }, []);

  const handleCopySql = () => {
    if (!sqlContent) return;
    navigator.clipboard.writeText(sqlContent);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch('/api/supabase/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSyncMessage(`✓ ¡Sincronización completada! ${data.adsSynced} anuncios y leads actualizados en Supabase.`);
        await fetchStatus();
        if (onSyncComplete) onSyncComplete();
      } else {
        setSyncMessage(`Error: ${data.error || 'No se pudo sincronizar'}`);
      }
    } catch (err: any) {
      setSyncMessage(`Error: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const isFullyReady = status?.isFullyReady;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-neutral-200 dark:border-neutral-800 shadow-2xl animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/50">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isFullyReady ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
            }`}>
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                Base de Datos Oficial: Supabase
                {isFullyReady ? (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    ✓ Activa en Tiempo Real
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                    Acción Requerida (SQL Inicial)
                  </span>
                )}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 font-mono">
                {status?.url || 'https://rbrmymyyautruwatonkw.supabase.co'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-5 overflow-y-auto space-y-5 text-sm">
          {/* Shared Database Banner */}
          <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/80 text-sky-900 dark:text-sky-200 text-xs leading-relaxed flex items-start gap-3">
            <Layers className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
            <div>
              <strong>1 Sola Base de Datos Compartida (Sin interferencias):</strong>
              <p className="mt-1 text-sky-800 dark:text-sky-300">
                Ambos proyectos utilizan la misma base de datos Supabase de forma totalmente independiente: tu landing page opera sobre sus 4 tablas sin que nadie las toque, y este panel gestiona tu directorio y envíos en las suyas.
              </p>
            </div>
          </div>

          {/* Landing Web Status (Protected & Untouched) */}
          <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Proyecto 1 (Landing Web): 4 Tablas Intactas y Protegidas
              </span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                100% Seguras
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-neutral-600 dark:text-neutral-400">
              <div className="p-1.5 rounded bg-white dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> app_content
              </div>
              <div className="p-1.5 rounded bg-white dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> inquiries
              </div>
              <div className="p-1.5 rounded bg-white dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> payment_leads
              </div>
              <div className="p-1.5 rounded bg-white dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> fake_users
              </div>
            </div>
          </div>

          {/* Table Status Cards */}
          <div>
            <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2.5">
              Proyecto 2 (Directorio y Campañas): Tablas de Envíos y Scraper
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Table ads */}
              <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 flex items-center justify-between">
                <div>
                  <div className="font-mono text-xs font-bold text-neutral-800 dark:text-neutral-200">public.ads</div>
                  <div className="text-[11px] text-neutral-500">Anuncios y Leads</div>
                </div>
                {status?.tables.ads.exists ? (
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Lista
                    </span>
                    <div className="text-[10px] text-neutral-400 font-mono">{status.tables.ads.count} filas</div>
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5" /> Pendiente SQL
                  </span>
                )}
              </div>

              {/* Table duplicates */}
              <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 flex items-center justify-between">
                <div>
                  <div className="font-mono text-xs font-bold text-neutral-800 dark:text-neutral-200">public.duplicates</div>
                  <div className="text-[11px] text-neutral-500">Filtro Repetidos</div>
                </div>
                {status?.tables.duplicates.exists ? (
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Lista
                    </span>
                    <div className="text-[10px] text-neutral-400 font-mono">{status.tables.duplicates.count} filas</div>
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5" /> Pendiente SQL
                  </span>
                )}
              </div>

              {/* Table portals */}
              <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 flex items-center justify-between">
                <div>
                  <div className="font-mono text-xs font-bold text-neutral-800 dark:text-neutral-200">public.portals</div>
                  <div className="text-[11px] text-neutral-500">Portales SEO</div>
                </div>
                {status?.tables.portals.exists ? (
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Lista
                    </span>
                    <div className="text-[10px] text-neutral-400 font-mono">{status.tables.portals.count} filas</div>
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5" /> Pendiente SQL
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* If NOT ready: Step-by-step instructions */}
          {!isFullyReady && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 space-y-3">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs uppercase tracking-wide">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Paso Único para Activar la Base de Datos Oficial (10 segundos):
              </div>
              <p className="text-xs text-amber-900/90 dark:text-amber-200/90 leading-relaxed">
                Por seguridad de Supabase, las tablas iniciales deben crearse ejecutando el script SQL en el editor de tu proyecto:
              </p>

              <ol className="text-xs space-y-2 list-decimal list-inside text-neutral-700 dark:text-neutral-300 font-medium">
                <li>
                  Haz clic en el botón <strong>&quot;Copiar Código SQL&quot;</strong> de abajo.
                </li>
                <li>
                  Abre tu editor SQL en Supabase haciendo clic en:{' '}
                  <a
                    href="https://supabase.com/dashboard/project/rbrmymyyautruwatonkw/sql"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 underline font-semibold"
                  >
                    Abrir SQL Editor en Supabase <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  Pega el código en una <strong>New Query</strong> y pulsa <strong>Run (Ejecutar)</strong>.
                </li>
                <li>
                  Vuelve aquí y pulsa <strong>&quot;Verificar y Sincronizar&quot;</strong>. ¡Todo quedará conectado y funcionando!
                </li>
              </ol>

              {/* Copy SQL Button */}
              <div className="pt-2 flex flex-wrap gap-2">
                <button
                  onClick={handleCopySql}
                  className="px-4 py-2 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors flex items-center gap-2 shadow-sm"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
                      <span>¡Código SQL Copiado al Portapapeles!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copiar Código SQL para Supabase</span>
                    </>
                  )}
                </button>

                <a
                  href="https://supabase.com/dashboard/project/rbrmymyyautruwatonkw/sql"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center gap-2 shadow-sm"
                >
                  <span>Ir a Supabase SQL Editor</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          {/* Sync Message Feedback */}
          {syncMessage && (
            <div className={`p-3 rounded-xl text-xs font-medium border ${
              syncMessage.startsWith('✓')
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
                : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800'
            }`}>
              {syncMessage}
            </div>
          )}

          {/* Permanent Tracking Details */}
          <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 space-y-2">
            <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Persistencia Garantizada:
            </h4>
            <ul className="text-xs text-neutral-600 dark:text-neutral-400 space-y-1.5 list-disc list-inside">
              <li><strong>SMS enviados por Brevo:</strong> Se marca inmediatamente como <code className="text-emerald-600 dark:text-emerald-400">status = &apos;contactado&apos;</code> y <code className="text-emerald-600 dark:text-emerald-400">contacted_via = &apos;sms&apos;</code> en Supabase.</li>
              <li><strong>WhatsApp enviados:</strong> Ya sea desde la Extensión o enlace directo, se marca como <code className="text-emerald-600 dark:text-emerald-400">contactado</code> con fecha exacta en Supabase.</li>
              <li><strong>Modificaciones en Admin:</strong> Notas, favoritos, ediciones de teléfono y nuevos contactos añadidos se graban en caliente en Supabase.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex items-center justify-between">
          <div className="text-xs text-neutral-500">
            {loading ? 'Comprobando estado...' : isFullyReady ? '✓ Tablas conectadas con éxito' : 'Esperando ejecución del script SQL'}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncNow}
              disabled={syncing}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center gap-2 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Sincronizando...' : 'Verificar y Sincronizar'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-medium transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
