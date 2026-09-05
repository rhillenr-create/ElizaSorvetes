import React, { useState, useEffect } from 'react';
import { usePos } from '../../context/PosContext';
import { PaymentMethod } from '../../types';
import { PixModal } from './PixModal';
import { 
  Trash2, 
  Plus, 
  Minus, 
  QrCode, 
  CreditCard, 
  Banknote, 
  AlertCircle,
  Check,
  ShoppingBag,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  User,
  ExternalLink,
  Smartphone
} from 'lucide-react';

interface CartSidebarProps {
  onSaleCompleted: () => void;
}

export const CartSidebar: React.FC<CartSidebarProps> = ({ onSaleCompleted }) => {
  const {
    cart,
    cartSubtotal,
    cartTotalCount,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    finalizeSale
  } = usePos();

  const [activeCheckoutTab, setActiveCheckoutTab] = useState<'cliente' | 'pagamento'>('cliente');
  const [customerName, setCustomerName] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('dinheiro');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isPixModalOpen, setIsPixModalOpen] = useState<boolean>(false);

  const customerPresets = [
    'Consumidor Final',
    'Cliente Balcão',
    'Para Viagem',
    'Mesa 01',
    'Mesa 02'
  ];

  // Auto-fill exact value when switching to cash or when total changes if empty
  const numericReceived = parseFloat(cashReceived.replace(',', '.')) || 0;
  const change = numericReceived > cartSubtotal ? numericReceived - cartSubtotal : 0;
  const remaining = cartSubtotal > numericReceived ? cartSubtotal - numericReceived : 0;

  useEffect(() => {
    setErrorMsg(null);
  }, [paymentMethod, cashReceived, cartSubtotal, customerName]);

  const handleQuickCashPreset = (value: number) => {
    setCashReceived(value.toFixed(2));
  };

  const handleClearCart = () => {
    clearCart();
    setCustomerName('');
    setActiveCheckoutTab('cliente');
  };

  const handleConfirmPixSale = () => {
    const finalCustomer = customerName.trim() || 'Consumidor Final';
    const result = finalizeSale('pix', undefined, finalCustomer);
    if (result.success) {
      setIsPixModalOpen(false);
      setCashReceived('');
      setCustomerName('');
      setActiveCheckoutTab('cliente');
      onSaleCompleted();
    } else if (result.error) {
      setErrorMsg(result.error);
      setIsPixModalOpen(false);
    }
  };

  const handleFinishSale = () => {
    if (cart.length === 0) return;

    if (paymentMethod === 'dinheiro') {
      if (!cashReceived || numericReceived < cartSubtotal) {
        setErrorMsg(`Valor em dinheiro insuficiente. Faltam R$ ${remaining.toFixed(2).replace('.', ',')}`);
        return;
      }
    }

    const finalCustomer = customerName.trim() || 'Consumidor Final';

    setIsProcessing(true);
    setTimeout(() => {
      const result = finalizeSale(
        paymentMethod, 
        paymentMethod === 'dinheiro' ? numericReceived : undefined,
        finalCustomer
      );
      setIsProcessing(false);

      if (result.success) {
        setCashReceived('');
        setCustomerName('');
        setActiveCheckoutTab('cliente');
        onSaleCompleted();
      } else if (result.error) {
        setErrorMsg(result.error);
      }
    }, 400);
  };

  const handlePrimaryCheckoutAction = () => {
    if (cart.length === 0) return;

    // Pix na Maquininha: conclui direto sem abrir QR Code na tela
    handleFinishSale();
  };

  return (
    <aside className="bg-white rounded-3xl border border-rose-100/90 shadow-sm flex flex-col h-full overflow-hidden">
      {/* Sidebar Header */}
      <div className="p-4 bg-gradient-to-r from-amber-50/60 to-rose-50/60 border-b border-rose-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-sm">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-stone-800 text-sm sm:text-base font-['Quicksand',sans-serif]">
              Comanda / Pedido
            </h2>
            <p className="text-[11px] text-stone-500">
              {cartTotalCount} {cartTotalCount === 1 ? 'item' : 'itens'} no carrinho
            </p>
          </div>
        </div>

        {cart.length > 0 && (
          <button
            id="clear-cart-btn"
            onClick={handleClearCart}
            className="text-xs text-stone-400 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50 cursor-pointer flex items-center gap-1"
            title="Limpar tudo"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Limpar</span>
          </button>
        )}
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400">
            <div className="w-16 h-16 rounded-full bg-rose-50/80 border border-rose-100 flex items-center justify-center text-2xl mb-3 text-rose-300">
              🍦
            </div>
            <p className="font-medium text-sm text-stone-600">Carrinho vazio</p>
            <p className="text-xs text-stone-400 mt-1 max-w-[200px]">
              Selecione os sorvetes, picolés ou bebidas ao lado para iniciar a venda.
            </p>
          </div>
        ) : (
          cart.map((item) => (
            <div
              key={item.cartId}
              id={`cart-item-${item.cartId}`}
              className="p-3 bg-stone-50/60 rounded-2xl border border-stone-200/70 hover:border-rose-200 transition-all flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-stone-800 text-xs sm:text-sm truncate">
                    {item.productName}
                  </h4>
                  <p className="text-[11px] text-stone-400 font-mono">
                    R$ {item.price.toFixed(2).replace('.', ',')} un.
                  </p>
                </div>

                <button
                  id={`remove-item-${item.cartId}`}
                  onClick={() => removeFromCart(item.cartId)}
                  className="text-stone-400 hover:text-rose-500 p-1 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Remover item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Chosen flavors display */}
              {item.selectedFlavors.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {item.selectedFlavors.map((flavor, fIdx) => (
                    <span
                      key={fIdx}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-rose-200/80 text-rose-900 font-medium"
                    >
                      {flavor}
                    </span>
                  ))}
                </div>
              )}

              {/* Quantity controls and item subtotal */}
              <div className="flex items-center justify-between pt-1 border-t border-stone-200/50">
                <div className="flex items-center gap-1.5 bg-white rounded-lg border border-stone-200 p-0.5 shadow-2xs">
                  <button
                    id={`qty-minus-${item.cartId}`}
                    onClick={() => updateCartQuantity(item.cartId, -1)}
                    className="w-6 h-6 rounded-md hover:bg-stone-100 flex items-center justify-center text-stone-600 transition-colors cursor-pointer"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center text-xs font-bold text-stone-800">
                    {item.quantity}
                  </span>
                  <button
                    id={`qty-plus-${item.cartId}`}
                    onClick={() => updateCartQuantity(item.cartId, 1)}
                    className="w-6 h-6 rounded-md hover:bg-stone-100 flex items-center justify-center text-stone-600 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <div className="text-right">
                  <span className="font-extrabold text-stone-800 text-sm">
                    R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Checkout and Payment Section */}
      {cart.length > 0 && (
        <div className="p-3.5 sm:p-4 bg-stone-50/95 border-t border-rose-100 space-y-3">
          {/* Subtotal & Total display */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-stone-500">
              <span>Subtotal ({cartTotalCount} {cartTotalCount === 1 ? 'item' : 'itens'})</span>
              <span className="font-mono">R$ {cartSubtotal.toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="flex justify-between items-baseline pt-1 border-t border-stone-200/60">
              <span className="font-bold text-stone-800 text-xs sm:text-sm">Total a Pagar</span>
              <span className="font-extrabold text-xl sm:text-2xl text-rose-600 font-mono">
                R$ {cartSubtotal.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>

          {/* Steps / Tabs: 1. Cliente | 2. Pagamento */}
          <div className="flex p-1 bg-stone-200/70 rounded-2xl gap-1">
            <button
              type="button"
              id="tab-step-cliente"
              onClick={() => setActiveCheckoutTab('cliente')}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeCheckoutTab === 'cliente'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <User className="w-3.5 h-3.5 text-rose-500" />
              <span>1. Cliente</span>
              {customerName.trim() && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              )}
            </button>

            <button
              type="button"
              id="tab-step-pagamento"
              onClick={() => setActiveCheckoutTab('pagamento')}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeCheckoutTab === 'pagamento'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5 text-rose-500" />
              <span>2. Pagamento</span>
            </button>
          </div>

          {/* TAB 1: IDENTIFICAÇÃO DO CLIENTE */}
          {activeCheckoutTab === 'cliente' && (
            <div className="space-y-2.5 animate-in fade-in duration-150">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label 
                    htmlFor="customer-name-input" 
                    className="block text-[11px] font-semibold text-stone-600 uppercase tracking-wider"
                  >
                    Nome do Cliente / Identificação
                  </label>
                  {customerName && (
                    <button
                      type="button"
                      onClick={() => setCustomerName('')}
                      className="text-[10px] text-stone-400 hover:text-rose-600 cursor-pointer"
                    >
                      Limpar
                    </button>
                  )}
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <User className="w-4 h-4 text-rose-400" />
                  </div>
                  <input
                    type="text"
                    id="customer-name-input"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setActiveCheckoutTab('pagamento');
                      }
                    }}
                    placeholder="Digite o nome do cliente (ex: Maria, João)..."
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border border-rose-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 font-medium text-stone-800 placeholder:text-stone-400 shadow-2xs"
                    autoFocus
                  />
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div>
                <span className="text-[10px] text-stone-400 block mb-1">Atalhos rápidos:</span>
                <div className="flex flex-wrap gap-1">
                  {customerPresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      id={`preset-customer-${preset.toLowerCase().replace(/\s+/g, '-')}`}
                      onClick={() => setCustomerName(preset)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                        customerName === preset
                          ? 'bg-rose-500 text-white font-semibold shadow-xs'
                          : 'bg-white hover:bg-stone-100 text-stone-600 border border-stone-200'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/60 text-[11px] text-amber-900 flex items-start gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <span>O nome do cliente aparecerá no cupom impresso e no histórico das vendas.</span>
              </div>

              {/* Advance to Payment Tab Button */}
              <button
                type="button"
                id="advance-to-payment-btn"
                onClick={() => setActiveCheckoutTab('pagamento')}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-rose-200 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                <span>Avançar para Pagamento</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* TAB 2: FORMA DE PAGAMENTO & CONCLUSÃO */}
          {activeCheckoutTab === 'pagamento' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              {/* Customer summary pill with change button */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-rose-200/80 text-xs shadow-2xs">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <User className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span className="text-stone-500 text-[11px]">Cliente:</span>
                  <span className="font-bold text-stone-800 truncate">
                    {customerName.trim() || 'Consumidor Final'}
                  </span>
                </div>
                <button
                  type="button"
                  id="change-customer-btn"
                  onClick={() => setActiveCheckoutTab('cliente')}
                  className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold cursor-pointer underline hover:no-underline ml-2 shrink-0"
                >
                  Alterar
                </button>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                  Forma de Pagamento
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    id="pay-dinheiro"
                    onClick={() => setPaymentMethod('dinheiro')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      paymentMethod === 'dinheiro'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs ring-1 ring-emerald-300'
                        : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Dinheiro</span>
                  </button>

                  <button
                    type="button"
                    id="pay-pix"
                    onClick={() => setPaymentMethod('pix')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      paymentMethod === 'pix'
                        ? 'bg-teal-50 border-teal-300 text-teal-800 shadow-xs ring-1 ring-teal-300'
                        : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5 text-teal-600" />
                    <span>Pix (Maquininha)</span>
                  </button>

                  <button
                    type="button"
                    id="pay-cartao-debito"
                    onClick={() => setPaymentMethod('cartao_debito')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      paymentMethod === 'cartao_debito'
                        ? 'bg-sky-50 border-sky-300 text-sky-800 shadow-xs ring-1 ring-sky-300'
                        : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5 text-sky-600" />
                    <span>Débito</span>
                  </button>

                  <button
                    type="button"
                    id="pay-cartao-credito"
                    onClick={() => setPaymentMethod('cartao_credito')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      paymentMethod === 'cartao_credito'
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-800 shadow-xs ring-1 ring-indigo-300'
                        : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Crédito</span>
                  </button>
                </div>
              </div>

              {/* Conditional Payment Details */}
              {paymentMethod === 'dinheiro' && (
                <div className="p-3 bg-white rounded-2xl border border-emerald-200/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-stone-700">Valor Recebido (R$):</span>
                    <input
                      type="number"
                      id="cash-received-input"
                      step="0.50"
                      min="0"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      placeholder="0,00"
                      className="w-24 px-2 py-1 text-right font-mono font-bold text-sm bg-emerald-50/50 border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                  </div>

                  {/* Quick Cash Buttons */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    <button
                      type="button"
                      onClick={() => handleQuickCashPreset(cartSubtotal)}
                      className="px-2 py-1 text-[11px] font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md cursor-pointer"
                    >
                      Exato
                    </button>
                    {[10, 20, 50, 100].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleQuickCashPreset(val)}
                        className="px-2 py-1 text-[11px] font-medium bg-emerald-100/70 hover:bg-emerald-200 text-emerald-800 rounded-md cursor-pointer"
                      >
                        R$ {val}
                      </button>
                    ))}
                  </div>

                  {/* Automatic Change Calculation Display */}
                  {numericReceived > 0 && (
                    <div
                      className={`p-2 rounded-xl text-xs flex items-center justify-between font-medium ${
                        change >= 0 && numericReceived >= cartSubtotal
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                          : 'bg-amber-100 text-amber-900 border border-amber-200'
                      }`}
                    >
                      <span>{numericReceived >= cartSubtotal ? 'Troco a devolver:' : 'Ainda faltam:'}</span>
                      <span className="font-bold font-mono text-sm">
                        R$ {numericReceived >= cartSubtotal ? change.toFixed(2).replace('.', ',') : remaining.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {paymentMethod === 'pix' && (
                <div className="p-3.5 bg-gradient-to-br from-teal-50/90 to-emerald-50/90 rounded-2xl border border-teal-200 text-center space-y-2">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-teal-900">
                    <Smartphone className="w-4 h-4 text-teal-600" />
                    <span>Pix na Maquininha</span>
                  </div>

                  <p className="text-[11px] text-stone-600 leading-snug">
                    Gere o QR Code Pix direto no visor da sua maquininha. Após a aprovação do cliente, clique abaixo para registrar a venda e emitir o cupom.
                  </p>

                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-100/80 text-teal-800 text-[10px] font-medium border border-teal-200/60">
                    <Check className="w-3 h-3 text-teal-600" />
                    <span>QR Code na tela desativado (venda direta)</span>
                  </div>
                </div>
              )}

              {(paymentMethod === 'cartao_debito' || paymentMethod === 'cartao_credito') && (
                <div className="p-3 bg-white rounded-2xl border border-sky-200/80 text-center text-xs space-y-1">
                  <p className="font-semibold text-stone-700">Aproxime ou insira o cartão</p>
                  <p className="text-stone-400 text-[11px]">Maquininha pronta para leitura</p>
                </div>
              )}

              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Action Buttons: Back to Customer + Finalize Sale */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  id="back-to-customer-tab-btn"
                  onClick={() => setActiveCheckoutTab('cliente')}
                  className="py-3.5 px-3 rounded-2xl border border-stone-200 text-stone-600 hover:bg-stone-100 font-semibold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  title="Voltar para a aba de identificação do cliente"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Cliente</span>
                </button>

                <button
                  type="button"
                  id="finalize-sale-btn"
                  disabled={isProcessing}
                  onClick={handlePrimaryCheckoutAction}
                  className={`flex-1 py-3.5 px-4 rounded-2xl text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] ${
                    paymentMethod === 'pix'
                      ? 'bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 hover:from-teal-700 hover:to-emerald-800 shadow-teal-200'
                      : 'bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-600 hover:to-pink-600 shadow-rose-200'
                  }`}
                >
                  {isProcessing ? (
                    <span>Processando venda...</span>
                  ) : paymentMethod === 'pix' ? (
                    <>
                      <span>Concluir Venda (Pix)</span>
                      <Check className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <span>Concluir Venda</span>
                      <Check className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dedicated Pix Payment QR Code Modal */}
      <PixModal
        isOpen={isPixModalOpen}
        amount={cartSubtotal}
        customerName={customerName.trim() || 'Consumidor Final'}
        onConfirmPix={handleConfirmPixSale}
        onClose={() => setIsPixModalOpen(false)}
      />
    </aside>
  );
};
