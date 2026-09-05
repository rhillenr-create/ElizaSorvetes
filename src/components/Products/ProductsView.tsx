import React, { useState, useMemo } from 'react';
import { usePos } from '../../context/PosContext';
import { Product, ProductCategory } from '../../types';
import { ProductModal } from './ProductModal';
import {
  Search,
  Plus,
  Edit3,
  Trash2,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Tag,
  DollarSign,
  Package,
  Layers
} from 'lucide-react';

export const ProductsView: React.FC = () => {
  const { products, deleteProduct, updateProduct, resetProducts, setCurrentScreen } = usePos();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [inlineEditingPriceId, setInlineEditingPriceId] = useState<string | null>(null);
  const [tempPriceInput, setTempPriceInput] = useState<string>('');

  const categories = [
    { id: 'todos', label: 'Todos os Itens' },
    { id: 'sorvete', label: '🍦 Sorvetes & Açaí' },
    { id: 'picole', label: '🍧 Picolés' },
    { id: 'sobremesa', label: '🍨 Sobremesas' },
    { id: 'bebida', label: '💧 Bebidas' }
  ];

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.badge && product.badge.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory =
        selectedCategory === 'todos' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const stats = useMemo(() => {
    const total = products.length;
    const avgPrice =
      total > 0
        ? products.reduce((acc, p) => acc + p.price, 0) / total
        : 0;
    const countSorvetes = products.filter((p) => p.category === 'sorvete').length;
    const countPicoles = products.filter((p) => p.category === 'picole').length;
    return { total, avgPrice, countSorvetes, countPicoles };
  }, [products]);

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (productToDelete) {
      deleteProduct(productToDelete.id);
      setProductToDelete(null);
    }
  };

  const handleQuickPriceChange = (product: Product, delta: number) => {
    const newPrice = Math.max(0.5, Math.round((product.price + delta) * 100) / 100);
    updateProduct(product.id, { price: newPrice });
  };

  const handleStartInlinePrice = (product: Product) => {
    setInlineEditingPriceId(product.id);
    setTempPriceInput(product.price.toFixed(2));
  };

  const handleSaveInlinePrice = (product: Product) => {
    const val = parseFloat(tempPriceInput.replace(',', '.'));
    if (!isNaN(val) && val >= 0) {
      updateProduct(product.id, { price: Math.round(val * 100) / 100 });
    }
    setInlineEditingPriceId(null);
  };

  const getProductEmoji = (category: ProductCategory, name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('água') || lower.includes('agua')) return '💧';
    if (lower.includes('açaí') || lower.includes('acai')) return '🫐';
    if (lower.includes('sundae')) return '🍨';
    if (category === 'picole') return '🍧';
    if (category === 'bebida') return '🥤';
    if (category === 'sobremesa') return '🍰';
    return '🍦';
  };

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full p-3 sm:p-6 space-y-5 overflow-y-auto pb-24 sm:pb-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Banner and Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-amber-100/70 via-rose-100/60 to-pink-50/70 backdrop-blur-xs p-5 rounded-3xl border border-rose-100/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-white/90 text-rose-500 shadow-2xs">
              <Tag className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-stone-800 font-['Quicksand',sans-serif]">
              Cardápio & Tabela de Preços
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl">
            Altere os valores e nomes dos produtos, adicione novos itens ou remova itens do cardápio.
            Todas as alterações são refletidas instantaneamente na tela do Caixa (PDV).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="reset-products-btn"
            onClick={() => setResetConfirmOpen(true)}
            className="px-3.5 py-2 rounded-2xl bg-white/80 hover:bg-white text-stone-600 hover:text-stone-900 border border-rose-100 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            title="Restaurar lista de produtos padrão"
          >
            <RotateCcw className="w-3.5 h-3.5 text-stone-400" />
            <span className="hidden sm:inline">Restaurar Padrão</span>
          </button>

          <button
            id="add-new-product-btn"
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bold text-xs shadow-md shadow-rose-200 flex items-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Produto</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white/80 rounded-2xl p-3.5 border border-rose-100/70 shadow-2xs">
          <div className="flex items-center justify-between text-stone-400 text-xs font-medium mb-1">
            <span>Total no Cardápio</span>
            <Package className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-stone-800">
            {stats.total} <span className="text-xs font-medium text-stone-400">itens</span>
          </div>
        </div>

        <div className="bg-white/80 rounded-2xl p-3.5 border border-rose-100/70 shadow-2xs">
          <div className="flex items-center justify-between text-stone-400 text-xs font-medium mb-1">
            <span>Preço Médio</span>
            <DollarSign className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-stone-800">
            R$ {stats.avgPrice.toFixed(2).replace('.', ',')}
          </div>
        </div>

        <div className="bg-white/80 rounded-2xl p-3.5 border border-rose-100/70 shadow-2xs">
          <div className="flex items-center justify-between text-stone-400 text-xs font-medium mb-1">
            <span>Sorvetes & Açaí</span>
            <span className="text-xs">🍦</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-stone-800">
            {stats.countSorvetes} <span className="text-xs font-medium text-stone-400">opções</span>
          </div>
        </div>

        <div className="bg-white/80 rounded-2xl p-3.5 border border-rose-100/70 shadow-2xs">
          <div className="flex items-center justify-between text-stone-400 text-xs font-medium mb-1">
            <span>Picolés & Outros</span>
            <span className="text-xs">🍧</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-stone-800">
            {stats.countPicoles} <span className="text-xs font-medium text-stone-400">opções</span>
          </div>
        </div>
      </div>

      {/* Search and Category Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/90 p-3 rounded-2xl border border-rose-100/80 shadow-2xs">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            id="search-products-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, descrição ou categoria..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-stone-50 border border-stone-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 text-xs text-stone-800 outline-none transition-all placeholder:text-stone-400"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-rose-500 text-white font-semibold shadow-2xs'
                  : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200/60'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-12 bg-white/60 rounded-3xl border border-rose-100/70 p-6">
          <div className="w-16 h-16 rounded-full bg-rose-50 mx-auto flex items-center justify-center text-3xl mb-3 text-rose-400">
            🍨
          </div>
          <h3 className="text-base font-bold text-stone-700 font-['Quicksand',sans-serif]">
            Nenhum produto encontrado
          </h3>
          <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
            Não encontramos itens com o termo buscado. Tente outra busca ou cadastre um novo produto.
          </p>
          <button
            onClick={handleOpenAddModal}
            className="mt-4 px-4 py-2 rounded-2xl bg-rose-500 text-white text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Produto</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => {
            const isEditingPrice = inlineEditingPriceId === product.id;

            return (
              <div
                key={product.id}
                id={`card-product-${product.id}`}
                className="group relative bg-white rounded-3xl p-5 border border-rose-100 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden"
              >
                {/* Background Watercolor accent */}
                <div
                  className={`absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br ${
                    product.colorBg || 'from-amber-100/60 to-rose-100/60'
                  } opacity-40 blur-xl group-hover:scale-125 transition-transform duration-500 pointer-events-none`}
                />

                {/* Card Top */}
                <div className="relative z-10">
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-50 to-rose-50 border border-rose-100/80 flex items-center justify-center text-2xl shadow-2xs">
                        {getProductEmoji(product.category, product.name)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200/50">
                            {product.category}
                          </span>
                          {product.badge && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/60">
                              {product.badge}
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-stone-800 text-base font-['Quicksand',sans-serif] mt-0.5">
                          {product.name}
                        </h3>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-stone-500 line-clamp-2 mt-1 min-h-[32px]">
                    {product.description || 'Item disponível no cardápio de vendas.'}
                  </p>

                  <div className="mt-2 text-[11px] text-stone-600 bg-stone-50/80 rounded-xl px-2.5 py-1.5 border border-stone-100 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>
                      {product.requiresFlavors
                        ? `Exige até ${product.maxFlavors || 1} sabor(es) de ${product.flavorType || 'sorvete'}`
                        : 'Venda direta (sem seleção de sabores)'}
                    </span>
                  </div>
                </div>

                {/* Card Bottom: Price and Actions */}
                <div className="relative z-10 mt-4 pt-3 border-t border-rose-50 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-stone-400 font-semibold block uppercase">
                      Valor / Preço
                    </span>

                    {isEditingPrice ? (
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-xs font-bold text-stone-500">R$</span>
                        <input
                          type="number"
                          step="0.50"
                          min="0"
                          autoFocus
                          value={tempPriceInput}
                          onChange={(e) => setTempPriceInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveInlinePrice(product);
                            if (e.key === 'Escape') setInlineEditingPriceId(null);
                          }}
                          className="w-20 px-2 py-1 text-sm font-black border border-rose-300 rounded-lg outline-none bg-white text-stone-800"
                        />
                        <button
                          onClick={() => handleSaveInlinePrice(product)}
                          className="p-1 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer"
                          title="Confirmar novo preço"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleStartInlinePrice(product)}
                          className="text-lg sm:text-xl font-black text-stone-800 hover:text-rose-600 transition-colors cursor-pointer group/price flex items-center gap-1"
                          title="Clique para editar valor rapidamente"
                        >
                          <span>R$ {product.price.toFixed(2).replace('.', ',')}</span>
                          <Edit3 className="w-3 h-3 text-stone-300 group-hover/price:text-rose-500 opacity-0 group-hover/price:opacity-100 transition-opacity" />
                        </button>

                        {/* Quick +/- 0.50 buttons */}
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => handleQuickPriceChange(product, -0.5)}
                            className="w-5 h-5 rounded-md bg-stone-100 hover:bg-rose-100 text-stone-600 hover:text-rose-700 text-[11px] font-bold flex items-center justify-center cursor-pointer transition-colors"
                            title="Diminuir R$ 0,50"
                          >
                            -
                          </button>
                          <button
                            onClick={() => handleQuickPriceChange(product, 0.5)}
                            className="w-5 h-5 rounded-md bg-stone-100 hover:bg-emerald-100 text-stone-600 hover:text-emerald-700 text-[11px] font-bold flex items-center justify-center cursor-pointer transition-colors"
                            title="Aumentar R$ 0,50"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Edit and Delete action buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      id={`edit-product-${product.id}`}
                      onClick={() => handleOpenEditModal(product)}
                      className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/70 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="Editar nome, valor e detalhes do produto"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                      <span>Editar</span>
                    </button>

                    <button
                      id={`delete-product-${product.id}`}
                      onClick={() => setProductToDelete(product)}
                      className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-800 border border-rose-200/60 text-xs font-semibold cursor-pointer transition-colors"
                      title="Remover produto do cardápio"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-rose-100 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-stone-800 text-center font-['Quicksand',sans-serif]">
              Remover Produto?
            </h3>
            <p className="text-xs text-stone-500 text-center mt-1.5">
              Deseja realmente excluir <strong>"{productToDelete.name}"</strong> (R${' '}
              {productToDelete.price.toFixed(2).replace('.', ',')}) do cardápio?
            </p>
            <div className="mt-5 flex items-center justify-center gap-2.5">
              <button
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                id="confirm-delete-product-btn"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Sim, Remover
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {resetConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-rose-100 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-stone-800 text-center font-['Quicksand',sans-serif]">
              Restaurar Cardápio Padrão?
            </h3>
            <p className="text-xs text-stone-500 text-center mt-1.5">
              Isso restaurará a lista e os preços originais da Eliza Sorvetes (Sorvete 1 Bola R$ 6,00, 2 Bolas R$ 10,00, Água Mineral R$ 3,50, etc.).
            </p>
            <div className="mt-5 flex items-center justify-center gap-2.5">
              <button
                onClick={() => setResetConfirmOpen(false)}
                className="px-4 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                id="confirm-reset-products-btn"
                onClick={() => {
                  resetProducts();
                  setResetConfirmOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Restaurar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProduct(null);
        }}
        productToEdit={editingProduct}
      />
    </div>
  );
};
