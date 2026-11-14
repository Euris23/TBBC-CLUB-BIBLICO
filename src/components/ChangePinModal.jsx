import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { KeyRound, X, Check, Eye, EyeOff, ShieldAlert } from 'lucide-react';

export default function ChangePinModal() {
  const { changeGeneralPin } = useAuth();
  const { isPinModalOpen, setIsPinModalOpen, showToast, fetchDashboardStats } = useApp();

  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPins, setShowPins] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isPinModalOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!currentPin.trim()) {
      setError('Debes ingresar el PIN actual.');
      return;
    }

    if (!newPin.trim() || newPin.trim().length < 4) {
      setError('El nuevo PIN debe tener al menos 4 dígitos.');
      return;
    }

    if (newPin !== confirmPin) {
      setError('El nuevo PIN y su confirmación no coinciden.');
      return;
    }

    setIsSubmitting(true);
    const result = await changeGeneralPin(currentPin, newPin);
    setIsSubmitting(false);

    if (result.success) {
      showToast('¡PIN general actualizado correctamente!', 'success');
      setIsPinModalOpen(false);
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      fetchDashboardStats(); // Refresh audit logs
    } else {
      setError(result.message || 'Error al cambiar PIN');
    }
  };

  const handleClose = () => {
    setIsPinModalOpen(false);
    setError('');
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-xl">
              <KeyRound className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base">Cambiar PIN General</h3>
              <p className="text-xs text-blue-100">Acceso compartido para encargados</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700">
              <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Current PIN */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              PIN Actual
            </label>
            <input
              type={showPins ? 'text' : 'password'}
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value)}
              placeholder="Ingresa el PIN actual"
              required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono tracking-widest text-slate-800"
            />
          </div>

          {/* New PIN */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nuevo PIN (mínimo 4 dígitos)
            </label>
            <input
              type={showPins ? 'text' : 'password'}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              placeholder="Ej: 2026"
              required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono tracking-widest text-slate-800"
            />
          </div>

          {/* Confirm New PIN */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Confirmar Nuevo PIN
            </label>
            <input
              type={showPins ? 'text' : 'password'}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              placeholder="Repite el nuevo PIN"
              required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono tracking-widest text-slate-800"
            />
          </div>

          {/* Visibility toggle */}
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <button
              type="button"
              onClick={() => setShowPins(!showPins)}
              className="flex items-center gap-1.5 hover:text-slate-800 transition-colors"
            >
              {showPins ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span>{showPins ? 'Ocultar caracteres' : 'Mostrar caracteres'}</span>
            </button>
            <span className="text-[11px] text-slate-400">Solo números recomendados</span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <span className="inline-block animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Guardar Nuevo PIN</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}

