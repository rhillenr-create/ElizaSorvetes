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
  Tag,
  Cloud,
  CloudOff,
  RefreshCw,
  LogOut,
  Database
} from 'lucide-react';

export const Header: React.FC = () => {
  const { 
    currentScreen, 
    setCurrentScreen, 
    stock, 
    cartTotalCount,
    currentUser,
    operatorUser,
    syncStatus,
    reconnectFirebase,
    logout
  } = usePos();
  const [time, setTime] = useState<string>('');
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);

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

  const handleReconnect = async () => {
    try {
      setIsReconnecting(true);
      await reconnectFirebase();
    } catch (e) {
      console.error('Reconnect failed:', e);
    } finally {
      setIsReconnecting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.error('Logout failed:', e);
    }
  };

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
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-stone-600">
            {/* Operator info badge */}
            <div 
              id="operator-status-badge"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100/90 border border-stone-200/80 text-[11px] text-stone-700 font-medium"
              title={`Operador logado: ${operatorUser?.email || currentUser?.email || 'elizasorvetes@gmail.com'}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="max-w-[110px] truncate font-semibold">
                {operatorUser?.name || currentUser?.displayName || 'Eliza Sorvetes'}
              </span>
            </div>

            {/* Firebase Cloud Sync Status */}
            <div 
              id="firebase-cloud-status"
              title={
                syncStatus === 'synced'
                  ? 'Firebase Firestore conectado automaticamente. Vendas salvas em tempo real com segurança total.'
                  : syncStatus === 'syncing'
                  ? 'Sincronizando dados com o Firebase Firestore...'
                  : 'Modo offline com persistência local ativa. Clique para reconectar à nuvem.'
              }
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-medium border transition-all ${
                syncStatus === 'synced'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80 shadow-xs'
                  : syncStatus === 'syncing'
                  ? 'bg-sky-50 text-sky-800 border-sky-200/80'
                  : 'bg-amber-50 text-amber-800 border-amber-200/80'
              }`}
            >
              {syncStatus === 'syncing' || isReconnecting ? (
                <RefreshCw className="w-3 h-3 text-sky-600 animate-spin" />
              ) : syncStatus === 'synced' ? (
                <Cloud className="w-3 h-3 text-emerald-600" />
              ) : (
                <CloudOff className="w-3 h-3 text-amber-600" />
              )}
              <span className="hidden md:inline">
                {syncStatus === 'synced'
                  ? 'Firebase Conectado'
                  : syncStatus === 'syncing' || isReconnecting
                  ? 'Sincronizando Nuvem'
                  : 'Offline'}
              </span>
              {syncStatus !== 'synced' && (
                <button
                  type="button"
                  id="btn-reconnect-cloud"
                  onClick={handleReconnect}
                  disabled={isReconnecting}
                  className="ml-1 px-1.5 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 text-[10px] font-semibold cursor-pointer"
                >
                  Reconectar
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[11px] sm:text-xs">
              <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600" />
              <span className="font-semibold sm:font-medium">Aberto</span>
            </div>

            <div className="hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/80 border border-rose-100/80 font-mono text-stone-600">
              <Clock className="w-3.5 h-3.5 text-stone-400" />
              <span>{time || '--:--:--'}</span>
            </div>

            {/* Logout Button */}
            <button
              id="btn-app-logout"
              onClick={handleLogout}
              title="Encerrar sessão do operador e bloquear caixa"
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 text-[11px] font-medium transition-colors cursor-pointer active:scale-95"
            >
              <LogOut className="w-3 h-3" />
              <span className="hidden sm:inline">Sair</span>
            </button>
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
