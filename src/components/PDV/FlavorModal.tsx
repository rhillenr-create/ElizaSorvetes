import React, { useState, useMemo } from 'react';
import { Product, Flavor } from '../../types';
import { ICE_CREAM_FLAVORS, POPSICLE_FLAVORS, SUNDAE_FLAVORS } from '../../data/initialData';
import { usePos } from '../../context/PosContext';
import { X, Search, Check, AlertCircle, Sparkles } from 'lucide-react';

interface FlavorModalProps {
  product: Product | null;
  onClose: () => void;
  onConfirm: (flavors: string[]) => void;
}

export const FlavorModal: React.FC<FlavorModalProps> = ({ product, onClose, onConfirm }) => {
  const { stock } = usePos();
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  if (!product) return null;

  const maxFlavors = product.maxFlavors || 1;

  // Select list based on product flavorType
  const flavorList: Flavor[] = useMemo(() => {
    let baseList: Flavor[] = ICE_CREAM_FLAVORS;
    let expectedCategory = 'Sorvete';
    if (product.flavorType === 'picole') {
      baseList = POPSICLE_FLAVORS;
      expectedCategory = 'Picolé';
    } else if (product.flavorType === 'sundae') {
      baseList = SUNDAE_FLAVORS;
      expectedCategory = 'Sobremesa';
    }

    // Include custom flavors from stock
    const customFlavors = stock
      .filter((s) => s.category.toLowerCase() === expectedCategory.toLowerCase())
      .map((s) => {
        const cleanName = s.name.replace(/^(sorvete|picolé|picole|sundae|sobremesa):\s*/i, '').trim();
        return {
          id: s.id,
          name: cleanName,
          type: product.flavorType || 'sorvete'
        } as Flavor;
      })
      .filter((custom) => !baseList.some((b) => b.name.toLowerCase() === custom.name.toLowerCase()));

    return [...baseList, ...customFlavors];
  }, [product.flavorType, stock]);

  // Filter flavors by search
  const filteredFlavors = useMemo(() => {
    if (!searchQuery.trim()) return flavorList;
    return flavorList.filter((f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [flavorList, searchQuery]);

  // Check stock for a flavor
  const getFlavorStock = (flavorName: string) => {
    const item = stock.find(
      (s) =>
        s.name.toLowerCase().includes(flavorName.toLowerCase()) ||
        flavorName.toLowerCase().includes(s.name.toLowerCase().replace('sorvete: ', '').replace('picolé: ', ''))
    );
    return item;
  };

  // Toggle selection
  const handleSelectFlavor = (flavorName: string) => {
    if (maxFlavors === 1) {
      setSelectedFlavors([flavorName]);
      return;
    }

    // For 2 scoops: allow up to 2 items
    if (selectedFlavors.includes(flavorName)) {
      // If clicked again, can add second scoop of same flavor or toggle
      if (selectedFlavors.filter((f) => f === flavorName).length === 1 && selectedFlavors.length < maxFlavors) {
        setSelectedFlavors([...selectedFlavors, flavorName]);
      } else {
        // Remove one instance
        const index = selectedFlavors.indexOf(flavorName);
        const copy = [...selectedFlavors];
        copy.splice(index, 1);
        setSelectedFlavors(copy);
      }
    } else {
      if (selectedFlavors.length < maxFlavors) {
        setSelectedFlavors([...selectedFlavors, flavorName]);
      } else {
        // Replace first
        setSelectedFlavors([selectedFlavors[1], flavorName].filter(Boolean));
      }
    }
  };

  const handleConfirm = () => {
    if (selectedFlavors.length === 0) return;
    onConfirm(selectedFlavors);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div 
        className="bg-[#FFFDFB] w-full max-w-2xl rounded-2xl sm:rounded-3xl shadow-xl border border-rose-100 flex flex-col max-h-[92vh] sm:max-h-[90vh] overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 sm:px-5 py-3 sm:py-4 bg-gradient-to-r from-amber-50/90 via-rose-50/90 to-pink-50/90 border-b border-rose-100 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-lg sm:text-xl">🍦</span>
              <h2 className="text-base sm:text-lg font-bold text-stone-800 font-['Quicksand',sans-serif] leading-tight">
                Escolha o Sabor: {product.name}
              </h2>
            </div>
            <p className="text-[11px] sm:text-xs text-stone-600 mt-0.5">
              {maxFlavors === 1
                ? 'Selecione 1 sabor para o produto'
                : `Selecione até ${maxFlavors} sabores (pode repetir para dose dupla)`}
            </p>
          </div>

          <button
            id="close-flavor-modal-btn"
            onClick={onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/80 hover:bg-white text-stone-500 hover:text-stone-800 flex items-center justify-center border border-rose-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Selected preview bar */}
        <div className="px-4 sm:px-5 py-2 sm:py-2.5 bg-amber-50/50 border-b border-rose-100/60 flex flex-wrap items-center justify-between gap-1.5 text-xs shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="font-semibold text-stone-700 text-[11px] sm:text-xs">Selecionado(s):</span>
            {selectedFlavors.length === 0 ? (
              <span className="text-stone-400 italic text-[11px]">Nenhum sabor ainda</span>
            ) : (
              <div className="flex flex-wrap gap-1">
                {selectedFlavors.map((flavor, idx) => (
                  <span
                    key={`${flavor}-${idx}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-medium text-[11px] border border-rose-200"
                  >
                    <Check className="w-2.5 h-2.5 text-rose-600" />
                    {flavor}
                    {selectedFlavors.filter((f) => f === flavor).length > 1 && (
                      <span className="text-[9px] bg-rose-200 px-1 rounded-full">2x</span>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="text-stone-500 font-medium text-[11px] sm:text-xs">
            <span className={selectedFlavors.length === maxFlavors ? 'text-emerald-600 font-bold' : 'text-stone-700 font-bold'}>
              {selectedFlavors.length}
            </span>{' '}
            de {maxFlavors} {maxFlavors === 1 ? 'sabor' : 'sabores'}
          </div>
        </div>

        {/* Search bar */}
        <div className="px-4 sm:px-5 py-2 border-b border-stone-100 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              id="search-flavor-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar sabor (ex: Ninho, Bacuri, Açaí...)"
              className="w-full pl-9 pr-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-stone-50/80 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-300 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Flavors Grid */}
        <div className="p-3 sm:p-5 overflow-y-auto flex-1 max-h-[46vh] sm:max-h-[50vh] grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
          {filteredFlavors.map((flavor) => {
            const countInSelected = selectedFlavors.filter((f) => f === flavor.name).length;
            const isSelected = countInSelected > 0;
            const stockItem = getFlavorStock(flavor.name);
            const isLowStock = stockItem && stockItem.quantity <= stockItem.minQuantity;
            const isOutOfStock = stockItem && stockItem.quantity <= 0;

            return (
              <button
                key={flavor.id}
                id={`flavor-item-${flavor.id}`}
                disabled={isOutOfStock}
                onClick={() => handleSelectFlavor(flavor.name)}
                className={`relative p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between select-none ${
                  isOutOfStock
                    ? 'opacity-40 cursor-not-allowed bg-stone-100 border-stone-200'
                    : isSelected
                    ? 'bg-gradient-to-br from-rose-50 to-pink-50 border-rose-300 shadow-xs ring-2 ring-rose-200/70 scale-[0.99]'
                    : 'bg-white hover:bg-amber-50/40 border-stone-200/80 hover:border-amber-200 shadow-2xs'
                }`}
              >
                {/* Selection badge */}
                {isSelected && (
                  <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                    {countInSelected > 1 ? `${countInSelected}x` : '✓'}
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-1.5 mb-1 pr-6">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: flavor.color || '#F43F5E' }}
                    />
                    <span className="font-semibold text-xs sm:text-sm text-stone-800 leading-tight">
                      {flavor.name}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1 mt-1">
                    {flavor.isNutella && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 font-medium">
                        Nutella
                      </span>
                    )}
                    {flavor.isRegional && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-medium flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5 text-emerald-600" /> Regional
                      </span>
                    )}
                  </div>
                </div>

                {/* Stock info */}
                <div className="mt-2.5 pt-1.5 border-t border-stone-100 flex items-center justify-between text-[11px]">
                  {stockItem ? (
                    isOutOfStock ? (
                      <span className="text-red-500 font-semibold">Esgotado</span>
                    ) : isLowStock ? (
                      <span className="text-amber-700 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-amber-500" />
                        {stockItem.quantity} {stockItem.unit}
                      </span>
                    ) : (
                      <span className="text-stone-500">
                        {stockItem.quantity} {stockItem.unit}
                      </span>
                    )
                  ) : (
                    <span className="text-stone-400">Disponível</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-3.5 sm:px-5 py-2.5 sm:py-3.5 bg-stone-50 border-t border-stone-200/80 flex items-center justify-between gap-2 shrink-0">
          <button
            id="cancel-flavor-btn"
            onClick={onClose}
            className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 text-xs sm:text-sm font-medium transition-colors cursor-pointer shrink-0"
          >
            Cancelar
          </button>

          <button
            id="confirm-flavor-btn"
            disabled={selectedFlavors.length === 0}
            onClick={handleConfirm}
            className={`px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-xs flex items-center gap-1.5 sm:gap-2 cursor-pointer ${
              selectedFlavors.length > 0
                ? 'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white shadow-rose-200'
                : 'bg-stone-200 text-stone-400 cursor-not-allowed'
            }`}
          >
            <span>Adicionar</span>
            <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-white/25 text-white text-[11px] sm:text-xs">
              R$ {product.price.toFixed(2).replace('.', ',')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
