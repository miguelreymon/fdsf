import React, { useState } from 'react';
import { X, User, MapPin, Check, Save, Loader2 } from 'lucide-react';
import type { AdItem } from '../types.ts';
import { TOP_SPANISH_CITIES } from '../constants/cities.ts';

interface QuickEditAdModalProps {
  ad: AdItem;
  onClose: () => void;
  onSave: (id: string, updates: { detectedName: string; location: string }) => Promise<void>;
}

export const QuickEditAdModal: React.FC<QuickEditAdModalProps> = ({
  ad,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(ad.detectedName || '');
  const [selectedCity, setSelectedCity] = useState(() => {
    const rawLoc = ad.location?.split('(')[0]?.trim() || '';
    if (TOP_SPANISH_CITIES.includes(rawLoc)) {
      return rawLoc;
    }
    return rawLoc ? '__custom__' : 'Madrid';
  });
  const [customCity, setCustomCity] = useState(() => {
    const rawLoc = ad.location?.split('(')[0]?.trim() || '';
    return TOP_SPANISH_CITIES.includes(rawLoc) ? '' : rawLoc;
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const finalCity = selectedCity === '__custom__' ? customCity.trim() : selectedCity;
      await onSave(ad.id, {
        detectedName: name.trim(),
        location: finalCity || 'Madrid',
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-md w-full p-5 border border-neutral-200 dark:border-neutral-800 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                Editar Nombre y Ciudad
              </h3>
              <p className="text-[11px] text-neutral-400 truncate max-w-[240px]">
                {ad.phone} · {ad.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* Nombre de la chica */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Nombre de la chica &#123;nombre&#125;
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ej: Laura, Valeria, Sofía..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
                autoFocus
              />
            </div>
            <span className="text-[10px] text-neutral-400 block">
              Este nombre es el que sustituirá automáticamente la variable <strong>&#123;nombre&#125;</strong> en el mensaje de WhatsApp.
            </span>
          </div>

          {/* Ciudad */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Ciudad de actividad &#123;ciudad&#125;
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              <select
                value={selectedCity}
                onChange={e => setSelectedCity(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500 appearance-none"
              >
                <optgroup label="Principales Ciudades de España">
                  {TOP_SPANISH_CITIES.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Otra opción">
                  <option value="__custom__">Escribir otra ciudad / pueblo...</option>
                </optgroup>
              </select>
            </div>

            {/* Custom City input if selected */}
            {selectedCity === '__custom__' && (
              <div className="pt-1">
                <input
                  type="text"
                  value={customCity}
                  onChange={e => setCustomCity(e.target.value)}
                  placeholder="Escribe el nombre de la ciudad o localidad..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>
            )}
            <span className="text-[10px] text-neutral-400 block">
              Sustituye la variable <strong>&#123;ciudad&#125;</strong> (ej: "Límite en Madrid: Máximo 8 anunciantes").
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Guardar Cambios</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
