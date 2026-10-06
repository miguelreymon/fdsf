import React from 'react';
import { X, FileSpreadsheet, Contact, FileCode, Download } from 'lucide-react';

interface ExportModalProps {
  onClose: () => void;
  totalAds: number;
}

export const ExportModal: React.FC<ExportModalProps> = ({ onClose, totalAds }) => {
  const handleDownload = (format: 'csv' | 'vcf' | 'json') => {
    window.location.href = `/api/export?format=${format}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-md w-full overflow-hidden border border-neutral-200 dark:border-neutral-800 shadow-2xl">
        <div className="p-4 sm:p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Exportar Directorio
            </h3>
            <span className="text-xs text-neutral-500 font-mono">
              {totalAds} anuncios guardados
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-3">
          {/* CSV */}
          <button
            onClick={() => handleDownload('csv')}
            className="w-full p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-all text-left flex items-start gap-4 group"
          >
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                  Hoja de Cálculo CSV / Excel
                </span>
                <Download className="w-4 h-4 text-neutral-400 group-hover:text-emerald-500" />
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Ideal para abrir en Excel o Google Sheets con columnas separadas de Foto, Título, Teléfono y Ciudad.
              </p>
            </div>
          </button>

          {/* VCF vCard */}
          <button
            onClick={() => handleDownload('vcf')}
            className="w-full p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-all text-left flex items-start gap-4 group"
          >
            <div className="p-2.5 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 group-hover:scale-105 transition-transform">
              <Contact className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                  Contactos de Móvil (vCard .VCF)
                </span>
                <Download className="w-4 h-4 text-neutral-400 group-hover:text-sky-500" />
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Importa todos los números directamente a tu agenda de contactos en Android o iPhone.
              </p>
            </div>
          </button>

          {/* JSON */}
          <button
            onClick={() => handleDownload('json')}
            className="w-full p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-all text-left flex items-start gap-4 group"
          >
            <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform">
              <FileCode className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                  Copia de Seguridad JSON
                </span>
                <Download className="w-4 h-4 text-neutral-400 group-hover:text-purple-500" />
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Formato completo con todos los metadatos crudos para copias de seguridad.
              </p>
            </div>
          </button>
        </div>

        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/50 dark:hover:bg-neutral-800"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
