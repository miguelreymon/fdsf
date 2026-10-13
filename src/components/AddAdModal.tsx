import React, { useState } from 'react';
import { X, Plus, Image, Phone, MapPin, AlertTriangle } from 'lucide-react';

interface AddAdModalProps {
  onClose: () => void;
  onAdAdded: (ad: any) => void;
}

export const AddAdModal: React.FC<AddAdModalProps> = ({ onClose, onAdAdded }) => {
  const [title, setTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'nuevo' | 'contactado' | 'favorito'>('nuevo');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !phone.trim()) {
      setErrorMsg('El título y el número de teléfono son obligatorios.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/directory/item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          phone: phone.trim(),
          imageUrl: imageUrl.trim(),
          location: location.trim(),
          notes: notes.trim(),
          status,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al guardar el anuncio');
      }

      onAdAdded(data.ad);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full overflow-hidden border border-neutral-200 dark:border-neutral-800 shadow-2xl my-8">
        <div className="p-4 sm:p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <h3 className="text-base font-bold text-neutral-900 dark:text-white">
            Añadir Anuncio Manual
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Título o Nombre *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ej: Sofia 25 años nueva en Madrid centro"
              className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Teléfono o WhatsApp *
            </label>
            <input
              type="text"
              required
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="Ej: 612 34 56 78 o +34 612345678"
              className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
            />
            <span className="text-[11px] text-neutral-400 mt-1 block">
              Si el número ya existe en tu directorio, será rechazado para evitar duplicados.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Enlace de 1 Foto (URL de la imagen)
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              placeholder="https://ejemplo.com/foto.jpg"
              className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Ciudad / Zona
            </label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Ej: Madrid, Salamanca, Barcelona..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Notas Personales
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Anotaciones personales sobre este anuncio..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? 'Verificando...' : 'Añadir al Directorio'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
