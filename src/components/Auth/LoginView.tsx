import React, { useState } from 'react';
import { usePos } from '../../context/PosContext';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  LogIn, 
  IceCream, 
  AlertCircle, 
  ShieldCheck, 
  Sparkles,
  KeyRound
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { loginWithCredentials, loginWithGoogle } = usePos();
  
  const [email, setEmail] = useState<string>('elizasorvetes@gmail.com');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage('Por favor, informe o e-mail de acesso.');
      return;
    }

    if (!password) {
      setErrorMessage('Por favor, digite sua senha de acesso.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await loginWithCredentials(email, password);
      if (!res.success) {
        setErrorMessage(res.error || 'Credenciais inválidas. Verifique seu e-mail e senha.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao conectar. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('elizasorvetes@gmail.com');
    setPassword('Eliza@2020');
    setErrorMessage(null);
  };

  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error('Google login error:', err);
      setErrorMessage('Não foi possível conectar com o Google no momento.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFFDF9] via-[#FFF8F0] to-[#FFF1F2] text-stone-800 flex flex-col justify-center items-center p-4 sm:p-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Background soft decorative element */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-amber-200/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-rose-200/40 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Brand Card Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-500 text-white shadow-md shadow-rose-200/50 mb-3 transform hover:scale-105 transition-transform duration-200">
            <IceCream className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-800">
            Eliza Sorvetes
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Ponto de Venda & Controle de Estoque
          </p>
        </div>

        {/* Login Box */}
        <div 
          id="login-card-container"
          className="bg-white/95 backdrop-blur-sm border border-stone-200/80 rounded-2xl p-6 sm:p-8 shadow-xl shadow-stone-200/40"
        >
          <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-6">
            <div>
              <h2 className="text-lg font-semibold text-stone-800">Acesso ao Caixa</h2>
              <p className="text-xs text-stone-500">Identifique-se para iniciar a operação</p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              <span>Restrito</span>
            </div>
          </div>

          {errorMessage && (
            <div 
              id="login-error-alert"
              className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5 text-xs animate-shake"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">
                {errorMessage}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label 
                htmlFor="input-login-email" 
                className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5"
              >
                E-mail ou Usuário
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="input-login-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="elizasorvetes@gmail.com"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-stone-50/70 border border-stone-200 rounded-xl text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 focus:bg-white transition-colors"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label 
                  htmlFor="input-login-password" 
                  className="block text-xs font-semibold text-stone-700 uppercase tracking-wider"
                >
                  Senha de Acesso
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="input-login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  className="w-full pl-9 pr-10 py-2.5 bg-stone-50/70 border border-stone-200 rounded-xl text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 focus:bg-white transition-colors"
                />
                <button
                  type="button"
                  id="btn-toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Quick credentials filler button */}
            <button
              type="button"
              id="btn-quick-fill"
              onClick={handleFillDemo}
              className="w-full py-1.5 px-3 rounded-lg bg-amber-50/80 hover:bg-amber-100/80 border border-amber-200/70 text-amber-900 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-600" />
              <span>Preencher credenciais fornecidas</span>
            </button>

            {/* Submit Button */}
            <button
              type="submit"
              id="btn-submit-login"
              disabled={isLoading || isGoogleLoading}
              className="w-full py-2.5 px-5 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-semibold rounded-xl text-sm shadow-md shadow-rose-200/50 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99] disabled:opacity-60"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              <span>{isLoading ? 'Entrando no sistema...' : 'Entrar no Sistema'}</span>
            </button>
          </form>

          {/* Social or Google Alternate */}
          <div className="mt-6 pt-5 border-t border-stone-100">
            <button
              type="button"
              id="btn-google-login"
              onClick={handleGoogleLogin}
              disabled={isLoading || isGoogleLoading}
              className="w-full py-2.5 px-4 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl text-stone-700 text-xs font-medium flex items-center justify-center gap-2.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>{isGoogleLoading ? 'Conectando...' : 'Entrar com Conta Google'}</span>
            </button>
          </div>
        </div>

        {/* Firebase Auto-Connection & Security Indicator */}
        <div className="mt-4 flex flex-col items-center gap-1.5 text-center">
          <div className="inline-flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50/90 px-3 py-1.5 rounded-full border border-emerald-200/80 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold">Firebase Conectado Automaticamente</span>
            <span className="text-emerald-400">•</span>
            <span className="text-emerald-700">Vendas Protegidas em Nuvem</span>
          </div>
          <div className="inline-flex items-center gap-1.5 text-[11px] text-stone-500 bg-stone-100/80 px-2.5 py-1 rounded-full border border-stone-200/60">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Operador: <strong>elizasorvetes@gmail.com</strong></span>
          </div>
          <p className="text-[11px] text-stone-400 mt-1">
            Eliza Sorvetes © 2026 • Terminal de Ponto de Venda Seguro
          </p>
        </div>
      </div>
    </div>
  );
};
