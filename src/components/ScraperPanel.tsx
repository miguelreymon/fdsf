import React, { useState, useEffect } from 'react';
import {
  Play,
  Loader2,
  ShieldAlert,
  CheckCircle2,
  ArrowRight,
  Globe,
  Layers,
  Code,
  MapPin,
  Tag,
  Hash,
  Sparkles,
  Sliders,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import type { ScrapeJobResult, ScrapeProgressLog, PortalItem } from '../types.ts';

interface ScraperPanelProps {
  initialUrl?: string;
  onScrapeComplete: (result: ScrapeJobResult) => void;
  onNavigateToDirectory: () => void;
  onNavigateToDuplicates: () => void;
}

// Common cities in Spain for classifieds
const SPANISH_CITIES = [
  { name: 'Toda España (General)', slug: '' },
  { name: 'Madrid', slug: 'madrid' },
  { name: 'Barcelona', slug: 'barcelona' },
  { name: 'Valencia', slug: 'valencia' },
  { name: 'Sevilla', slug: 'sevilla' },
  { name: 'Málaga', slug: 'malaga' },
  { name: 'Zaragoza', slug: 'zaragoza' },
  { name: 'Bilbao', slug: 'bilbao' },
  { name: 'Alicante', slug: 'alicante' },
  { name: 'Murcia', slug: 'murcia' },
  { name: 'Palma de Mallorca', slug: 'palma' },
  { name: 'Granada', slug: 'granada' },
  { name: 'Vigo', slug: 'vigo' },
  { name: 'Córdoba', slug: 'cordoba' },
  { name: 'Valladolid', slug: 'valladolid' },
  { name: 'Las Palmas', slug: 'las-palmas' },
  { name: 'Tenerife', slug: 'tenerife' },
  { name: 'A Coruña', slug: 'a-coruna' },
  { name: 'Gijón / Asturias', slug: 'gijon' },
  { name: 'Santander', slug: 'santander' },
];

// Common categories for adult and classifieds portals
const CLASSIFIEDS_CATEGORIES = [
  { name: 'Todas las Categorías', slug: '' },
  { name: 'Escorts / Chicas', slug: 'escorts' },
  { name: 'Travestis / Trans', slug: 'travestis' },
  { name: 'Masajes / Masajistas', slug: 'masajes' },
  { name: 'Chicos / Gigolós', slug: 'chicos' },
  { name: 'Contactos / Citas', slug: 'contactos' },
  { name: 'Amistad / Relaciones', slug: 'amistad' },
];

// Fallback top portals list with logos
const DEFAULT_PORTALS = [
  { name: 'Mundosexanuncio', domain: 'mundosexanuncio.com', url: 'https://www.mundosexanuncio.com/', logoUrl: 'https://static.mundosexanuncio.com/images/mundosexlogo.png' },
  { name: 'NuevoLoquo', domain: 'nuevoloquo.es', url: 'https://www.nuevoloquo.es/', logoUrl: 'https://www.google.com/s2/favicons?domain=nuevoloquo.es&sz=128' },
  { name: 'Skokka España', domain: 'es.skokka.com', url: 'https://es.skokka.com/', logoUrl: 'https://www.google.com/s2/favicons?domain=es.skokka.com&sz=128' },
  { name: 'Erosguía', domain: 'erosguia.com', url: 'https://www.erosguia.com/', logoUrl: 'https://www.google.com/s2/favicons?domain=erosguia.com&sz=128' },
  { name: 'Slumi', domain: 'slumi.com', url: 'https://slumi.com/', logoUrl: 'https://www.google.com/s2/favicons?domain=slumi.com&sz=128' },
  { name: 'Locanto España', domain: 'locanto.es', url: 'https://www.locanto.es/', logoUrl: 'https://www.google.com/s2/favicons?domain=locanto.es&sz=128' },
  { name: 'Destacamos', domain: 'destacamos.com', url: 'https://destacamos.com/', logoUrl: 'https://www.google.com/s2/favicons?domain=destacamos.com&sz=128' },
  { name: 'CitaPerfecta', domain: 'citaperfecta.com', url: 'https://citaperfecta.com/', logoUrl: 'https://www.google.com/s2/favicons?domain=citaperfecta.com&sz=128' },
];

// Helper to build tailored URLs for any portal + city + category
export function buildPortalUrl(baseUrl: string, citySlug: string, catSlug: string): string {
  let base = (baseUrl || 'https://www.mundosexanuncio.com/').trim();
  if (!base.endsWith('/')) base += '/';

  const cleanDomain = base.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase();

  // 1. Mundosexanuncio
  if (cleanDomain.includes('mundosexanuncio.com')) {
    let catPrefix = 'contactos-mujeres';
    if (catSlug === 'travestis') catPrefix = 'transexuales-y-travestis';
    else if (catSlug === 'masajes') catPrefix = 'masajes-eroticos';
    else if (catSlug === 'chicos') catPrefix = 'contactos-hombres';

    if (citySlug) {
      return `https://www.mundosexanuncio.com/${catPrefix}-en-${citySlug}-provincia`;
    }
    return `https://www.mundosexanuncio.com/${catPrefix}`;
  }

  // 2. NuevoLoquo
  if (cleanDomain.includes('nuevoloquo.')) {
    const origin = base.startsWith('http') ? new URL(base).origin : `https://${cleanDomain}`;
    let category = catSlug || 'escorts';
    if (citySlug) {
      return `${origin}/${citySlug}/${category}/`;
    }
    return `${origin}/contactos/`;
  }

  // 3. Skokka
  if (cleanDomain.includes('skokka.')) {
    let category = catSlug || 'escorts';
    if (citySlug) {
      return `https://es.skokka.com/${category}/${citySlug}/`;
    }
    return `https://es.skokka.com/`;
  }

  // 4. Erosguia
  if (cleanDomain.includes('erosguia.com')) {
    let category = catSlug || 'escorts';
    if (citySlug) {
      return `https://www.erosguia.com/${citySlug}/${category}/`;
    }
    return `https://www.erosguia.com/`;
  }

  // 5. Slumi
  if (cleanDomain.includes('slumi.com')) {
    if (citySlug) {
      return `https://slumi.com/${citySlug}/`;
    }
    return `https://slumi.com/`;
  }

  // 6. Locanto
  if (cleanDomain.includes('locanto.')) {
    if (citySlug) {
      return `https://www.locanto.es/${citySlug}/contactos/`;
    }
    return `https://www.locanto.es/contactos/`;
  }

  // 7. Destacamos
  if (cleanDomain.includes('destacamos.com')) {
    let category = catSlug || 'escorts';
    if (citySlug) {
      return `https://destacamos.com/${citySlug}/${category}/`;
    }
    return `https://destacamos.com/`;
  }

  // 8. Generic / Any portal
  let path = '';
  if (citySlug) path += `${citySlug}/`;
  if (catSlug) path += `${catSlug}/`;
  return base + path;
}

export const ScraperPanel: React.FC<ScraperPanelProps> = ({
  initialUrl,
  onScrapeComplete,
  onNavigateToDirectory,
  onNavigateToDuplicates,
}) => {
  // Registered Portals List
  const [availablePortals, setAvailablePortals] = useState<any[]>(DEFAULT_PORTALS);

  // Core Selectors (Always active for each portal)
  const [selectedPortalUrl, setSelectedPortalUrl] = useState<string>(
    initialUrl || 'https://www.mundosexanuncio.com/'
  );
  const [customPortalUrl, setCustomPortalUrl] = useState('');
  const [selectedCity, setSelectedCity] = useState('madrid');
  const [customCity, setCustomCity] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');

  // Target constructed & editable URL
  const [constructedUrl, setConstructedUrl] = useState<string>('');

  // Scraping Controls
  const [targetAdCount, setTargetAdCount] = useState<number>(100);
  const [followDetailLinks, setFollowDetailLinks] = useState(false);
  const [fullAdMode, setFullAdMode] = useState(true);
  const [cropWatermark, setCropWatermark] = useState(true);

  // Advanced mode sub-tabs (optional: Batch or manual HTML)
  const [viewMode, setViewMode] = useState<'selectors' | 'multi' | 'html'>('selectors');
  const [multiUrls, setMultiUrls] = useState(
    'https://www.mundosexanuncio.com/contactos-mujeres-en-madrid-provincia\nhttps://www.mundosexanuncio.com/contactos-mujeres-en-barcelona-provincia'
  );
  const [rawHtml, setRawHtml] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<ScrapeJobResult | null>(null);
  const [liveLogs, setLiveLogs] = useState<ScrapeProgressLog[]>([]);

  // Fetch updated list of registered portals from server
  useEffect(() => {
    fetch('/api/portals')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.portals) && data.portals.length > 0) {
          setAvailablePortals(data.portals);
        }
      })
      .catch(() => {});
  }, []);

  // Sync initialUrl if prop changes (e.g. user clicked "Rastrear en Scraper" in Portales SEO)
  useEffect(() => {
    if (initialUrl) {
      setSelectedPortalUrl(initialUrl);
      setViewMode('selectors'); // Always keep selectors active!
    }
  }, [initialUrl]);

  // Dynamically recalculate constructed URL whenever Portal, City or Category changes
  useEffect(() => {
    const base = selectedPortalUrl === 'custom' ? customPortalUrl : selectedPortalUrl;
    const citySlug = selectedCity === 'custom' ? customCity.trim().toLowerCase().replace(/\s+/g, '-') : selectedCity;
    const catSlug = selectedCategory === 'custom' ? customCategory.trim().toLowerCase().replace(/\s+/g, '-') : selectedCategory;

    const built = buildPortalUrl(base, citySlug, catSlug);
    setConstructedUrl(built);
  }, [selectedPortalUrl, customPortalUrl, selectedCity, customCity, selectedCategory, customCategory]);

  const handleStartScrape = async () => {
    setIsLoading(true);
    setLiveLogs([
      { timestamp: new Date().toISOString(), level: 'info', message: 'Iniciando rastreo multi-página por código...' },
      { timestamp: new Date().toISOString(), level: 'info', message: `Meta objetivo: reunir ${targetAdCount} anuncios únicos sin duplicados.` },
    ]);

    try {
      const cityFilterValue = selectedCity === 'custom' ? customCity : selectedCity;

      let payload: any = {
        targetAdCount,
        maxAds: targetAdCount,
        maxPages: Math.max(10, Math.ceil(targetAdCount / 10)),
        followDetailLinks: followDetailLinks || fullAdMode,
        fullAdMode,
        cropWatermark,
        cityFilter: cityFilterValue || undefined,
      };

      if (viewMode === 'selectors') {
        payload.url = constructedUrl;
      } else if (viewMode === 'multi') {
        payload.urls = multiUrls.split('\n').map(u => u.trim()).filter(Boolean);
      } else if (viewMode === 'html') {
        payload.url = selectedPortalUrl || 'https://www.mundosexanuncio.com/';
        payload.rawHtml = rawHtml;
      }

      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al ejecutar el scraper');
      }

      setLastResult(data);
      if (data.logs) {
        setLiveLogs(data.logs);
      }
      onScrapeComplete(data);
    } catch (err: any) {
      setLiveLogs(prev => [
        ...prev,
        { timestamp: new Date().toISOString(), level: 'error', message: err.message || 'Error de conexión' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Find currently selected portal item for display
  const currentPortalItem = availablePortals.find(
    p => p.url === selectedPortalUrl || (p.domain && selectedPortalUrl.includes(p.domain))
  );

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 sm:p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <Sliders className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                Extractor y Scraper Multi-Página
              </h2>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-2xl leading-relaxed">
              Elige el <strong>portal</strong> que deseas, selecciona tu <strong>ciudad/provincia</strong> y tu <strong>categoría</strong>. El rastreador construirá automáticamente el enlace correcto, navegará por las páginas hasta completar la cifra solicitada y descartará números repetidos.
            </p>
          </div>

          {/* Sub-mode selector (Interactive is default, with optional advanced batch/html) */}
          <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl self-start sm:self-auto">
            <button
              onClick={() => setViewMode('selectors')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                viewMode === 'selectors'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-emerald-600" />
              <span>Selectores (Portal + Ciudad + Categoría)</span>
            </button>

            <button
              onClick={() => setViewMode('multi')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                viewMode === 'multi'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Lote de URLs</span>
            </button>

            <button
              onClick={() => setViewMode('html')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                viewMode === 'html'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Pegar HTML</span>
            </button>
          </div>
        </div>

        {/* --- MAIN SELECTORS MODE (PORTAL + CIUDAD + CATEGORIA) --- */}
        {viewMode === 'selectors' && (
          <div className="space-y-5 pt-2">
            {/* 1. SELECTOR DE PORTAL */}
            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-900 dark:text-white">
                  <Globe className="w-4 h-4 text-emerald-600" />
                  <span>1. Seleccionar Portal Web</span>
                </div>
                {currentPortalItem && (
                  <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                    {currentPortalItem.domain}
                  </span>
                )}
              </div>

              {/* Quick portal logos chip buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {availablePortals.slice(0, 8).map(portal => {
                  const isSelected = selectedPortalUrl === portal.url || (portal.domain && selectedPortalUrl.includes(portal.domain));
                  return (
                    <button
                      key={portal.domain || portal.url}
                      type="button"
                      onClick={() => {
                        setSelectedPortalUrl(portal.url);
                      }}
                      className={`text-xs px-3 py-1.5 rounded-xl border transition-all flex items-center gap-2 ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-xs'
                          : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                      }`}
                    >
                      <img
                        src={portal.logoUrl}
                        alt=""
                        className="w-4 h-4 rounded-xs object-contain bg-white shrink-0"
                        onError={e => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <span>{portal.name}</span>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setSelectedPortalUrl('custom')}
                  className={`text-xs px-3 py-1.5 rounded-xl border transition-all ${
                    selectedPortalUrl === 'custom'
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900 font-bold'
                      : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100'
                  }`}
                >
                  Otro portal / Dominio manual
                </button>
              </div>

              {/* Portal dropdown selector */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <select
                  value={selectedPortalUrl === 'custom' ? 'custom' : selectedPortalUrl}
                  onChange={e => setSelectedPortalUrl(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                >
                  {availablePortals.map(p => (
                    <option key={p.url || p.domain} value={p.url}>
                      {p.name} ({p.domain})
                    </option>
                  ))}
                  <option value="custom">-- Escribir URL de otro portal manualmente --</option>
                </select>

                {selectedPortalUrl === 'custom' && (
                  <input
                    type="url"
                    value={customPortalUrl}
                    onChange={e => setCustomPortalUrl(e.target.value)}
                    placeholder="https://ejemplo-portal.com/"
                    className="flex-1 px-3.5 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 font-mono"
                  />
                )}
              </div>
            </div>

            {/* 2 & 3. SELECTOR DE CIUDAD Y CATEGORÍA (MANTENIDOS PARA CUALQUIER PORTAL) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* 2. City selector */}
              <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/30 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-900 dark:text-white">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span>2. Seleccionar Ciudad / Provincia</span>
                </div>

                <select
                  value={selectedCity}
                  onChange={e => setSelectedCity(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                >
                  {SPANISH_CITIES.map(c => (
                    <option key={c.slug} value={c.slug}>
                      {c.name} {c.slug ? `(/${c.slug}/)` : ''}
                    </option>
                  ))}
                  <option value="custom">-- Otra ciudad (escribir slug manual) --</option>
                </select>

                {selectedCity === 'custom' && (
                  <input
                    type="text"
                    value={customCity}
                    onChange={e => setCustomCity(e.target.value)}
                    placeholder="Ej: leganes o benidorm"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 font-mono"
                  />
                )}

                {/* Quick chips for top cities */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {['', 'madrid', 'barcelona', 'valencia', 'sevilla', 'malaga', 'bilbao', 'alicante'].map(slug => {
                    const item = SPANISH_CITIES.find(c => c.slug === slug);
                    const isCitySelected = selectedCity === slug;
                    return (
                      <button
                        key={slug || 'espana'}
                        type="button"
                        onClick={() => setSelectedCity(slug)}
                        className={`text-[11px] px-2.5 py-1 rounded-md border transition-all ${
                          isCitySelected
                            ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-xs'
                            : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                        }`}
                      >
                        {item?.name.split(' ')[0]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Category selector */}
              <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/30 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-900 dark:text-white">
                  <Tag className="w-4 h-4 text-emerald-600" />
                  <span>3. Seleccionar Categoría</span>
                </div>

                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                >
                  {CLASSIFIEDS_CATEGORIES.map(c => (
                    <option key={c.slug} value={c.slug}>
                      {c.name} {c.slug ? `(/${c.slug}/)` : ''}
                    </option>
                  ))}
                  <option value="custom">-- Otra categoría (escribir slug manual) --</option>
                </select>

                {selectedCategory === 'custom' && (
                  <input
                    type="text"
                    value={customCategory}
                    onChange={e => setCustomCategory(e.target.value)}
                    placeholder="Ej: masajes o contactos"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 font-mono"
                  />
                )}

                {/* Quick chips for categories */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {['', 'escorts', 'travestis', 'masajes', 'chicos'].map(slug => {
                    const item = CLASSIFIEDS_CATEGORIES.find(c => c.slug === slug);
                    const isCatSelected = selectedCategory === slug;
                    return (
                      <button
                        key={slug || 'todas'}
                        type="button"
                        onClick={() => setSelectedCategory(slug)}
                        className={`text-[11px] px-2.5 py-1 rounded-md border transition-all ${
                          isCatSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-xs'
                            : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                        }`}
                      >
                        {item?.name.split('/')[0].trim()}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Generated Target URL Display (Always visible & editable) */}
            <div className="p-3.5 bg-neutral-950 text-white rounded-xl border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-neutral-400 font-medium">
                <span>URL FINAL FORMATEADA PARA ESTE PORTAL (EDITABLE):</span>
                {constructedUrl && (
                  <a
                    href={constructedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-emerald-400 flex items-center gap-1 transition-colors text-xs text-neutral-300"
                  >
                    <span>Probar enlace en navegador</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
              <input
                type="url"
                value={constructedUrl}
                onChange={e => setConstructedUrl(e.target.value)}
                className="w-full px-3 py-2 font-mono text-xs text-emerald-400 bg-neutral-900 border border-neutral-800 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        )}

        {/* Multi-URL Mode */}
        {viewMode === 'multi' && (
          <div className="space-y-2 pt-2">
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Pega múltiples URLs (una por línea) para rastreo conjunto
            </label>
            <textarea
              rows={4}
              value={multiUrls}
              onChange={e => setMultiUrls(e.target.value)}
              className="w-full px-3.5 py-2 text-xs font-mono rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
            />
          </div>
        )}

        {/* HTML Mode */}
        {viewMode === 'html' && (
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Dominio de referencia para fotos relativas
              </label>
              <input
                type="url"
                value={selectedPortalUrl}
                onChange={e => setSelectedPortalUrl(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Código Fuente HTML de la página
              </label>
              <textarea
                rows={5}
                value={rawHtml}
                onChange={e => setRawHtml(e.target.value)}
                placeholder="Pega el HTML inspeccionado de la web..."
                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
              />
            </div>
          </div>
        )}

        {/* Feature: MODO ANUNCIO COMPLETO (Todas las fotos HD, recorte sin logo, nombre y nacionalidad) */}
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  ✨ Modo Anuncio Completo (Recomendado)
                </span>
                <span className="text-[10px] font-semibold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                  HD + Recorte + Detección
                </span>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                Extrae <strong>todas las fotos</strong> del anuncio en su máxima resolución original, <strong>recorta la franja inferior</strong> para eliminar el logo o marca de agua de la web, y <strong>detecta automáticamente por código el nombre y la nacionalidad</strong> para guardarlos en campos independientes.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                checked={fullAdMode}
                onChange={e => setFullAdMode(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-hidden rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {fullAdMode && (
            <div className="pt-2 border-t border-emerald-200/50 dark:border-emerald-800/40 flex flex-wrap items-center justify-between gap-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-emerald-900 dark:text-emerald-200 font-medium">
                <input
                  type="checkbox"
                  checked={cropWatermark}
                  onChange={e => setCropWatermark(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded-sm border-neutral-300"
                />
                <span>✂️ Recortar trozo inferior automáticamente (oculta logo/marca de agua del portal)</span>
              </label>

              <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                100% procesado por código sin pérdidas
              </div>
            </div>
          )}
        </div>

        {/* Quantity and Crawl Depth Control */}
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold text-neutral-900 dark:text-white">
                  Cantidad Objetivo de Anuncios a Reunir
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Si una página solo tiene 20 o 30 anuncios, el scraper pasará a la siguiente página automáticamente hasta completar la cifra solicitada.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min={5}
                max={300}
                step={5}
                value={targetAdCount}
                onChange={e => setTargetAdCount(Math.max(5, Number(e.target.value)))}
                className="w-24 px-3 py-1.5 text-sm font-mono font-bold text-center rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
              />
              <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">anuncios</span>
            </div>
          </div>

          {/* Quick Preset Buttons for Ad Count */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-neutral-200 dark:border-neutral-700/60">
            <span className="text-xs text-neutral-500">Ajustes rápidos:</span>
            {[25, 50, 100, 150, 200].map(count => (
              <button
                key={count}
                type="button"
                onClick={() => setTargetAdCount(count)}
                className={`text-xs px-3 py-1 rounded-md border transition-all ${
                  targetAdCount === count
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900 dark:border-white font-bold shadow-xs'
                    : 'bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100'
                }`}
              >
                {count} anuncios {count === 100 ? '★ Recomendado' : ''}
              </button>
            ))}
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-neutral-200 dark:border-neutral-700/60">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-700 dark:text-neutral-300 select-none">
              <input
                type="checkbox"
                checked={followDetailLinks}
                onChange={e => setFollowDetailLinks(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded-sm border-neutral-300"
              />
              <span>Rastrear fichas individuales (si los teléfonos están tras botón "Ver teléfono")</span>
            </label>

            <div className="text-xs text-neutral-500 font-mono">
              Límite de seguridad: hasta 15 páginas
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex items-center justify-end">
          <button
            onClick={handleStartScrape}
            disabled={isLoading || (viewMode === 'html' && !rawHtml.trim())}
            className="w-full sm:w-auto px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-md hover:shadow-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Rastreando y Avanzando Páginas...</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-white" />
                <span>Iniciar Extracción de Anuncios</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Progress Logs & Execution Status Console */}
      {liveLogs.length > 0 && (
        <div className="bg-neutral-950 text-neutral-200 rounded-2xl p-5 border border-neutral-800 shadow-xl space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-white tracking-wide">
                Consola de Extracción en Tiempo Real (100% Código)
              </span>
            </div>
            {lastResult && (
              <span className="text-[11px] text-neutral-400">
                Tiempo: {(lastResult.durationMs / 1000).toFixed(1)}s
              </span>
            )}
          </div>

          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-2 scrollbar-thin">
            {liveLogs.map((log, index) => (
              <div key={index} className="flex items-start gap-2 leading-relaxed">
                <span className="text-neutral-500 select-none shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span
                  className={
                    log.level === 'error'
                      ? 'text-rose-400 font-bold'
                      : log.level === 'warn'
                      ? 'text-amber-400 font-semibold'
                      : log.level === 'success'
                      ? 'text-emerald-400 font-medium'
                      : 'text-neutral-300'
                  }
                >
                  {log.message}
                </span>
              </div>
            ))}
          </div>

          {lastResult && (
            <div className="pt-3 border-t border-neutral-800/80 flex flex-wrap items-center justify-between gap-3 text-[11px]">
              <div className="flex items-center gap-4">
                <span className="text-emerald-400 font-bold">
                  ✓ {lastResult.newUniqueAdded} anuncios únicos agregados
                </span>
                {lastResult.duplicatesSkipped > 0 && (
                  <span className="text-amber-400">
                    ⚠ {lastResult.duplicatesSkipped} repetidos bloqueados
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onNavigateToDirectory}
                  className="px-3 py-1 bg-white hover:bg-neutral-100 text-neutral-900 rounded-md font-sans font-semibold transition-colors flex items-center gap-1"
                >
                  <span>Ver en Mi Directorio</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
