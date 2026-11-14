import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, KeyRound, Eye, EyeOff, ShieldCheck, ArrowRight, Delete, BookOpen } from 'lucide-react';

export default function PinLockScreen() {
  const { login, authError, setAuthError } = useAuth();
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  // Keyboard support for typing PIN directly
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key >= '0' && e.key <= '9') {
        if (pin.length < 8) {
          setPin((prev) => prev + e.key);
          setAuthError('');
        }
      } else if (e.key === 'Backspace') {
        setPin((prev) => prev.slice(0, -1));
        setAuthError('');
      } else if (e.key === 'Enter') {
        handleSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin]);

  const handleKeyPress = (num) => {
    if (pin.length < 8) {
      setPin((prev) => prev + num);
      setAuthError('');
    }
  };

  const handleClear = () => {
    setPin('');
    setAuthError('');
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setAuthError('');
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!pin.trim()) {
      setAuthError('Por favor ingresa el PIN general.');
      triggerShake();
      return;
    }

    setIsSubmitting(true);
    const result = await login(pin);
    setIsSubmitting(false);

    if (!result.success) {
      triggerShake();
      setPin('');
    }
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Background ambient lighting effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className={`w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6 sm:p-8 transition-all ${isShaking ? 'animate-shake' : ''}`}>
        
        {/* Header with Church Club Emblem */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 mb-4 transform hover:scale-105 transition-transform">
            <BookOpen className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            TBBC CLUB BÍBLICO
          </h1>
          <p className="text-sm font-medium text-blue-600 mt-1">
            Panel Administrativo General
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Ingresa el PIN compartido para acceder a todos los módulos
          </p>
        </div>

        {/* PIN Input Display */}
        <div className="mb-6">
          <div className="relative flex items-center">
            <div className="absolute left-4 text-slate-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <input
              type={showPin ? 'text' : 'password'}
              readOnly
              value={pin}
              placeholder="Ingresa PIN general"
              className="w-full text-center text-2xl font-bold tracking-widest py-3.5 px-12 bg-slate-100 rounded-2xl border-2 border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 transition-colors cursor-default"
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute right-4 text-slate-400 hover:text-slate-600 transition-colors p-1"
              title={showPin ? "Ocultar PIN" : "Mostrar PIN"}
            >
              {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* Dots Indicator */}
          <div className="flex justify-center gap-2 mt-3">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-3 h-3 rounded-full transition-all duration-200 ${
                  pin.length > idx
                    ? 'bg-blue-600 scale-110 shadow-sm shadow-blue-400'
                    : 'bg-slate-200'
                }`}
              />
            ))}
          </div>

          {/* Error Message */}
          {authError && (
            <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-center">
              <p className="text-xs font-semibold text-rose-600">
                {authError}
              </p>
            </div>
          )}
        </div>

        {/* Numeric Keypad for Touch / Mouse */}
        <div className="grid grid-cols-3 gap-2.5 mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(String(num))}
              className="h-14 rounded-2xl bg-slate-100/80 hover:bg-blue-50 active:bg-blue-100 text-slate-800 hover:text-blue-700 font-bold text-xl transition-all active:scale-95 flex items-center justify-center shadow-sm border border-slate-200/60"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-14 rounded-2xl bg-slate-100/50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 font-medium text-xs transition-all active:scale-95 flex items-center justify-center border border-slate-200/40"
          >
            LIMPIAR
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="h-14 rounded-2xl bg-slate-100/80 hover:bg-blue-50 active:bg-blue-100 text-slate-800 hover:text-blue-700 font-bold text-xl transition-all active:scale-95 flex items-center justify-center shadow-sm border border-slate-200/60"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="h-14 rounded-2xl bg-slate-100/50 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-all active:scale-95 flex items-center justify-center border border-slate-200/40"
            title="Borrar dígito"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Submit Access Button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || pin.length === 0}
          className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 group active:scale-[0.98]"
        >
          {isSubmitting ? (
            <span className="inline-block animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <>
              <span>Acceder al Sistema</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>

        {/* Default PIN Helper Info */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-500 bg-slate-50/80 py-2 rounded-xl">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>PIN predeterminado inicial: <strong className="text-slate-700 font-mono">2026</strong></span>
        </div>

      </div>
    </div>
  );
}

