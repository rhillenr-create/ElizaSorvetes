import React, { useState } from 'react';
import { Product } from '../../types';
import { usePos } from '../../context/PosContext';
import { ProductModal } from '../Products/ProductModal';
import { 
  Plus, 
  Sparkles, 
  Droplet, 
  Flame, 
  Sun, 
  Heart, 
  Award,
  Check,
  Edit3,
  Tag
} from 'lucide-react';

interface ProductGridProps {
  onOpenFlavorModal: (product: Product) => void;
}

export const ProductGrid: React.FC<ProductGridProps> = ({ onOpenFlavorModal }) => {
  const { products, addToCart, setCurrentScreen } = usePos();
  const [activeCategory, setActiveCategory] = useState<string>('todos');
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  const categories = [
    { id: 'todos', label: 'Todos os Itens' },
    { id: 'sorvete', label: '🍦 Sorvetes & Açaí' },
    { id: 'picole', label: '🍧 Picolés' },
    { id: 'sobremesa', label: '🍨 Sundaes' },
    { id: 'bebida', label: '💧 Bebidas' }
  ];

  const filteredProducts = products.filter((p) => {
    if (activeCategory === 'todos') return true;
    return p.category === activeCategory;
  });

  const handleProductClick = (product: Product) => {
    if (product.requiresFlavors) {
      onOpenFlavorModal(product);
    } else {
      // Direct add to cart (e.g. Água Mineral)
      addToCart(product, []);
      setJustAddedId(product.id);
      setTimeout(() => setJustAddedId(null), 700);
    }
  };

  const handleOpenEditProduct = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    setProductToEdit(product);
    setIsModalOpen(true);
  };

  const handleOpenAddProduct = () => {
    setProductToEdit(null);
    setIsModalOpen(true);
  };

  const getProductIcon = (id: string) => {
    switch (id) {
      case 'sorvete_1_bola':
        return '🍦';
      case 'sorvete_2_bolas':
        return '🍨';
      case 'sorvete_acai':
        return '🫐';
      case 'picole_simples':
        return '🍡';
      case 'picole_acai':
        return '💜';
      case 'sundae':
        return '🍮';
      case 'agua_mineral':
        return '💧';
      default:
        return '✨';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top action bar: categories + quick manage buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 mb-2 border-b border-rose-50">
        {/* Category selector pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar w-full sm:w-auto">
          {categories.map((cat) => (
            <button
              key={cat.id}
              id={`filter-cat-${cat.id}`}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer select-none shrink-0 ${
                activeCategory === cat.id
                  ? 'bg-rose-500 text-white font-semibold shadow-xs shadow-rose-200'
                  : 'bg-white/90 text-stone-600 hover:bg-stone-100 hover:text-stone-900 border border-rose-100/80'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Quick Menu Management Shortcuts */}
        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
          <button
            id="pdv-add-product-btn"
            onClick={handleOpenAddProduct}
            className="px-2.5 py-1.5 rounded-xl bg-amber-100/80 hover:bg-amber-200/80 text-amber-900 border border-amber-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            title="Cadastrar novo item no cardápio"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Item</span>
          </button>
          <button
            id="pdv-manage-menu-btn"
            onClick={() => setCurrentScreen('produtos')}
            className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            title="Acessar painel completo de Cardápio & Preços"
          >
            <Tag className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Preços & Cardápio</span>
          </button>
        </div>
      </div>

      {/* Grid of quick action product buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3 flex-1 overflow-y-auto pr-0.5 sm:pr-1 pb-16 lg:pb-2">
        {filteredProducts.map((product) => {
          const isJustAdded = justAddedId === product.id;

          return (
            <div
              key={product.id}
              id={`product-btn-${product.id}`}
              onClick={() => handleProductClick(product)}
              className="group relative bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 text-left border border-rose-100/90 shadow-2xs hover:shadow-md hover:border-rose-300 transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden active:scale-[0.98] select-none"
            >
              {/* Watercolor soft background accent */}
              <div
                className={`absolute -top-12 -right-12 w-28 h-28 rounded-full bg-gradient-to-br ${
                  product.colorBg || 'from-amber-100/60 to-rose-100/60'
                } opacity-50 blur-xl group-hover:scale-125 transition-transform duration-500 pointer-events-none`}
              />

              {/* Card top */}
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-1.5 mb-1.5 sm:mb-2">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-amber-50 to-rose-50 border border-rose-100/80 flex items-center justify-center text-xl sm:text-3xl shadow-2xs group-hover:scale-105 transition-transform shrink-0">
                    {getProductIcon(product.id)}
                  </div>

                  <div className="flex items-center gap-1">
                    {product.badge && (
                      <span className="text-[9px] sm:text-[10px] font-semibold tracking-wide px-1.5 sm:px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/60 truncate max-w-[70px] sm:max-w-none">
                        {product.badge}
                      </span>
                    )}
                    {/* Quick edit pencil button */}
                    <button
                      type="button"
                      onClick={(e) => handleOpenEditProduct(e, product)}
                      className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-stone-100 hover:bg-rose-100 text-stone-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                      title="Editar preço ou nome deste item"
                    >
                      <Edit3 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    </button>
                  </div>
                </div>

                <h3 className="font-bold text-stone-800 text-xs sm:text-base tracking-tight font-['Quicksand',sans-serif] leading-tight group-hover:text-rose-600 transition-colors line-clamp-2">
                  {product.name}
                </h3>
                <p className="text-[10px] sm:text-[11px] text-stone-500 line-clamp-2 mt-1 leading-snug">
                  {product.description}
                </p>
              </div>

              {/* Card bottom: Price & action */}
              <div className="relative z-10 mt-2.5 sm:mt-3 pt-2 sm:pt-2.5 border-t border-rose-50 flex items-center justify-between">
                <div>
                  <span className="text-[9px] sm:text-[10px] text-stone-400 font-medium block">Preço</span>
                  <span className="text-sm sm:text-lg font-extrabold text-stone-800 font-mono">
                    R$ {product.price.toFixed(2).replace('.', ',')}
                  </span>
                </div>

                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all ${
                    isJustAdded
                      ? 'bg-emerald-500 text-white scale-110'
                      : 'bg-rose-50 text-rose-600 group-hover:bg-rose-500 group-hover:text-white'
                  }`}
                >
                  {isJustAdded ? (
                    <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  ) : product.requiresFlavors ? (
                    <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  ) : (
                    <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Edit Modal in PDV */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setProductToEdit(null);
        }}
        productToEdit={productToEdit}
      />
    </div>
  );
};
