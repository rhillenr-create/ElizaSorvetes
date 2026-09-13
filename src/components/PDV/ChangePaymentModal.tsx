import React, { useState, useEffect } from 'react';
import { Sale, PaymentMethod } from '../../types';
import { usePos } from '../../context/PosContext';
import { formatBrazilDateTime } from '../../utils/dateUtils';
import { 
  CreditCard, 
  Banknote, 
  QrCode, 
  X, 
  Check, 
  AlertCircle, 
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

interface ChangePaymentModalProps {
  isOpen: boolean;
  sale: Sale | null;
  onClose: () => void;
  onSuccess?: (updatedSale: Sale) => void;
}

export const ChangePaymentModal: React.FC<ChangePaymentModalProps> = ({
  isOpen,
  sale,
  onClose,
  onSuccess
}) => {
  const { updateSalePaymentMethod } = usePos();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (sale) {
      setSelectedMethod(sale.paymentMethod);
      setErrorMsg(null);
    }
  }, [sale, isOpen]);

  if (!isOpen || !sale) return null;

  const paymentOptions: {
    id: PaymentMethod;
    label: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    bgHover: string;
    activeBorder: string;
  }[] = [
    {
      id: 'dinheiro',
      label: 'Dinheiro (Espécie)',
      description: 'Entrada na gaveta de dinheiro do caixa',
      icon: <Banknote className="w-5 h-5 text-emerald-600" />,
      color: 'text-emerald-700',
      bgHover: 'hover:bg-emerald-50/70',
      activeBorder: 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-400/30'
    },
    {
      id: 'pix',
      label: 'Pix Instantâneo',
      description: 'Transferência via QR Code / Chave Pix',
      icon: <QrCode className="w-5 h-5 text-teal-600" />,
      color: 'text-teal-700',
      bgHover: 'hover:bg-teal-50/70',
      activeBorder: 'border-teal-500 bg-teal-50/40 ring-2 ring-teal-400/30'
    },
    {
      id: 'cartao_debito',
      label: 'Cartão de Débito',
      description: 'Cobrança no terminal POS / maquininha débito',
      icon: <CreditCard className="w-5 h-5 text-sky-600" />,
      color: 'text-sky-700',
      bgHover: 'hover:bg-sky-50/70',
      activeBorder: 'border-sky-500 bg-sky-50/40 ring-2 ring-sky-400/30'
    },
    {
      id: 'cartao_credito',
      label: 'Cartão de Crédito',
      description: 'Cobrança no terminal POS / maquininha crédito',
      icon: <CreditCard className="w-5 h-5 text-indigo-600" />,
      color: 'text-indigo-700',
      bgHover: 'hover:bg-indigo-50/70',
      activeBorder: 'border-indigo-500 bg-indigo-50/40 ring-2 ring-indigo-400/30'
    }
  ];

  const handleConfirm = async () => {
    if (!selectedMethod) return;
    if (selectedMethod === sale.paymentMethod) {
      onClose();
      return;
    }

    try {
      setIsSaving(true);
      setErrorMsg(null);
      const res = updateSalePaymentMethod(sale.id, selectedMethod);
      if (res.success && res.updatedSale) {
        if (onSuccess) {
          onSuccess(res.updatedSale);
        }
        onClose();
      } else {
        setErrorMsg(res.error || 'Não foi possível alterar a forma de pagamento.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro inesperado ao alterar forma de pagamento.');
    } finally {
      setIsSaving(false);
    }
  };

  const isCurrent = selectedMethod === sale.paymentMethod;

  return (
    <div 
      id="change-payment-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-2xl max-w-md w-full space-y-4 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-800 font-['Quicksand',sans-serif]">
                Alterar Forma de Pagamento
              </h3>
              <p className="text-xs text-stone-400 font-mono">
                Venda #{sale.id} • {formatBrazilDateTime(sale.timestamp)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sale Summary Banner (Valor inalterado) */}
        <div className="bg-stone-50 rounded-2xl p-3.5 border border-stone-200/80 flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">
              Valor Total da Venda (Inalterado)
            </span>
            <div className="text-xl font-black text-stone-900 font-mono">
              R$ {sale.total.toFixed(2).replace('.', ',')}
            </div>
            <span className="text-[11px] text-stone-500">
              Cliente: {sale.customerName || 'Consumidor Final'}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block mb-1">
              Método Atual
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-200 text-stone-800 text-xs font-semibold">
              {sale.paymentMethod === 'dinheiro' && '💵 Dinheiro'}
              {sale.paymentMethod === 'pix' && '⚡ Pix'}
              {sale.paymentMethod === 'cartao_debito' && '💳 Débito'}
              {sale.paymentMethod === 'cartao_credito' && '💳 Crédito'}
            </span>
          </div>
        </div>

        {/* Informational Guidance */}
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/70 text-[11px] text-amber-900">
          <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p>
            O valor total (<strong>R$ {sale.total.toFixed(2).replace('.', ',')}</strong>) e os itens da venda permanecerão <strong>estritamente intactos</strong>. Apenas o método de cobrança e os relatórios de caixa serão recalculados no banco de dados.
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-semibold">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Options List */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-stone-700 block">
            Selecione a nova forma de pagamento:
          </label>
          <div className="grid grid-cols-1 gap-2">
            {paymentOptions.map((opt) => {
              const isSelected = selectedMethod === opt.id;
              const isOriginallyCurrent = sale.paymentMethod === opt.id;

              return (
                <button
                  type="button"
                  key={opt.id}
                  id={`btn-change-pay-${opt.id}`}
                  onClick={() => setSelectedMethod(opt.id)}
                  className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                    isSelected ? opt.activeBorder : `border-stone-200 bg-white ${opt.bgHover}`
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-stone-100/80">
                      {opt.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-stone-800">
                          {opt.label}
                        </span>
                        {isOriginallyCurrent && (
                          <span className="px-2 py-0.5 rounded-full bg-stone-200 text-stone-700 text-[10px] font-semibold">
                            Atual
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-stone-400 block">
                        {opt.description}
                      </span>
                    </div>
                  </div>

                  <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                    isSelected 
                      ? 'bg-rose-500 border-rose-500 text-white' 
                      : 'border-stone-300 bg-white'
                  }`}>
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-stone-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            id="btn-confirm-change-payment"
            onClick={handleConfirm}
            disabled={isSaving || isCurrent || !selectedMethod}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer ${
              isCurrent || !selectedMethod
                ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-emerald-600/20'
            }`}
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Atualizando...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Salvar Nova Forma</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
