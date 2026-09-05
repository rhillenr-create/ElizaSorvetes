import React, { useState } from 'react';
import { Product } from '../../types';
import { ProductGrid } from './ProductGrid';
import { CartSidebar } from './CartSidebar';
import { FlavorModal } from './FlavorModal';
import { ReceiptModal } from './ReceiptModal';
import { usePos } from '../../context/PosContext';
import { ShoppingCart } from 'lucide-react';

export const PdvView: React.FC = () => {
  const { addToCart, lastCompletedSale, setLastCompletedSale, cartTotalCount, cartSubtotal } = usePos();
  const [flavorModalProduct, setFlavorModalProduct] = useState<Product | null>(null);
  const [mobileCartOpen, setMobileCartOpen] = useState<boolean>(false);

  const handleOpenFlavorModal = (product: Product) => {
    setFlavorModalProduct(product);
  };

  const handleConfirmFlavors = (flavors: string[]) => {
    if (flavorModalProduct) {
      addToCart(flavorModalProduct, flavors);
      setFlavorModalProduct(null);
    }
  };

  const handleCloseReceipt = () => {
    setLastCompletedSale(null);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 lg:h-[calc(100vh-65px)] max-w-7xl mx-auto w-full p-2.5 sm:p-5 lg:overflow-hidden relative">
      <div className="flex-1 flex flex-col lg:flex-row gap-4 h-full min-h-0 lg:overflow-hidden">
        {/* Left Side: Product Selection and Quick Actions */}
        <section className="flex-1 flex flex-col min-h-0 lg:h-full bg-white/80 backdrop-blur-xs rounded-3xl p-3.5 sm:p-5 border border-rose-100/80 shadow-xs lg:overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-800 font-['Quicksand',sans-serif]">
                Cardápio Rápido de Vendas
              </h2>
              <p className="text-[11px] sm:text-xs text-stone-500">
                Toque no item para escolher sabores ou adicionar ao pedido
              </p>
            </div>

            {/* Mobile Cart Floating Trigger */}
            <button
              id="mobile-cart-toggle-btn"
              onClick={() => setMobileCartOpen(!mobileCartOpen)}
              className="lg:hidden relative flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-rose-500 text-white font-medium text-xs shadow-md shadow-rose-200 cursor-pointer active:scale-95 transition-transform"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Comanda</span>
              {cartTotalCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-white text-rose-600 font-bold text-xs flex items-center justify-center shadow-2xs">
                  {cartTotalCount}
                </span>
              )}
            </button>
          </div>

          <div className="flex-1 min-h-0 lg:overflow-hidden pt-1">
            <ProductGrid onOpenFlavorModal={handleOpenFlavorModal} />
          </div>
        </section>

        {/* Right Side: Desktop Cart Sidebar */}
        <section className="hidden lg:flex w-88 xl:w-96 flex-col h-full shrink-0">
          <CartSidebar onSaleCompleted={() => {}} />
        </section>
      </div>

      {/* Floating Mobile Cart Action Bar (Sticky comanda shortcut on smartphones) */}
      {cartTotalCount > 0 && !mobileCartOpen && (
        <div className="lg:hidden fixed bottom-16 left-3 right-3 z-30 animate-in slide-in-from-bottom-2 duration-200">
          <button
            id="floating-mobile-cart-bar"
            onClick={() => setMobileCartOpen(true)}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 text-white font-bold text-sm shadow-xl shadow-rose-300/60 flex items-center justify-between cursor-pointer active:scale-[0.99] border border-rose-400/40"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-extrabold text-xs">
                <ShoppingCart className="w-4 h-4 text-white" />
              </div>
              <div className="text-left leading-tight">
                <span className="text-[11px] text-rose-100 block font-normal">
                  {cartTotalCount} {cartTotalCount === 1 ? 'item na comanda' : 'itens na comanda'}
                </span>
                <span className="text-base font-extrabold">
                  R$ {cartSubtotal.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold bg-white text-rose-600 px-3 py-1.5 rounded-xl shadow-xs">
              <span>Finalizar</span>
              <span>&rarr;</span>
            </div>
          </button>
        </div>
      )}

      {/* Mobile Cart Bottom Sheet / Drawer */}
      {mobileCartOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex flex-col justify-end sm:justify-center sm:items-center sm:p-4 animate-in fade-in duration-150"
          onClick={() => setMobileCartOpen(false)}
        >
          <div 
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl h-[92vh] sm:h-[88vh] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-200 border-t sm:border border-rose-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 bg-gradient-to-r from-amber-50/90 via-rose-50/90 to-pink-50/90 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  <ShoppingCart className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-800 text-sm font-['Quicksand',sans-serif]">
                    Comanda / Fechamento
                  </h3>
                  <p className="text-[10px] text-stone-500">
                    {cartTotalCount} {cartTotalCount === 1 ? 'item no pedido' : 'itens no pedido'}
                  </p>
                </div>
              </div>

              <button
                id="close-mobile-cart-sheet-btn"
                onClick={() => setMobileCartOpen(false)}
                className="px-3 py-1.5 rounded-full bg-white hover:bg-stone-100 text-stone-600 border border-rose-100 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
              >
                <span>✕ Fechar</span>
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden">
              <CartSidebar
                onSaleCompleted={() => {
                  setMobileCartOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Flavor Selection Modal */}
      {flavorModalProduct && (
        <FlavorModal
          product={flavorModalProduct}
          onClose={() => setFlavorModalProduct(null)}
          onConfirm={handleConfirmFlavors}
        />
      )}

      {/* Sale Confirmation Receipt Modal */}
      {lastCompletedSale && (
        <ReceiptModal
          sale={lastCompletedSale}
          onClose={handleCloseReceipt}
        />
      )}
    </div>
  );
};
