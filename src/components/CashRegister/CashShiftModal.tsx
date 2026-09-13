import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { usePos } from '../../context/PosContext';
import { CashShift, CashMovement, CashMovementType } from '../../types';
import { formatBrazilDateTime } from '../../utils/dateUtils';
import { 
  Lock, 
  Unlock, 
  ArrowDownRight, 
  ArrowUpRight, 
  DollarSign, 
  AlertCircle, 
  CheckCircle2, 
  Printer, 
  X, 
  FileText, 
  Calendar, 
  User, 
  Clock, 
  Coins, 
  Receipt,
  HelpCircle
} from 'lucide-react';

export type CashModalMode = 'open' | 'close' | 'suprimento' | 'sangria' | 'receipt';

interface CashShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: CashModalMode;
  shiftForReceipt?: CashShift | null;
}

export const CashShiftModal: React.FC<CashShiftModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'open',
  shiftForReceipt = null
}) => {
  const { 
    activeShift, 
    openShift, 
    closeShift, 
    addCashMovement, 
    operatorUser, 
    currentUser,
    todayRevenue,
    todaySalesCount
  } = usePos();

  const [mode, setMode] = useState<CashModalMode>(initialMode);

  // Form states
  const [initialCash, setInitialCash] = useState<string>('100.00');
  const [operatorName, setOperatorName] = useState<string>(
    operatorUser?.name || currentUser?.displayName || 'Eliza'
  );
  const [movementType, setMovementType] = useState<CashMovementType>('sangria');
  const [movementAmount, setMovementAmount] = useState<string>('');
  const [movementReason, setMovementReason] = useState<string>('');
  const [countedCash, setCountedCash] = useState<string>('');
  const [closingNotes, setClosingNotes] = useState<string>('');
  const [lastClosedShift, setLastClosedShift] = useState<CashShift | null>(null);
  const [lastMovementReceipt, setLastMovementReceipt] = useState<CashMovement | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Update mode when prop changes
  React.useEffect(() => {
    setMode(initialMode);
    setErrorMsg(null);
    setLastMovementReceipt(null);
    if (initialMode === 'close' && activeShift) {
      setCountedCash(activeShift.expectedCash.toFixed(2));
    }
    if (initialMode === 'sangria') {
      setMovementType('sangria');
    } else if (initialMode === 'suprimento') {
      setMovementType('suprimento');
    }
  }, [initialMode, activeShift]);

  if (!isOpen) return null;

  // Handler for Opening Shift
  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const amount = parseFloat(initialCash.replace(',', '.'));
    if (isNaN(amount) || amount < 0) {
      setErrorMsg('Informe um valor de fundo de troco inicial válido.');
      return;
    }

    try {
      setIsSubmitting(true);
      await openShift(amount, operatorName);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao abrir o caixa.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler for Suprimento / Sangria (Saída de Caixa)
  const handleAddMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const amount = parseFloat(movementAmount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      setErrorMsg('Informe um valor válido maior que zero.');
      return;
    }

    if (movementType === 'sangria' && activeShift && amount > activeShift.expectedCash) {
      setErrorMsg(`A saída de caixa (R$ ${amount.toFixed(2)}) não pode ser maior que o saldo em dinheiro disponível na gaveta (R$ ${activeShift.expectedCash.toFixed(2)}).`);
      return;
    }

    try {
      setIsSubmitting(true);
      const defaultReason = movementType === 'sangria' ? 'Saída de caixa / Pagamento' : 'Suprimento de troco';
      const finalReason = movementReason.trim() || defaultReason;
      const mov = await addCashMovement(
        movementType, 
        amount, 
        finalReason
      );
      setMovementAmount('');
      setMovementReason('');
      setLastMovementReceipt(mov);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao registrar movimentação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler for Closing Shift
  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const counted = parseFloat(countedCash.replace(',', '.'));
    if (isNaN(counted) || counted < 0) {
      setErrorMsg('Informe o valor total contado na gaveta.');
      return;
    }

    try {
      setIsSubmitting(true);
      const closed = await closeShift(counted, closingNotes);
      setLastClosedShift(closed);
      setMode('receipt');
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao fechar o caixa.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Print Receipt Handler
  const handlePrint = () => {
    window.print();
  };

  const receiptShift = shiftForReceipt || lastClosedShift || activeShift;

  return (
    <div 
      id="cash-shift-modal-overlay" 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto"
    >
      <div 
        id="cash-shift-modal-container" 
        className="bg-white rounded-2xl shadow-2xl border border-stone-200/80 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/10 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center font-bold">
              {mode === 'open' && <Unlock className="w-5 h-5 text-emerald-600" />}
              {mode === 'close' && <Lock className="w-5 h-5 text-rose-600" />}
              {mode === 'suprimento' && <ArrowDownRight className="w-5 h-5 text-emerald-600" />}
              {mode === 'sangria' && <ArrowUpRight className="w-5 h-5 text-amber-600" />}
              {mode === 'receipt' && <Receipt className="w-5 h-5 text-stone-700" />}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-stone-800">
                {mode === 'open' && 'Abertura de Caixa'}
                {mode === 'close' && 'Fechamento & Conferência de Caixa'}
                {mode === 'suprimento' && 'Entrada de Troco (Suprimento)'}
                {mode === 'sangria' && 'Saída de Caixa (Pagar com Dinheiro)'}
                {mode === 'receipt' && 'Comprovante do Turno de Caixa'}
              </h3>
              <p className="text-xs text-stone-500">
                {mode === 'open' && 'Inicie o turno com o fundo de troco inicial'}
                {mode === 'close' && 'Confira os valores em dinheiro e encerre o turno'}
                {mode === 'suprimento' && 'Adicione dinheiro à gaveta para reforço de moedas e troco'}
                {mode === 'sangria' && 'Retire dinheiro da gaveta para pagar despesas, fornecedores ou compras'}
                {mode === 'receipt' && 'Demonstrativo detalhado das vendas e valores'}
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-close-cash-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Mode Navigation Tabs when Shift is Active */}
        {activeShift && mode !== 'receipt' && mode !== 'open' && (
          <div className="flex border-b border-stone-200 bg-stone-50/80 px-4 pt-2 gap-1 overflow-x-auto text-xs font-semibold">
            <button
              type="button"
              id="tab-mode-sangria"
              onClick={() => {
                setMode('sangria');
                setMovementType('sangria');
                setLastMovementReceipt(null);
                setErrorMsg(null);
              }}
              className={`pb-2 px-3 rounded-t-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                mode === 'sangria'
                  ? 'bg-white text-amber-900 border-t-2 border-t-amber-600 border-x border-stone-200 shadow-2xs font-bold'
                  : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-amber-600 stroke-[2.5]" />
              <span>Saída / Pagar</span>
            </button>
            <button
              type="button"
              id="tab-mode-suprimento"
              onClick={() => {
                setMode('suprimento');
                setMovementType('suprimento');
                setLastMovementReceipt(null);
                setErrorMsg(null);
              }}
              className={`pb-2 px-3 rounded-t-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                mode === 'suprimento'
                  ? 'bg-white text-emerald-900 border-t-2 border-t-emerald-600 border-x border-stone-200 shadow-2xs font-bold'
                  : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'
              }`}
            >
              <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
              <span>Entrada Troco</span>
            </button>
            <button
              type="button"
              id="tab-mode-close"
              onClick={() => {
                setMode('close');
                setLastMovementReceipt(null);
                setErrorMsg(null);
                if (activeShift) setCountedCash(activeShift.expectedCash.toFixed(2));
              }}
              className={`pb-2 px-3 rounded-t-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                mode === 'close'
                  ? 'bg-white text-rose-900 border-t-2 border-t-rose-600 border-x border-stone-200 shadow-2xs font-bold'
                  : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'
              }`}
            >
              <Lock className="w-3.5 h-3.5 text-rose-600 stroke-[2.5]" />
              <span>Fechar Caixa</span>
            </button>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. Mode: OPEN SHIFT */}
        {mode === 'open' && (
          <form onSubmit={handleOpenShift} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Operador Responsável
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  placeholder="Nome do operador do caixa"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-rose-300 text-stone-800 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Fundo de Troco Inicial (R$)
              </label>
              <div className="relative">
                <span className="text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-sm">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={initialCash}
                  onChange={(e) => setInitialCash(e.target.value)}
                  placeholder="0,00"
                  className="w-full pl-11 pr-3 py-2.5 text-base rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-300 text-stone-900 font-bold"
                />
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-[11px] text-stone-500">Sugestões rápidas:</span>
                {[50, 100, 150, 200].map((val) => (
                  <button
                    type="button"
                    key={val}
                    onClick={() => setInitialCash(val.toFixed(2))}
                    className="px-2 py-0.5 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold cursor-pointer"
                  >
                    R$ {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Sincronização em tempo real do faturamento com o banco */}
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-amber-50 to-rose-50 border border-amber-200/80 text-stone-800 text-xs space-y-1.5">
              <div className="flex items-center justify-between font-semibold text-amber-900">
                <span className="flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-amber-600" />
                  Faturamento de Hoje no Banco:
                </span>
                <span className="font-mono text-sm font-bold text-rose-700">
                  R$ {todayRevenue.toFixed(2).replace('.', ',')}
                </span>
              </div>
              <p className="text-[11px] text-stone-600 leading-relaxed">
                {todaySalesCount > 0
                  ? `Existem ${todaySalesCount} ${todaySalesCount === 1 ? 'venda registrada' : 'vendas registradas'} hoje. Ao abrir o caixa, o faturamento diário é mantido intacto e novas vendas serão vinculadas a este turno e sincronizadas automaticamente no banco.`
                  : 'Nenhuma venda registrada ainda hoje. Ao abrir o caixa, todas as vendas serão salvas imediatamente no Firestore e o faturamento atualizará em tempo real.'}
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-stone-600 hover:bg-stone-100 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                id="btn-confirm-open-shift"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-2"
              >
                <Unlock className="w-4 h-4" />
                {isSubmitting ? 'Abrindo...' : 'Confirmar Abertura'}
              </button>
            </div>
          </form>
        )}

        {/* 2. Mode: SUPRIMENTO / SANGRIA (SAÍDA DE CAIXA / PAGAR) */}
        {(mode === 'suprimento' || mode === 'sangria') && (
          <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
            {/* View A: Success Receipt after registering a movement */}
            {lastMovementReceipt ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-1.5">
                  <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-emerald-950">
                    {lastMovementReceipt.type === 'sangria' ? 'Saída de Caixa Registrada!' : 'Entrada de Troco Registrada!'}
                  </h4>
                  <p className="text-xs text-emerald-800">
                    {lastMovementReceipt.type === 'sangria'
                      ? 'O pagamento foi registrado e o valor em dinheiro já foi deduzido da gaveta.'
                      : 'O suprimento foi registrado e o valor foi somado ao saldo da gaveta.'}
                  </p>
                </div>

                {/* Voucher Summary Card */}
                <div className="p-4 bg-stone-50 rounded-xl border border-stone-200/90 text-xs space-y-2">
                  <div className="flex justify-between items-center pb-2 border-b border-stone-200">
                    <span className="text-stone-500 font-medium">Tipo de Operação:</span>
                    <span className={`font-bold uppercase px-2 py-0.5 rounded-md text-[10px] ${
                      lastMovementReceipt.type === 'sangria' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
                    }`}>
                      {lastMovementReceipt.type === 'sangria' ? 'Saída de Caixa / Pagamento' : 'Entrada / Suprimento'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1">
                    <span className="text-stone-700 font-bold">Valor Movimentado:</span>
                    <span className={`text-base font-black ${
                      lastMovementReceipt.type === 'sangria' ? 'text-amber-800' : 'text-emerald-800'
                    }`}>
                      {lastMovementReceipt.type === 'sangria' ? '- ' : '+ '}R$ {lastMovementReceipt.amount.toFixed(2).replace('.', ',')}
                    </span>
                  </div>

                  <div className="flex justify-between items-start py-1 border-t border-stone-200">
                    <span className="text-stone-500 font-medium">Motivo / Finalidade:</span>
                    <span className="font-semibold text-stone-800 text-right max-w-[240px]">
                      {lastMovementReceipt.reason}
                    </span>
                  </div>

                  {lastMovementReceipt.newExpectedCash !== undefined && (
                    <div className="flex justify-between items-center pt-2 border-t border-stone-200 font-bold">
                      <span className="text-stone-700">Saldo Restante na Gaveta:</span>
                      <span className="font-mono text-stone-900 text-sm">
                        R$ {lastMovementReceipt.newExpectedCash.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-[11px] text-stone-500 pt-1">
                    <span>Operador: {lastMovementReceipt.operatorName}</span>
                    <span>{formatBrazilDateTime(lastMovementReceipt.timestamp)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    id="btn-print-movement-voucher"
                    onClick={handlePrint}
                    className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-900 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    Imprimir Comprovante
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLastMovementReceipt(null);
                      setMovementAmount('');
                      setMovementReason('');
                    }}
                    className="px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs sm:text-sm font-bold border border-amber-200 transition-all cursor-pointer"
                  >
                    + Nova Saída / Movimentação
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs sm:text-sm font-semibold transition-all cursor-pointer"
                  >
                    Concluir
                  </button>
                </div>
              </div>
            ) : (
              /* View B: Form for registering a movement */
              <form onSubmit={handleAddMovement} className="space-y-4">
                {/* Mode Selector Toggle */}
                <div className="flex gap-2 p-1 bg-stone-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => { setMovementType('sangria'); setMode('sangria'); setErrorMsg(null); }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      movementType === 'sangria'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    Saída de Caixa (Pagar)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMovementType('suprimento'); setMode('suprimento'); setErrorMsg(null); }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      movementType === 'suprimento'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <ArrowDownRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    Entrada Troco (Suprimento)
                  </button>
                </div>

                {/* Drawer Cash Status Banner */}
                {activeShift && (
                  <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
                    movementType === 'sangria'
                      ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                      : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                  }`}>
                    <div>
                      <span className="font-semibold block">
                        Saldo Atual em Dinheiro na Gaveta:
                      </span>
                      <span className="text-[11px] text-stone-500">
                        {movementType === 'sangria'
                          ? 'Valor disponível para pagamentos e retiradas'
                          : 'Dinheiro físico existente na gaveta'}
                      </span>
                    </div>
                    <span className="font-mono font-black text-base text-stone-900">
                      R$ {activeShift.expectedCash.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                )}

                {/* Valor da Saída / Movimentação */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-stone-700">
                      {movementType === 'sangria' ? 'Valor a Pagar / Retirar (R$)' : 'Valor a Adicionar (R$)'}
                    </label>
                    {activeShift && movementType === 'sangria' && (
                      <span className="text-[11px] text-stone-500 font-medium">
                        Máximo: R$ {activeShift.expectedCash.toFixed(2).replace('.', ',')}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <span className="text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-sm">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={movementAmount}
                      onChange={(e) => setMovementAmount(e.target.value)}
                      placeholder="0,00"
                      className={`w-full pl-11 pr-3 py-2.5 text-base rounded-xl border focus:outline-hidden focus:ring-2 text-stone-900 font-bold ${
                        movementType === 'sangria'
                          ? 'border-stone-200 focus:ring-amber-300'
                          : 'border-stone-200 focus:ring-emerald-300'
                      }`}
                    />
                  </div>

                  {/* Quick suggestions buttons */}
                  <div className="flex items-center flex-wrap gap-1.5 mt-2">
                    <span className="text-[11px] text-stone-500">Valores rápidos:</span>
                    {[10, 20, 50, 100, 200].map((val) => (
                      <button
                        type="button"
                        key={val}
                        onClick={() => setMovementAmount(val.toFixed(2))}
                        className="px-2 py-0.5 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold cursor-pointer transition-colors"
                      >
                        R$ {val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Motivo / Justificativa com botões de atalho */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    {movementType === 'sangria' ? 'Motivo do Pagamento / Saída' : 'Motivo do Suprimento'}
                  </label>

                  {/* Preset chips for fast selection */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {movementType === 'sangria' ? (
                      <>
                        {[
                          { label: '🚚 Fornecedor', text: 'Pagamento de Fornecedor' },
                          { label: '🥛 Leite / Frutas', text: 'Compra de Leite e Frutas' },
                          { label: '🧊 Gelo / Descartáveis', text: 'Compra de Gelo e Embalagens' },
                          { label: '🧹 Despesa da Loja', text: 'Despesa / Material de Limpeza' },
                          { label: '👤 Vale / Adiantamento', text: 'Adiantamento / Vale' },
                          { label: '🛡️ Sangria de Segurança', text: 'Sangria de Segurança' },
                        ].map((preset) => (
                          <button
                            type="button"
                            key={preset.label}
                            onClick={() => setMovementReason(preset.text)}
                            className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                              movementReason === preset.text
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </>
                    ) : (
                      <>
                        {[
                          { label: '🪙 Troco Moedas', text: 'Reforço de Moedas para Troco' },
                          { label: '💵 Notas de R$ 2 / R$ 5', text: 'Reforço de Notas Baixas para Troco' },
                          { label: '💰 Suprimento Geral', text: 'Suprimento Geral de Caixa' },
                        ].map((preset) => (
                          <button
                            type="button"
                            key={preset.label}
                            onClick={() => setMovementReason(preset.text)}
                            className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                              movementReason === preset.text
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </>
                    )}
                  </div>

                  <input
                    type="text"
                    required
                    value={movementReason}
                    onChange={(e) => setMovementReason(e.target.value)}
                    placeholder={
                      movementType === 'sangria'
                        ? 'Ex: Pagamento fornecedor de leite, compra de frutas, etc.'
                        : 'Ex: Reforço de moedas e notas de troco'
                    }
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-amber-300 text-stone-800"
                  />
                </div>

                {/* Live Math Calculation Preview */}
                {activeShift && parseFloat(movementAmount.replace(',', '.')) > 0 && (
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1">
                    <div className="flex justify-between text-stone-600">
                      <span>Saldo Atual da Gaveta:</span>
                      <span>R$ {activeShift.expectedCash.toFixed(2).replace('.', ',')}</span>
                    </div>
                    <div className={`flex justify-between font-bold ${
                      movementType === 'sangria' ? 'text-amber-800' : 'text-emerald-800'
                    }`}>
                      <span>{movementType === 'sangria' ? '(-) Saída / Pagamento:' : '(+) Suprimento:'}</span>
                      <span>
                        {movementType === 'sangria' ? '- ' : '+ '}
                        R$ {parseFloat(movementAmount.replace(',', '.')).toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                    <div className="flex justify-between font-extrabold text-stone-900 pt-1 border-t border-stone-200">
                      <span>Novo Saldo Estimado:</span>
                      <span className={
                        movementType === 'sangria' && parseFloat(movementAmount.replace(',', '.')) > activeShift.expectedCash
                          ? 'text-rose-600'
                          : 'text-stone-900'
                      }>
                        R$ {(
                          movementType === 'sangria'
                            ? activeShift.expectedCash - parseFloat(movementAmount.replace(',', '.'))
                            : activeShift.expectedCash + parseFloat(movementAmount.replace(',', '.'))
                        ).toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                    {movementType === 'sangria' && parseFloat(movementAmount.replace(',', '.')) > activeShift.expectedCash && (
                      <p className="text-[11px] text-rose-600 font-bold pt-1">
                        ⚠️ Atenção: O valor da saída ultrapassa o dinheiro físico existente na gaveta!
                      </p>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs sm:text-sm font-semibold text-stone-600 hover:bg-stone-100 rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    id="btn-confirm-movement"
                    disabled={isSubmitting}
                    className={`px-5 py-2.5 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-2 ${
                      movementType === 'suprimento'
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : 'bg-amber-600 hover:bg-amber-700'
                    }`}
                  >
                    {movementType === 'suprimento' ? (
                      <ArrowDownRight className="w-4 h-4" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                    )}
                    {isSubmitting
                      ? 'Registrando...'
                      : movementType === 'sangria'
                        ? 'Confirmar Saída de Caixa'
                        : 'Confirmar Suprimento'}
                  </button>
                </div>

                {/* Histórico das movimentações deste turno */}
                {activeShift && activeShift.movements && activeShift.movements.length > 0 && (
                  <div className="pt-4 border-t border-stone-200">
                    <h4 className="text-xs font-bold text-stone-700 mb-2 flex items-center justify-between">
                      <span>Movimentações Realizadas Neste Turno ({activeShift.movements.length})</span>
                      <span className="text-[10px] text-stone-500 font-normal">Mais recentes primeiro</span>
                    </h4>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {[...activeShift.movements].reverse().map((mov) => (
                        <div
                          key={mov.id}
                          className="p-2.5 rounded-lg bg-stone-50 hover:bg-stone-100/80 border border-stone-200/70 text-xs flex items-center justify-between gap-2 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                              mov.type === 'sangria' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {mov.type === 'sangria' ? (
                                <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                              ) : (
                                <ArrowDownRight className="w-3.5 h-3.5 stroke-[2.5]" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-stone-800 truncate">{mov.reason}</p>
                              <p className="text-[10px] text-stone-500">
                                {formatBrazilDateTime(mov.timestamp)} • {mov.operatorName}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`font-mono font-bold ${
                              mov.type === 'sangria' ? 'text-amber-800' : 'text-emerald-800'
                            }`}>
                              {mov.type === 'sangria' ? '- ' : '+ '}R$ {mov.amount.toFixed(2).replace('.', ',')}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setLastMovementReceipt(mov);
                                setTimeout(() => window.print(), 50);
                              }}
                              title="Reimprimir comprovante desta movimentação"
                              className="p-1 text-stone-400 hover:text-stone-800 hover:bg-white rounded transition-colors cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </form>
            )}
          </div>
        )}

        {/* 3. Mode: CLOSE SHIFT */}
        {mode === 'close' && activeShift && (
          <form onSubmit={handleCloseShift} className="p-5 space-y-4">
            {/* Shift Summary Card */}
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200/80 space-y-2 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                <span className="text-stone-500">Operador:</span>
                <span className="font-semibold text-stone-800">{activeShift.operatorName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-600">Fundo de Troco Inicial:</span>
                <span className="font-semibold text-stone-800">
                  R$ {activeShift.initialCash.toFixed(2).replace('.', ',')}
                </span>
              </div>
              <div className="flex items-center justify-between text-emerald-700">
                <span className="font-medium">(+) Vendas em Dinheiro:</span>
                <span className="font-bold">
                  R$ {activeShift.totalCashSales.toFixed(2).replace('.', ',')}
                </span>
              </div>
              {/* Movements summary */}
              {activeShift.movements.length > 0 && (
                <>
                  <div className="flex items-center justify-between text-emerald-700">
                    <span>(+) Suprimentos de Troco:</span>
                    <span className="font-semibold">
                      R$ {activeShift.movements
                        .filter((m) => m.type === 'suprimento')
                        .reduce((a, b) => a + b.amount, 0)
                        .toFixed(2)
                        .replace('.', ',')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-amber-700">
                    <span>(-) Sangrias de Caixa:</span>
                    <span className="font-semibold">
                      -R$ {activeShift.movements
                        .filter((m) => m.type === 'sangria')
                        .reduce((a, b) => a + b.amount, 0)
                        .toFixed(2)
                        .replace('.', ',')}
                    </span>
                  </div>
                </>
              )}
              <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-sm">
                <span className="font-bold text-stone-900">Saldo Esperado em Gaveta (Dinheiro):</span>
                <span className="font-extrabold text-stone-900 text-base">
                  R$ {activeShift.expectedCash.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>

            {/* Other Payment Methods (Reference only) */}
            <div className="grid grid-cols-3 gap-2 text-[11px] text-stone-600 p-2.5 bg-stone-100/70 rounded-xl">
              <div>
                <span className="text-stone-400 block">Pix</span>
                <span className="font-bold text-stone-800">
                  R$ {activeShift.totalPixSales.toFixed(2).replace('.', ',')}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block">Cartão Débito</span>
                <span className="font-bold text-stone-800">
                  R$ {activeShift.totalDebitSales.toFixed(2).replace('.', ',')}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block">Cartão Crédito</span>
                <span className="font-bold text-stone-800">
                  R$ {activeShift.totalCreditSales.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>

            {/* Counted Cash Input */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Dinheiro Contado na Gaveta (R$)
              </label>
              <div className="relative">
                <span className="text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-sm">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={countedCash}
                  onChange={(e) => setCountedCash(e.target.value)}
                  placeholder="0,00"
                  className="w-full pl-11 pr-3 py-2.5 text-base rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-rose-400 text-stone-900 font-bold"
                />
              </div>

              {/* Difference Calculation Preview */}
              {countedCash !== '' && !isNaN(parseFloat(countedCash)) && (
                <div className="mt-2">
                  {(() => {
                    const diff = Number((parseFloat(countedCash) - activeShift.expectedCash).toFixed(2));
                    if (diff === 0) {
                      return (
                        <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Caixa exato! O valor contado confere perfeitamente com o esperado.</span>
                        </div>
                      );
                    } else if (diff > 0) {
                      return (
                        <div className="p-2.5 rounded-xl bg-sky-50 text-sky-800 border border-sky-200 text-xs font-semibold flex items-center justify-between">
                          <span>Sobra de Caixa:</span>
                          <span className="font-bold text-sky-900">
                            +R$ {diff.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      );
                    } else {
                      return (
                        <div className="p-2.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-semibold flex items-center justify-between">
                          <span>Falta de Caixa:</span>
                          <span className="font-bold text-rose-900">
                            -R$ {Math.abs(diff).toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      );
                    }
                  })()}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Observações de Fechamento (opcional)
              </label>
              <input
                type="text"
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
                placeholder="Ex: Turno da manhã encerrado sem pendências"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-rose-300 text-stone-800"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-stone-600 hover:bg-stone-100 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                id="btn-confirm-close-shift"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-2"
              >
                <Lock className="w-4 h-4" />
                {isSubmitting ? 'Encerrando...' : 'Confirmar Fechamento'}
              </button>
            </div>
          </form>
        )}

        {/* 4. Mode: RECEIPT VIEW */}
        {mode === 'receipt' && receiptShift && (
          <div className="p-5 space-y-4">
            <div 
              id="cash-shift-receipt-print" 
              className="p-5 bg-white rounded-2xl border border-stone-300 font-sans text-xs text-black space-y-3 shadow-sm"
            >
              <div className="text-center pb-3 border-b-2 border-dashed border-black">
                <h4 className="font-black text-sm tracking-wider uppercase">Eliza Sorvetes Artesanais</h4>
                <p className="text-xs font-bold text-black uppercase mt-0.5">Comprovante de Fechamento de Caixa</p>
                <p className="text-[11px] font-medium text-black">Turno: <b>{receiptShift.id}</b></p>
              </div>

              <div className="space-y-1 text-xs pb-2 border-b-2 border-dashed border-black text-black">
                <div className="flex justify-between">
                  <span className="font-semibold">Operador:</span>
                  <span className="font-extrabold">{receiptShift.operatorName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Abertura:</span>
                  <span className="font-medium">{formatBrazilDateTime(receiptShift.openedAt)}</span>
                </div>
                {receiptShift.closedAt && (
                  <div className="flex justify-between">
                    <span>Fechamento:</span>
                    <span className="font-medium">{formatBrazilDateTime(receiptShift.closedAt)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className={`font-black ${receiptShift.status === 'aberto' ? 'text-emerald-700' : 'text-black'}`}>
                    {receiptShift.status === 'aberto' ? 'EM ABERTO' : 'FECHADO'}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs pb-2 border-b-2 border-dashed border-black text-black">
                <div className="flex justify-between">
                  <span>Fundo de Troco Inicial:</span>
                  <span className="font-extrabold">R$ {receiptShift.initialCash.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Vendas em Dinheiro:</span>
                  <span className="font-extrabold">R$ {receiptShift.totalCashSales.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Vendas em Pix:</span>
                  <span className="font-semibold">R$ {receiptShift.totalPixSales.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Vendas em Cartão Débito:</span>
                  <span className="font-semibold">R$ {receiptShift.totalDebitSales.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Vendas em Cartão Crédito:</span>
                  <span className="font-semibold">R$ {receiptShift.totalCreditSales.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-black font-black text-sm">
                  <span>FATURAMENTO TOTAL:</span>
                  <span>R$ {receiptShift.totalSalesAmount.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between text-black text-[11px] font-medium">
                  <span>Vendas Realizadas:</span>
                  <span className="font-bold">{receiptShift.totalSalesCount} transações</span>
                </div>
              </div>

              {/* Cash Reconciliation */}
              <div className="space-y-1.5 text-xs pt-1 text-black">
                <div className="flex justify-between font-black">
                  <span>Saldo Esperado em Gaveta:</span>
                  <span>R$ {receiptShift.expectedCash.toFixed(2).replace('.', ',')}</span>
                </div>
                {receiptShift.countedCash !== undefined && (
                  <div className="flex justify-between font-black">
                    <span>Dinheiro Contado:</span>
                    <span>R$ {receiptShift.countedCash.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}
                {receiptShift.difference !== undefined && (
                  <div className="flex justify-between font-black text-xs pt-1 border-t border-black">
                    <span>DIFERENÇA:</span>
                    <span className={receiptShift.difference < 0 ? 'text-rose-700' : receiptShift.difference > 0 ? 'text-sky-700' : 'text-emerald-700'}>
                      {receiptShift.difference > 0 && '+'}
                      R$ {receiptShift.difference.toFixed(2).replace('.', ',')}
                      {receiptShift.difference === 0 ? ' (Bateu Exato)' : receiptShift.difference < 0 ? ' (Falta)' : ' (Sobra)'}
                    </span>
                  </div>
                )}
              </div>

              {receiptShift.notes && (
                <div className="pt-2 border-t-2 border-dashed border-black text-xs text-black">
                  <span className="font-bold block">Obs:</span>
                  <span>{receiptShift.notes}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                id="btn-print-shift-receipt"
                onClick={handlePrint}
                className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs sm:text-sm font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-stone-600" />
                Imprimir Comprovante
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs sm:text-sm font-bold cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Portal receipt directly to #print-root for isolated single-page print */}
      {mode === 'receipt' && receiptShift && typeof document !== 'undefined' && document.getElementById('print-root') && createPortal(
        <div className="pos-shift-receipt-print">
          <div className="text-center pb-3 border-b-2 border-dashed border-black">
            <h4 className="font-black text-sm tracking-wider uppercase">Eliza Sorvetes Artesanais</h4>
            <p className="text-xs font-bold text-black uppercase mt-0.5">Comprovante de Fechamento de Caixa</p>
            <p className="text-[11px] font-medium text-black">Turno: <b>{receiptShift.id}</b></p>
          </div>

          <div className="space-y-1 text-xs pb-2 border-b-2 border-dashed border-black text-black">
            <div className="flex justify-between">
              <span className="font-semibold">Operador:</span>
              <span className="font-extrabold">{receiptShift.operatorName}</span>
            </div>
            <div className="flex justify-between">
              <span>Abertura:</span>
              <span className="font-medium">{formatBrazilDateTime(receiptShift.openedAt)}</span>
            </div>
            {receiptShift.closedAt && (
              <div className="flex justify-between">
                <span>Fechamento:</span>
                <span className="font-medium">{formatBrazilDateTime(receiptShift.closedAt)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Status:</span>
              <span className="font-black">
                {receiptShift.status === 'aberto' ? 'EM ABERTO' : 'FECHADO'}
              </span>
            </div>
          </div>

          <div className="space-y-1.5 text-xs pb-2 border-b-2 border-dashed border-black text-black">
            <div className="flex justify-between">
              <span>Fundo de Troco Inicial:</span>
              <span className="font-extrabold">R$ {receiptShift.initialCash.toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="flex justify-between">
              <span>Vendas em Dinheiro:</span>
              <span className="font-extrabold">R$ {receiptShift.totalCashSales.toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="flex justify-between">
              <span>Vendas em Pix:</span>
              <span className="font-semibold">R$ {receiptShift.totalPixSales.toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="flex justify-between">
              <span>Vendas em Cartão Débito:</span>
              <span className="font-semibold">R$ {receiptShift.totalDebitSales.toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="flex justify-between">
              <span>Vendas em Cartão Crédito:</span>
              <span className="font-semibold">R$ {receiptShift.totalCreditSales.toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="flex justify-between pt-1.5 border-t border-black font-black text-sm">
              <span>FATURAMENTO TOTAL:</span>
              <span>R$ {receiptShift.totalSalesAmount.toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="flex justify-between text-black text-[11px] font-medium">
              <span>Vendas Realizadas:</span>
              <span className="font-bold">{receiptShift.totalSalesCount} transações</span>
            </div>
          </div>

          <div className="space-y-1.5 text-xs pt-1 text-black">
            <div className="flex justify-between font-black">
              <span>Saldo Esperado em Gaveta:</span>
              <span>R$ {receiptShift.expectedCash.toFixed(2).replace('.', ',')}</span>
            </div>
            {receiptShift.countedCash !== undefined && (
              <div className="flex justify-between font-black">
                <span>Dinheiro Contado:</span>
                <span>R$ {receiptShift.countedCash.toFixed(2).replace('.', ',')}</span>
              </div>
            )}
            {receiptShift.difference !== undefined && (
              <div className="flex justify-between font-black text-xs pt-1 border-t border-black">
                <span>DIFERENÇA:</span>
                <span>
                  {receiptShift.difference > 0 && '+'}
                  R$ {receiptShift.difference.toFixed(2).replace('.', ',')}
                  {receiptShift.difference === 0 ? ' (Bateu Exato)' : receiptShift.difference < 0 ? ' (Falta)' : ' (Sobra)'}
                </span>
              </div>
            )}
          </div>

          {receiptShift.notes && (
            <div className="pt-2 border-t-2 border-dashed border-black text-xs text-black">
              <span className="font-bold block">Obs:</span>
              <span>{receiptShift.notes}</span>
            </div>
          )}
        </div>,
        document.getElementById('print-root')!
      )}

      {/* Portal movement voucher directly to #print-root for single-page thermal print */}
      {lastMovementReceipt && typeof document !== 'undefined' && document.getElementById('print-root') && createPortal(
        <div className="pos-shift-receipt-print">
          <div className="text-center pb-3 border-b-2 border-dashed border-black">
            <h4 className="font-black text-sm tracking-wider uppercase">Eliza Sorvetes Artesanais</h4>
            <p className="text-xs font-black text-black uppercase mt-0.5">
              {lastMovementReceipt.type === 'sangria' ? 'Comprovante de Saída de Caixa' : 'Comprovante de Entrada de Caixa'}
            </p>
            <p className="text-[11px] font-bold text-black uppercase">
              {lastMovementReceipt.type === 'sangria' ? 'Pagamento com Dinheiro / Sangria' : 'Suprimento de Troco'}
            </p>
            <p className="text-[10px] text-stone-600">ID: {lastMovementReceipt.id}</p>
          </div>

          <div className="space-y-1 text-xs py-2 border-b-2 border-dashed border-black text-black">
            <div className="flex justify-between">
              <span className="font-semibold">Data e Hora:</span>
              <span className="font-extrabold">{formatBrazilDateTime(lastMovementReceipt.timestamp)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Operador do Caixa:</span>
              <span className="font-extrabold">{lastMovementReceipt.operatorName}</span>
            </div>
            {activeShift && (
              <div className="flex justify-between">
                <span>Turno de Caixa:</span>
                <span className="font-medium">{activeShift.id}</span>
              </div>
            )}
          </div>

          <div className="py-2.5 border-b-2 border-dashed border-black space-y-1.5 text-black">
            <div className="flex justify-between items-center text-sm font-black">
              <span>{lastMovementReceipt.type === 'sangria' ? 'VALOR PAGO / RETIRADO:' : 'VALOR RECEBIDO:'}</span>
              <span>R$ {lastMovementReceipt.amount.toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="text-xs">
              <span className="font-bold">Motivo / Finalidade:</span>
              <p className="font-medium mt-0.5">{lastMovementReceipt.reason}</p>
            </div>
          </div>

          <div className="space-y-1 text-xs py-2 border-b-2 border-dashed border-black text-black">
            {lastMovementReceipt.previousExpectedCash !== undefined && (
              <div className="flex justify-between text-[11px]">
                <span>Saldo Anterior da Gaveta:</span>
                <span>R$ {lastMovementReceipt.previousExpectedCash.toFixed(2).replace('.', ',')}</span>
              </div>
            )}
            {lastMovementReceipt.newExpectedCash !== undefined && (
              <div className="flex justify-between font-bold">
                <span>Saldo Restante na Gaveta:</span>
                <span>R$ {lastMovementReceipt.newExpectedCash.toFixed(2).replace('.', ',')}</span>
              </div>
            )}
          </div>

          {lastMovementReceipt.type === 'sangria' && (
            <div className="pt-6 pb-2 text-center text-xs text-black">
              <div className="w-52 mx-auto border-b border-black mb-1"></div>
              <p className="font-bold text-[11px]">Assinatura de quem recebeu o valor</p>
              <p className="text-[10px] text-stone-600 mt-0.5">Nome / Doc: _________________________</p>
            </div>
          )}
        </div>,
        document.getElementById('print-root')!
      )}
    </div>
  );
};
