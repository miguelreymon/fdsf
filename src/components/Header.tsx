import React from 'react';
import { Search, Database, ShieldAlert, Plus, Download, Radio, Globe, Puzzle } from 'lucide-react';

interface HeaderProps {
  activeTab: 'directory' | 'scraper' | 'portals' | 'duplicates';
  setActiveTab: (tab: 'directory' | 'scraper' | 'portals' | 'duplicates') => void;
  totalAds: number;
  duplicatesCount: number;
  onOpenAddModal: () => void;
  onOpenExportModal: () => void;
  onOpenExtensionModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  totalAds,
  duplicatesCount,
  onOpenAddModal,
  onOpenExportModal,
  onOpenExtensionModal,
}) => {
  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Zone 1: Single text wordmark */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            D
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-neutral-900 dark:text-white">
              Directorio Clasificados
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation Links / Segmented Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setActiveTab('directory')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'directory'
                ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Mi Directorio</span>
            <span className="text-xs font-mono opacity-70">({totalAds})</span>
          </button>

          <button
            onClick={() => setActiveTab('scraper')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'scraper'
                ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Radio className="w-4 h-4 text-emerald-500" />
            <span>Extractor / Scraper</span>
          </button>

          <button
            onClick={() => setActiveTab('portals')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'portals'
                ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Globe className="w-4 h-4 text-sky-500" />
            <span>Portales SEO</span>
          </button>

          <button
            onClick={() => setActiveTab('duplicates')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'duplicates'
                ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            <span className="hidden sm:inline">Filtro Duplicados</span>
            <span className="sm:hidden">Duplicados</span>
            <span className="text-xs font-mono opacity-70">({duplicatesCount})</span>
          </button>
        </nav>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-2">
          {onOpenExtensionModal && (
            <button
              onClick={onOpenExtensionModal}
              title="Descargar Extensión de Chrome para envíos desatendidos en WhatsApp Web"
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Puzzle className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span className="hidden sm:inline">Extensión Chrome</span>
            </button>
          )}

          <button
            onClick={onOpenExportModal}
            title="Exportar directorio"
            className="p-2 sm:px-3 sm:py-1.5 text-xs font-medium rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar</span>
          </button>

          <button
            onClick={onOpenAddModal}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Añadir Anuncio</span>
            <span className="sm:hidden">Nuevo</span>
          </button>
        </div>
      </div>
    </header>
  );
};
