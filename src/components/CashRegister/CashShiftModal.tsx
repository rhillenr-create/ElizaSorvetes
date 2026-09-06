import React, { useState } from 'react';
import { usePos } from '../../context/PosContext';
import { CashShift, CashMovementType } from '../../types';
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
    currentUser 
  } = usePos();

  const [mode, setMode] = useState<CashModalMode>(initialMode);

  // Form states
  const [initialCash, setInitialCash] = useState<string>('100.00');
  const [operatorName, setOperatorName] = useState<string>(
    operatorUser?.name || currentUser?.displayName || 'Eliza'
  );
  const [movementType, setMovementType] = useState<CashMovementType>('suprimento');
  const [movementAmount, setMovementAmount] = useState<string>('');
  const [movementReason, setMovementReason] = useState<string>('');
  const [countedCash, setCountedCash] = useState<string>('');
  const [closingNotes, setClosingNotes] = useState<string>('');
  const [lastClosedShift, setLastClosedShift] = useState<CashShift | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Update mode when prop changes
  React.useEffect(() => {
    setMode(initialMode);
    setErrorMsg(null);
    if (initialMode === 'close' && activeShift) {
      setCountedCash(activeShift.expectedCash.toFixed(2));
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

  // Handler for Suprimento / Sangria
  const handleAddMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const amount = parseFloat(movementAmount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      setErrorMsg('Informe um valor válido maior que zero.');
      return;
    }

    if (movementType === 'sangria' && activeShift && amount > activeShift.expectedCash) {
      setErrorMsg(`A sangria (R$ ${amount.toFixed(2)}) não pode ser maior que o saldo em dinheiro em gaveta (R$ ${activeShift.expectedCash.toFixed(2)}).`);
      return;
    }

    try {
      setIsSubmitting(true);
      await addCashMovement(
        movementType, 
        amount, 
        movementReason.trim() || (movementType === 'suprimento' ? 'Suprimento de troco' : 'Sangria de caixa')
      );
      setMovementAmount('');
      setMovementReason('');
      onClose();
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
                {mode === 'suprimento' && 'Suprimento de Caixa (Entrada)'}
                {mode === 'sangria' && 'Sangria de Caixa (Retirada)'}
                {mode === 'receipt' && 'Comprovante do Turno de Caixa'}
              </h3>
              <p className="text-xs text-stone-500">
                {mode === 'open' && 'Inicie o turno com o fundo de troco inicial'}
                {mode === 'close' && 'Confira os valores em dinheiro e encerre o turno'}
                {mode === 'suprimento' && 'Adicione dinheiro à gaveta para reforço de troco'}
                {mode === 'sangria' && 'Retire dinheiro da gaveta com motivo registrado'}
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

        {/* 2. Mode: SUPRIMENTO / SANGRIA */}
        {(mode === 'suprimento' || mode === 'sangria') && (
          <form onSubmit={handleAddMovement} className="p-5 space-y-4">
            <div className="flex gap-2 p-1 bg-stone-100 rounded-xl">
              <button
                type="button"
                onClick={() => { setMovementType('suprimento'); setMode('suprimento'); }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  movementType === 'suprimento'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <ArrowDownRight className="w-3.5 h-3.5" />
                Suprimento (Entrada)
              </button>
              <button
                type="button"
                onClick={() => { setMovementType('sangria'); setMode('sangria'); }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  movementType === 'sangria'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                Sangria (Retirada)
              </button>
            </div>

            {activeShift && (
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 flex items-center justify-between text-xs">
                <span className="text-stone-600 font-medium">Saldo Atual em Dinheiro na Gaveta:</span>
                <span className="font-bold text-stone-900 text-sm">
                  R$ {activeShift.expectedCash.toFixed(2).replace('.', ',')}
                </span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Valor da Movimentação (R$)
              </label>
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
                  className="w-full pl-11 pr-3 py-2.5 text-base rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-rose-300 text-stone-900 font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Motivo / Justificativa
              </label>
              <input
                type="text"
                required
                value={movementReason}
                onChange={(e) => setMovementReason(e.target.value)}
                placeholder={
                  movementType === 'suprimento'
                    ? 'Ex: Reforço de moedas e troco'
                    : 'Ex: Pagamento de fornecedor de leite / Sangria de segurança'
                }
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
                  <ArrowUpRight className="w-4 h-4" />
                )}
                {isSubmitting ? 'Registrando...' : `Confirmar ${movementType === 'suprimento' ? 'Suprimento' : 'Sangria'}`}
              </button>
            </div>
          </form>
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
              className="p-5 bg-stone-50 rounded-2xl border border-stone-200 font-mono text-xs text-stone-800 space-y-3 shadow-inner"
            >
              <div className="text-center pb-3 border-b border-dashed border-stone-300">
                <h4 className="font-bold text-sm tracking-wider uppercase">Eliza Sorvetes Artesanais</h4>
                <p className="text-[10px] text-stone-500">COMPROVANTE DE FECHAMENTO DE CAIXA</p>
                <p className="text-[10px] text-stone-500">Turno: {receiptShift.id}</p>
              </div>

              <div className="space-y-1 text-[11px] pb-2 border-b border-dashed border-stone-300">
                <div className="flex justify-between">
                  <span className="text-stone-500">Operador:</span>
                  <span className="font-bold">{receiptShift.operatorName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Abertura:</span>
                  <span>{formatBrazilDateTime(receiptShift.openedAt)}</span>
                </div>
                {receiptShift.closedAt && (
                  <div className="flex justify-between">
                    <span className="text-stone-500">Fechamento:</span>
                    <span>{formatBrazilDateTime(receiptShift.closedAt)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-stone-500">Status:</span>
                  <span className={`font-bold ${receiptShift.status === 'aberto' ? 'text-emerald-700' : 'text-stone-800'}`}>
                    {receiptShift.status === 'aberto' ? 'EM ABERTO' : 'FECHADO'}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 text-[11px] pb-2 border-b border-dashed border-stone-300">
                <div className="flex justify-between">
                  <span>Fundo de Troco Inicial:</span>
                  <span className="font-bold">R$ {receiptShift.initialCash.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Vendas em Dinheiro:</span>
                  <span className="font-bold">R$ {receiptShift.totalCashSales.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Vendas em Pix:</span>
                  <span>R$ {receiptShift.totalPixSales.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Vendas em Cartão Débito:</span>
                  <span>R$ {receiptShift.totalDebitSales.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Vendas em Cartão Crédito:</span>
                  <span>R$ {receiptShift.totalCreditSales.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-stone-200 font-bold">
                  <span>FATURAMENTO TOTAL:</span>
                  <span>R$ {receiptShift.totalSalesAmount.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between text-stone-500 text-[10px]">
                  <span>Vendas Realizadas:</span>
                  <span>{receiptShift.totalSalesCount} transações</span>
                </div>
              </div>

              {/* Cash Reconciliation */}
              <div className="space-y-1.5 text-[11px] pt-1">
                <div className="flex justify-between font-bold">
                  <span>Saldo Esperado em Gaveta:</span>
                  <span>R$ {receiptShift.expectedCash.toFixed(2).replace('.', ',')}</span>
                </div>
                {receiptShift.countedCash !== undefined && (
                  <div className="flex justify-between font-bold">
                    <span>Dinheiro Contado:</span>
                    <span>R$ {receiptShift.countedCash.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}
                {receiptShift.difference !== undefined && (
                  <div className="flex justify-between font-bold text-xs pt-1 border-t border-stone-200">
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
                <div className="pt-2 border-t border-dashed border-stone-300 text-[10px] text-stone-600">
                  <span className="font-semibold block">Obs:</span>
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
    </div>
  );
};
