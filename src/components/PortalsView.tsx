import React, { useState, useEffect } from 'react';
import {
  Globe,
  Search,
  ExternalLink,
  Plus,
  Trash2,
  RefreshCw,
  Loader2,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Layers,
  Check,
} from 'lucide-react';
import type { PortalItem } from '../types.ts';

interface PortalsViewProps {
  onSelectPortalForScraping: (portalUrl: string) => void;
}

export const PortalsView: React.FC<PortalsViewProps> = ({
  onSelectPortalForScraping,
}) => {
  const [portals, setPortals] = useState<PortalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Add / Search input
  const [inputQuery, setInputQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ name: string; domain: string; url: string; logoUrl: string }[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchPortals = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/portals');
      const data = await res.json();
      if (data.success && data.portals) {
        setPortals(data.portals);
      }
    } catch {
      // fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPortals();
  }, []);

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = inputQuery.trim();
    if (!query) return;

    setIsAnalyzing(true);
    setMessage(null);
    setSearchResults([]);

    try {
      // Check if user entered a domain (contains dot like "slumi.com" or starts with http)
      const isDomain = query.includes('.') && !query.includes(' ');

      const res = await fetch('/api/portals/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isDomain ? { domainOrUrl: query } : { searchKeyword: query }
        ),
      });

      const data = await res.json();
      if (data.success) {
        if (data.portal) {
          // Direct domain analyzed and registered
          setPortals(data.portals || []);
          setMessage({
            type: 'success',
            text: `¡Portal "${data.portal.name}" registrado correctamente con su logo oficial!`,
          });
          setInputQuery('');
        } else if (data.results && data.results.length > 0) {
          // Keyword search returned candidate portals
          setSearchResults(data.results);
          setMessage({
            type: 'success',
            text: `Se detectaron ${data.results.length} portales posicionados en las búsquedas. Pulsa para registrarlos:`,
          });
        } else {
          setMessage({
            type: 'error',
            text: 'No se detectaron portales nuevos para esa búsqueda. Intenta con un dominio directo (ej: slumi.com).',
          });
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al analizar el portal.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error de conexión.' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRegisterCandidate = async (candidate: { name: string; domain: string; url: string; logoUrl: string }) => {
    try {
      const res = await fetch('/api/portals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: candidate.name,
          domain: candidate.domain,
          url: candidate.url,
          logoUrl: candidate.logoUrl,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPortals(data.portals);
        setSearchResults(prev => prev.filter(c => c.domain !== candidate.domain));
        setMessage({
          type: 'success',
          text: `Portal "${candidate.name}" añadido al registro con su logo.`,
        });
      }
    } catch {
      // ignore
    }
  };

  const handleDeletePortal = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar el portal "${name}" de la lista registrada?`)) return;
    try {
      const res = await fetch(`/api/portals/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setPortals(data.portals);
      }
    } catch {
      // ignore
    }
  };

  const handleResetToTopPortals = async () => {
    if (!confirm('¿Restablecer la lista a los 10 portales principales con mayor tráfico y SEO en España?')) return;
    try {
      const res = await fetch('/api/portals/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setPortals(data.portals);
        setMessage({ type: 'success', text: 'Lista restablecida con el Top 10 portales SEO de España.' });
      }
    } catch {
      // ignore
    }
  };

  const filteredPortals = portals.filter(p => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return p.name.toLowerCase().includes(term) || p.domain.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6">
      {/* Top Banner / Analysis Form */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <Globe className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                Portales Más Importantes por SEO en Google
              </h2>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-2xl leading-relaxed">
              Analiza e identifica los portales con mayor autoridad de búsqueda orgánica en España. El sistema registra <strong>exclusivamente el Nombre y la Imagen / Logotipo</strong> de cada página para facilitar su seguimiento.
            </p>
          </div>

          <button
            onClick={handleResetToTopPortals}
            className="text-xs px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-1.5 self-start sm:self-auto transition-colors"
            title="Restablecer al Top 10 oficial de España"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Restablecer Top 10 SEO</span>
          </button>
        </div>

        {/* Search & Analyze Input */}
        <form onSubmit={handleAnalyze} className="pt-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={inputQuery}
                onChange={e => setInputQuery(e.target.value)}
                placeholder="Escribe un dominio (ej: slumi.com) o una búsqueda (ej: contactos madrid, escorts valencia)..."
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              type="submit"
              disabled={isAnalyzing || !inputQuery.trim()}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-xs"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analizando en Google...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Analizar y Obtener Logo</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Message Toast */}
        {message && (
          <div
            className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
            }`}
          >
            <span>{message.text}</span>
          </div>
        )}

        {/* Search Results (Candidate Portals found in Google) */}
        {searchResults.length > 0 && (
          <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-3">
            <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
              Resultados detectados en la búsqueda orgánica:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {searchResults.map(c => (
                <div
                  key={c.domain}
                  className="p-3 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={c.logoUrl}
                      alt={c.name}
                      onError={e => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                      className="w-7 h-7 rounded-md object-contain bg-white dark:bg-neutral-700 p-0.5 border border-neutral-100 dark:border-neutral-700 shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-neutral-900 dark:text-white block truncate">
                        {c.name}
                      </span>
                      <span className="text-[11px] font-mono text-neutral-400 block truncate">
                        {c.domain}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRegisterCandidate(c)}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shrink-0 transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Registrar</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Filter & Counter Bar */}
      <div className="flex items-center justify-between gap-4 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            Portales Registrados ({filteredPortals.length})
          </span>
          <span className="text-xs text-neutral-400">· Solo Nombre y Logo</span>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Filtrar por nombre o dominio..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Grid of Registered Portals (Only Name and Logo Image) */}
      {isLoading ? (
        <div className="p-12 text-center text-neutral-400 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
          <span className="text-xs">Cargando portales...</span>
        </div>
      ) : filteredPortals.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-2">
          <Globe className="w-10 h-10 mx-auto text-neutral-400 opacity-60" />
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
            No hay portales que coincidan con la búsqueda
          </h3>
          <p className="text-xs text-neutral-500">
            Prueba a escribir un término diferente o utiliza el analizador superior para agregar uno nuevo.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredPortals.map((portal, index) => (
            <div
              key={portal.id}
              className="group bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 hover:border-emerald-500/50 dark:hover:border-emerald-500/40 p-5 flex flex-col items-center text-center justify-between transition-all hover:shadow-md relative overflow-hidden"
            >
              {/* Top Rank Badge if top 3 */}
              {index < 3 && (
                <div className="absolute top-2.5 left-2.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-xs">
                    TOP {index + 1} SEO
                  </span>
                </div>
              )}

              {/* Delete button */}
              <button
                onClick={() => handleDeletePortal(portal.id, portal.name)}
                className="absolute top-2.5 right-2.5 p-1 rounded-md text-neutral-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors opacity-0 group-hover:opacity-100"
                title="Eliminar este portal del registro"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              {/* Logo / Image Display (Centerpiece) */}
              <div className="my-3 flex flex-col items-center">
                <div className="w-20 h-20 rounded-2xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700/60 p-2.5 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform duration-200">
                  <img
                    src={portal.logoUrl}
                    alt={portal.name}
                    referrerPolicy="no-referrer"
                    onError={e => {
                      // Fallback to Google Favicon service
                      const target = e.target as HTMLImageElement;
                      if (!target.src.includes('google.com/s2/favicons')) {
                        target.src = `https://www.google.com/s2/favicons?domain=${portal.domain}&sz=128`;
                      }
                    }}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Name */}
                <h3 className="mt-3 text-base font-bold text-neutral-900 dark:text-white leading-snug group-hover:text-emerald-600 transition-colors">
                  {portal.name}
                </h3>

                {/* Domain Link */}
                <a
                  href={portal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 text-xs text-neutral-400 hover:text-emerald-500 flex items-center gap-1 transition-colors font-mono"
                >
                  <span>{portal.domain}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Actions Footer */}
              <div className="w-full pt-3 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-center">
                <button
                  onClick={() => onSelectPortalForScraping(portal.url)}
                  className="w-full py-2 bg-neutral-100 hover:bg-emerald-600 text-neutral-700 hover:text-white dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-emerald-600 dark:hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                  title="Cargar esta URL en el Scraper"
                >
                  <span>Rastrear en Scraper</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
