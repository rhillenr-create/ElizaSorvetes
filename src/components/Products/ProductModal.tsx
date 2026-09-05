import React, { useState, useEffect } from 'react';
import { Product, ProductCategory } from '../../types';
import { usePos } from '../../context/PosContext';
import { X, Sparkles, Check, AlertCircle } from 'lucide-react';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
}

const COLOR_PRESETS = [
  { label: 'Baunilha & Rosa', value: 'from-amber-100/80 to-rose-100/60' },
  { label: 'Rosa Suave', value: 'from-rose-100/80 to-pink-100/70' },
  { label: 'Açaí Tropical', value: 'from-purple-100/70 to-pink-100/60' },
  { label: 'Frutas Amarelas', value: 'from-amber-100/80 to-yellow-100/70' },
  { label: 'Açaí Marcante', value: 'from-fuchsia-100/70 to-purple-100/60' },
  { label: 'Caramelo & Morango', value: 'from-rose-100/80 to-amber-100/60' },
  { label: 'Água & Celeste', value: 'from-sky-100/70 to-cyan-100/50' },
  { label: 'Menta Fresca', value: 'from-emerald-100/70 to-teal-100/50' },
];

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  productToEdit
}) => {
  const { addProduct, updateProduct } = usePos();

  const [name, setName] = useState('');
  const [price, setPrice] = useState<string>('6.00');
  const [category, setCategory] = useState<ProductCategory>('sorvete');
  const [description, setDescription] = useState('');
  const [badge, setBadge] = useState('');
  const [requiresFlavors, setRequiresFlavors] = useState<boolean>(true);
  const [flavorType, setFlavorType] = useState<'sorvete' | 'picole' | 'sundae'>('sorvete');
  const [maxFlavors, setMaxFlavors] = useState<number>(1);
  const [colorBg, setColorBg] = useState(COLOR_PRESETS[0].value);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name);
      setPrice(productToEdit.price.toFixed(2));
      setCategory(productToEdit.category);
      setDescription(productToEdit.description || '');
      setBadge(productToEdit.badge || '');
      setRequiresFlavors(productToEdit.requiresFlavors);
      setFlavorType(productToEdit.flavorType || 'sorvete');
      setMaxFlavors(productToEdit.maxFlavors || 1);
      setColorBg(productToEdit.colorBg || COLOR_PRESETS[0].value);
    } else {
      // New product defaults
      setName('');
      setPrice('6.00');
      setCategory('sorvete');
      setDescription('');
      setBadge('');
      setRequiresFlavors(true);
      setFlavorType('sorvete');
      setMaxFlavors(1);
      setColorBg(COLOR_PRESETS[0].value);
    }
    setError(null);
  }, [productToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor, informe o nome do produto.');
      return;
    }

    const parsedPrice = parseFloat(price.replace(',', '.'));
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setError('Por favor, informe um valor de preço válido.');
      return;
    }

    const payload: Omit<Product, 'id'> = {
      name: name.trim(),
      price: Math.round(parsedPrice * 100) / 100,
      category,
      description: description.trim(),
      badge: badge.trim() || undefined,
      requiresFlavors,
      flavorType: requiresFlavors ? flavorType : undefined,
      maxFlavors: requiresFlavors ? maxFlavors : undefined,
      colorBg
    };

    if (productToEdit) {
      updateProduct(productToEdit.id, payload);
    } else {
      addProduct(payload);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-rose-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Watercolor header gradient */}
        <div className="bg-gradient-to-r from-amber-100/90 via-rose-100/80 to-amber-50/90 px-6 py-4 border-b border-rose-100/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/90 shadow-2xs flex items-center justify-center text-xl">
              {productToEdit ? '✏️' : '🍦'}
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-800 font-['Quicksand',sans-serif]">
                {productToEdit ? 'Alterar Produto & Preço' : 'Cadastrar Novo Produto'}
              </h3>
              <p className="text-xs text-stone-500">
                {productToEdit
                  ? `Editando dados de "${productToEdit.name}"`
                  : 'Adicione um novo item ao cardápio e PDV'}
              </p>
            </div>
          </div>
          <button
            id="close-product-modal-btn"
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/80 hover:bg-white text-stone-500 hover:text-stone-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Nome do Produto */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              Nome do Produto <span className="text-rose-500">*</span>
            </label>
            <input
              id="product-input-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Sorvete 1 Bola, Milkshake 400ml, Água Mineral..."
              className="w-full px-3.5 py-2.5 rounded-2xl border border-stone-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 text-sm text-stone-800 outline-none transition-all placeholder:text-stone-400 bg-stone-50/50 focus:bg-white font-medium"
            />
          </div>

          {/* Preço e Categoria */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Valor / Preço */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Valor do Produto (R$) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-sm">
                  R$
                </span>
                <input
                  id="product-input-price"
                  type="number"
                  step="0.10"
                  min="0"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0,00"
                  className="w-full pl-11 pr-3.5 py-2.5 rounded-2xl border border-stone-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 text-base font-extrabold text-stone-800 outline-none transition-all bg-stone-50/50 focus:bg-white"
                />
              </div>
              <div className="flex items-center gap-1 mt-1.5">
                {[0.5, 1.0, 2.0].map((adj) => (
                  <button
                    key={adj}
                    type="button"
                    onClick={() => {
                      const cur = parseFloat(price.replace(',', '.')) || 0;
                      setPrice((cur + adj).toFixed(2));
                    }}
                    className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/60 font-medium cursor-pointer"
                  >
                    +{adj.toFixed(2)}
                  </button>
                ))}
              </div>
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Categoria
              </label>
              <select
                id="product-input-category"
                value={category}
                onChange={(e) => {
                  const newCat = e.target.value as ProductCategory;
                  setCategory(newCat);
                  if (newCat === 'bebida') {
                    setRequiresFlavors(false);
                  } else if (newCat === 'picole') {
                    setRequiresFlavors(true);
                    setFlavorType('picole');
                  } else if (newCat === 'sobremesa') {
                    setRequiresFlavors(true);
                    setFlavorType('sundae');
                  } else {
                    setRequiresFlavors(true);
                    setFlavorType('sorvete');
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-stone-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 text-sm text-stone-800 outline-none transition-all bg-stone-50/50 focus:bg-white font-medium cursor-pointer"
              >
                <option value="sorvete">🍦 Sorvete & Açaí</option>
                <option value="picole">🍧 Picolé</option>
                <option value="sobremesa">🍨 Sobremesa / Sundae</option>
                <option value="bebida">💧 Bebida</option>
              </select>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              Descrição Curta
            </label>
            <input
              id="product-input-description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Casquinha crocante artesanal, servido com calda..."
              className="w-full px-3.5 py-2 rounded-2xl border border-stone-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 text-xs text-stone-800 outline-none transition-all placeholder:text-stone-400 bg-stone-50/50 focus:bg-white"
            />
          </div>

          {/* Tag de Destaque / Badge */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              Tag de Destaque (Opcional)
            </label>
            <div className="flex items-center gap-2">
              <input
                id="product-input-badge"
                type="text"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                placeholder="Ex: Popular, Mais Pedido, Especial..."
                className="flex-1 px-3.5 py-2 rounded-2xl border border-stone-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 text-xs text-stone-800 outline-none transition-all placeholder:text-stone-400 bg-stone-50/50 focus:bg-white"
              />
              <div className="flex items-center gap-1">
                {['Popular', 'Especial', 'Novo'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setBadge(preset)}
                    className="text-[10px] px-2 py-1 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Configuração de Sabores */}
          <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-100 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-stone-800 block">
                  Requer Escolha de Sabores?
                </span>
                <span className="text-[11px] text-stone-500">
                  {requiresFlavors
                    ? 'Ao tocar no PDV, abre modal de sabores para o atendente'
                    : 'Adiciona direto ao pedido sem abrir modal de sabores'}
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  id="product-toggle-requires-flavors"
                  type="checkbox"
                  checked={requiresFlavors}
                  onChange={(e) => setRequiresFlavors(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
              </label>
            </div>

            {requiresFlavors && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-amber-200/50">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    Tipo de Sabores
                  </label>
                  <select
                    id="product-input-flavor-type"
                    value={flavorType}
                    onChange={(e) =>
                      setFlavorType(e.target.value as 'sorvete' | 'picole' | 'sundae')
                    }
                    className="w-full px-3 py-1.5 rounded-xl border border-amber-200 bg-white text-xs text-stone-800 font-medium outline-none"
                  >
                    <option value="sorvete">Sabores de Sorvete & Açaí</option>
                    <option value="picole">Sabores de Picolés</option>
                    <option value="sundae">Caldas de Sundae</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    Qtd Máxima de Sabores
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setMaxFlavors(num)}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          maxFlavors === num
                            ? 'bg-rose-500 text-white border-rose-500 shadow-2xs'
                            : 'bg-white text-stone-700 border-amber-200 hover:bg-amber-100/50'
                        }`}
                      >
                        {num} {num === 1 ? 'sabor' : 'sabores'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Cor de Fundo Aquarela */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              Tom Aquarela do Card
            </label>
            <div className="grid grid-cols-4 gap-2">
              {COLOR_PRESETS.map((preset) => {
                const isSelected = colorBg === preset.value;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setColorBg(preset.value)}
                    className={`h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer relative overflow-hidden bg-gradient-to-br ${
                      preset.value
                    } ${
                      isSelected
                        ? 'border-rose-500 ring-2 ring-rose-200 scale-102'
                        : 'border-stone-200/80 hover:border-rose-300'
                    }`}
                    title={preset.label}
                  >
                    {isSelected && (
                      <Check className="w-4 h-4 text-rose-600 bg-white/90 rounded-full p-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2.5">
            <button
              id="cancel-product-modal-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl border border-stone-200 text-stone-600 hover:bg-stone-100 text-xs font-semibold cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              id="save-product-btn"
              type="submit"
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bold text-xs shadow-md shadow-rose-200 cursor-pointer flex items-center gap-1.5 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>{productToEdit ? 'Salvar Alterações' : 'Cadastrar Produto'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
