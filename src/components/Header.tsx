import React, { useState, useEffect } from 'react';
import { usePos } from '../context/PosContext';
import { NavScreen } from '../types';
import { 
  ShoppingBag, 
  Package, 
  BarChart3, 
  Clock, 
  CheckCircle2, 
  Sparkles,
  AlertTriangle,
  Tag
} from 'lucide-react';

export const Header: React.FC = () => {
  const { currentScreen, setCurrentScreen, stock, cartTotalCount } = usePos();
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const lowStockCount = stock.filter((s) => s.quantity <= s.minQuantity).length;

  const navItems: { id: NavScreen; label: string; shortLabel: string; icon: React.ReactNode; badge?: number | string }[] = [
    {
      id: 'pdv',
      label: 'Caixa / Vendas',
      shortLabel: 'Caixa',
      icon: <ShoppingBag className="w-4 h-4" />,
      badge: cartTotalCount > 0 ? cartTotalCount : undefined
    },
    {
      id: 'produtos',
      label: 'Cardápio & Preços',
      shortLabel: 'Cardápio',
      icon: <Tag className="w-4 h-4" />
    },
    {
      id: 'estoque',
      label: 'Estoque',
      shortLabel: 'Estoque',
      icon: <Package className="w-4 h-4" />,
      badge: lowStockCount > 0 ? (
        <span className="flex items-center gap-0.5 text-amber-700 font-bold">
          <AlertTriangle className="w-3 h-3 text-amber-500" />
          {lowStockCount}
        </span>
      ) : undefined
    },
    {
      id: 'relatorios',
      label: 'Relatórios / Vendas',
      shortLabel: 'Relatórios',
      icon: <BarChart3 className="w-4 h-4" />
    }
  ];

  return (
    <>
      <header className="sticky top-0 z-30 bg-gradient-to-r from-amber-50/95 via-rose-50/95 to-amber-50/95 backdrop-blur-md border-b border-rose-100/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between gap-2 sm:gap-3">
          {/* Brand Identity */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-amber-200 via-rose-200 to-pink-200 p-0.5 shadow-sm flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-white/90 rounded-[14px] flex items-center justify-center text-rose-500 font-bold text-lg sm:text-xl">
                🍦
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-stone-800 font-['Quicksand',sans-serif]">
                  Eliza <span className="text-rose-500 font-semibold">Sorvetes</span>
                </h1>
                <span className="hidden xs:inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-100/80 text-amber-800 border border-amber-200/60">
                  <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-600" /> Artesanal
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-stone-500 leading-tight">Sistema de Gestão & PDV</p>
            </div>
          </div>

          {/* Desktop Navigation Tabs (Hidden on small screens, shown on sm+) */}
          <nav className="hidden sm:flex items-center gap-1.5 p-1 bg-white/80 rounded-2xl border border-rose-100/80 shadow-xs">
            {navItems.map((item) => {
              const isActive = currentScreen === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-${item.id}`}
                  onClick={() => setCurrentScreen(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer select-none ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-100/90 to-rose-100/90 text-stone-900 shadow-xs font-semibold border border-rose-200/60'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[11px] ${
                        typeof item.badge === 'number'
                          ? 'bg-rose-500 text-white font-bold'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Header Right Status Indicator */}
          <div className="flex items-center gap-2 text-xs text-stone-600">
            <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[11px] sm:text-xs">
              <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600" />
              <span className="font-semibold sm:font-medium">Aberto</span>
            </div>

            <div className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/80 border border-rose-100/80 font-mono text-stone-600">
              <Clock className="w-3.5 h-3.5 text-stone-400" />
              <span>{time || '--:--:--'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Fixed for smartphone ergonomics) */}
      <nav 
        id="mobile-bottom-nav" 
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-rose-200/80 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] px-2 py-1.5 flex sm:hidden items-center justify-around select-none"
      >
        {navItems.map((item) => {
          const isActive = currentScreen === item.id;
          return (
            <button
              key={item.id}
              id={`mobile-nav-${item.id}`}
              onClick={() => setCurrentScreen(item.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer min-w-[64px] ${
                isActive
                  ? 'text-rose-600 font-bold'
                  : 'text-stone-500 hover:text-stone-800 font-medium'
              }`}
            >
              <div className="relative">
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
                    isActive ? 'bg-rose-100 text-rose-600' : 'bg-transparent text-stone-600'
                  }`}
                >
                  {item.icon}
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`absolute -top-1 -right-2 px-1.5 py-0.2 rounded-full text-[10px] ${
                      typeof item.badge === 'number'
                        ? 'bg-rose-500 text-white font-bold'
                        : 'bg-amber-100 text-amber-900 font-bold border border-amber-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight leading-none">
                {item.shortLabel}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
