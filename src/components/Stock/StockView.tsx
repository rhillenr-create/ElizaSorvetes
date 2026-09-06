import React, { useState, useMemo } from 'react';
import { usePos } from '../../context/PosContext';
import { StockItem } from '../../types';
import { 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Minus, 
  Edit3, 
  X, 
  Package, 
  Filter,
  Save,
  ArrowUpDown
} from 'lucide-react';

export const StockView: React.FC = () => {
  const { stock, updateStockQuantity, adjustStockQuantity, updateStockThreshold, addStockItem } = usePos();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Add item modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<'Sorvete' | 'Picolé' | 'Bebida' | 'Sobremesa'>('Sorvete');
  const [newItemQty, setNewItemQty] = useState(25);
  const [newItemMinQty, setNewItemMinQty] = useState(8);
  const [newItemUnit, setNewItemUnit] = useState('bolas');

  // Edit modal state
  const [editQty, setEditQty] = useState<number>(0);
  const [editMinQty, setEditMinQty] = useState<number>(0);

  // Metric counts
  const safeStock = useMemo(() => Array.isArray(stock) ? stock.filter(Boolean) : [], [stock]);
  const totalItems = safeStock.length;
  const lowStockItems = safeStock.filter((s) => (s.quantity ?? 0) <= (s.minQuantity ?? 0));
  const normalStockCount = Math.max(0, totalItems - lowStockItems.length);

  const filteredStock = useMemo(() => {
    const search = (searchTerm || '').trim().toLowerCase();
    const currentCategory = (selectedCategory || 'todos').toLowerCase();

    return safeStock.filter((item) => {
      const name = (item?.name || '').toLowerCase();
      const category = (item?.category || '').toLowerCase();
      const matchesSearch = !search || name.includes(search);
      const matchesCategory =
        currentCategory === 'todos' ||
        category === currentCategory;
      const qty = typeof item?.quantity === 'number' ? item.quantity : 0;
      const minQty = typeof item?.minQuantity === 'number' ? item.minQuantity : 0;
      const matchesLowStock = !filterLowStockOnly || qty <= minQty;

      return matchesSearch && matchesCategory && matchesLowStock;
    });
  }, [safeStock, searchTerm, selectedCategory, filterLowStockOnly]);

  const handleOpenEdit = (item: StockItem) => {
    setEditingItem(item);
    setEditQty(item.quantity);
    setEditMinQty(item.minQuantity);
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;
    updateStockQuantity(editingItem.id, editQty);
    updateStockThreshold(editingItem.id, editMinQty);
    const itemName = editingItem.name;
    setEditingItem(null);
    setFeedbackMsg(`Estoque de "${itemName}" salvo com sucesso (${editQty} ${editingItem.unit})!`);
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 4000);
  };

  const handleCreateStockItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    let finalName = newItemName.trim();
    if (newItemCategory === 'Sorvete' && !finalName.toLowerCase().startsWith('sorvete:')) {
      finalName = `Sorvete: ${finalName}`;
    } else if (newItemCategory === 'Picolé' && !finalName.toLowerCase().startsWith('picolé:') && !finalName.toLowerCase().startsWith('picole:')) {
      finalName = `Picolé: ${finalName}`;
    }

    addStockItem({
      name: finalName,
      category: newItemCategory,
      quantity: Math.max(0, newItemQty),
      minQuantity: Math.max(1, newItemMinQty),
      unit: newItemUnit
    });

    setIsAddModalOpen(false);
    setNewItemName('');
    setFeedbackMsg(`Item "${finalName}" adicionado e salvo no estoque com sucesso!`);
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 5000);
  };

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full p-3 sm:p-6 space-y-4 overflow-y-auto pb-24 sm:pb-6">
      {/* Top Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-stone-800 font-['Quicksand',sans-serif]">
            Controle de Estoque
          </h2>
          <p className="text-xs sm:text-sm text-stone-500">
            Gerencie as quantidades disponíveis de sabores de sorvetes, picolés e bebidas
          </p>
        </div>

        {/* Metric Badges and Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3.5 py-2 rounded-2xl bg-white border border-stone-200/80 shadow-2xs flex items-center gap-2">
            <Package className="w-4 h-4 text-stone-500" />
            <div className="text-xs">
              <span className="text-stone-400 block text-[10px]">Total de Itens</span>
              <span className="font-bold text-stone-800">{totalItems} cadastrados</span>
            </div>
          </div>

          <button
            id="filter-low-stock-btn"
            onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
            className={`px-3.5 py-2 rounded-2xl border transition-all cursor-pointer flex items-center gap-2 ${
              filterLowStockOnly
                ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-xs ring-2 ring-amber-200'
                : lowStockItems.length > 0
                ? 'bg-amber-50/80 border-amber-200 text-amber-800 hover:bg-amber-100'
                : 'bg-white border-stone-200 text-stone-600'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <div className="text-xs text-left">
              <span className="text-amber-700 block text-[10px]">Estoque Baixo</span>
              <span className="font-bold">{lowStockItems.length} itens em alerta</span>
            </div>
          </button>

          <button
            id="open-add-stock-modal-btn"
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer select-none ml-auto sm:ml-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Novo Item / Sabor</span>
          </button>
        </div>
      </div>

      {/* Persistent Feedback Notification Banner */}
      {feedbackMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-xs sm:text-sm text-emerald-800 animate-in fade-in slide-in-from-top-2 duration-200 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{feedbackMsg}</span>
        </div>
      )}

      {/* Banner alert if low stock items exist */}
      {lowStockItems.length > 0 && !filterLowStockOnly && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 via-rose-50 to-amber-50 border border-amber-200/80 flex items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2.5 text-amber-900">
            <span className="w-7 h-7 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 text-amber-700">
              <AlertTriangle className="w-4 h-4" />
            </span>
            <span>
              <strong>Atenção:</strong> Há <strong>{lowStockItems.length}</strong> produtos ou sabores abaixo do limite mínimo de estoque.
            </span>
          </div>

          <button
            onClick={() => setFilterLowStockOnly(true)}
            className="shrink-0 px-3 py-1 rounded-xl bg-amber-200/80 hover:bg-amber-300 text-amber-900 font-medium text-xs transition-colors cursor-pointer"
          >
            Filtrar Alertas
          </button>
        </div>
      )}

      {/* Filter and Search Controls */}
      <div className="bg-white rounded-3xl p-4 border border-rose-100/90 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              id="search-stock-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar sabor ou produto..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-300 focus:bg-white"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 no-scrollbar">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'sorvete', label: 'Sorvetes' },
              { id: 'picolé', label: 'Picolés' },
              { id: 'bebida', label: 'Bebidas' },
              { id: 'sobremesa', label: 'Sobremesas' }
            ].map((cat) => (
              <button
                key={cat.id}
                id={`cat-stock-${cat.id}`}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-rose-500 text-white font-semibold shadow-2xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stock Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-stone-200/80 text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                <th className="py-3 px-3">Produto / Sabor</th>
                <th className="py-3 px-3">Categoria</th>
                <th className="py-3 px-3">Qtd. Atual</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-center">Reposição Rápida</th>
                <th className="py-3 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-xs sm:text-sm text-stone-700">
              {filteredStock.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-stone-400">
                    Nenhum item encontrado no estoque com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredStock.map((item, index) => {
                  const isLow = (item.quantity ?? 0) <= (item.minQuantity ?? 0);
                  const isZero = (item.quantity ?? 0) === 0;
                  const itemKey = item.id ? `stock-${item.id}-${index}` : `stock-row-${index}-${item.name || 'item'}`;

                  return (
                    <tr
                      key={itemKey}
                      id={`stock-row-${item.id || index}`}
                      className={`hover:bg-amber-50/30 transition-colors ${
                        isLow ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      {/* Name */}
                      <td className="py-3 px-3 font-semibold text-stone-800">
                        <div className="flex items-center gap-2">
                          <span className="text-base">
                            {item.category === 'Sorvete'
                              ? '🍦'
                              : item.category === 'Picolé'
                              ? '🍡'
                              : item.category === 'Bebida'
                              ? '💧'
                              : '🍨'}
                          </span>
                          <span>{item.name}</span>
                        </div>
                      </td>

                      {/* Category badge */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                            item.category === 'Sorvete'
                              ? 'bg-rose-100 text-rose-800'
                              : item.category === 'Picolé'
                              ? 'bg-amber-100 text-amber-800'
                              : item.category === 'Bebida'
                              ? 'bg-sky-100 text-sky-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {item.category}
                        </span>
                      </td>

                      {/* Quantity */}
                      <td className="py-3 px-3">
                        <span className="font-extrabold text-sm sm:text-base font-mono">
                          {item.quantity}
                        </span>{' '}
                        <span className="text-stone-400 text-xs">{item.unit}</span>
                      </td>

                      {/* Status / Alert */}
                      <td className="py-3 px-3">
                        {isZero ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 text-red-700 font-semibold text-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                            Esgotado (0)
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-semibold text-xs border border-amber-200">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            Estoque Baixo (&le;{item.minQuantity})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Normal
                          </span>
                        )}
                      </td>

                      {/* Quick Adjust Buttons (+1, +5, +10) */}
                      <td className="py-3 px-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            id={`quick-dec-${item.id}`}
                            onClick={() => adjustStockQuantity(item.id, -1)}
                            disabled={item.quantity <= 0}
                            title="Subtrair 1"
                            className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <button
                            id={`quick-add1-${item.id}`}
                            onClick={() => adjustStockQuantity(item.id, 1)}
                            title="Adicionar 1"
                            className="px-2 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center text-xs font-semibold transition-colors cursor-pointer"
                          >
                            +1
                          </button>
                          <button
                            id={`quick-add5-${item.id}`}
                            onClick={() => adjustStockQuantity(item.id, 5)}
                            title="Adicionar 5"
                            className="px-2 h-7 rounded-lg bg-emerald-100/80 hover:bg-emerald-200 text-emerald-900 font-semibold text-xs transition-colors cursor-pointer"
                          >
                            +5
                          </button>
                          <button
                            id={`quick-add10-${item.id}`}
                            onClick={() => adjustStockQuantity(item.id, 10)}
                            title="Adicionar 10"
                            className="px-2 h-7 rounded-lg bg-emerald-200/80 hover:bg-emerald-300 text-emerald-900 font-bold text-xs transition-colors cursor-pointer hidden sm:flex"
                          >
                            +10
                          </button>
                        </div>
                      </td>

                      {/* Edit Button */}
                      <td className="py-3 px-3 text-right">
                        <button
                          id={`edit-stock-${item.id}`}
                          onClick={() => handleOpenEdit(item)}
                          className="px-3 py-1.5 rounded-xl border border-stone-200 hover:border-rose-300 bg-white hover:bg-rose-50 text-stone-700 hover:text-rose-600 text-xs font-medium inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Stock Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/40 backdrop-blur-xs">
          <div 
            className="bg-white w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-xl border border-rose-100 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-rose-500" />
                <h3 className="font-bold text-stone-800 text-base font-['Quicksand',sans-serif]">
                  Ajustar Estoque
                </h3>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <p className="font-semibold text-stone-800 text-sm">{editingItem.name}</p>
              <p className="text-xs text-stone-500">
                Categoria: {editingItem.category} • Unidade de medida: {editingItem.unit}
              </p>
            </div>

            {/* Quantity inputs */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-stone-600">
                  Quantidade Atual:
                </label>
                <input
                  type="number"
                  min="0"
                  value={editQty}
                  onChange={(e) => setEditQty(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 text-base font-bold font-mono bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-stone-600">
                  Estoque Mínimo (Alerta):
                </label>
                <input
                  type="number"
                  min="1"
                  value={editMinQty}
                  onChange={(e) => setEditMinQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 text-base font-bold font-mono bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 text-xs font-medium transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Alterações</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Add New Stock Item Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div 
            className="bg-white w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl border border-rose-100 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-stone-800 text-base font-['Quicksand',sans-serif]">
                  Adicionar Item ao Estoque
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStockItem} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Nome do Produto ou Sabor:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Sorvete: Pistache, Picolé: Coco, Refrigerante Lata"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Categoria:
                  </label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => {
                      const cat = e.target.value as 'Sorvete' | 'Picolé' | 'Bebida' | 'Sobremesa';
                      setNewItemCategory(cat);
                      if (cat === 'Sorvete') setNewItemUnit('bolas');
                      else if (cat === 'Picolé' || cat === 'Bebida') setNewItemUnit('unidades');
                      else setNewItemUnit('porções');
                    }}
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 font-medium"
                  >
                    <option value="Sorvete">Sorvete</option>
                    <option value="Picolé">Picolé</option>
                    <option value="Bebida">Bebida</option>
                    <option value="Sobremesa">Sobremesa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Unidade de Medida:
                  </label>
                  <input
                    type="text"
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                    placeholder="bolas, unidades, etc."
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Qtd. Inicial:
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newItemQty}
                    onChange={(e) => setNewItemQty(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 text-sm font-mono font-bold bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Qtd. Mínima (Alerta):
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newItemMinQty}
                    onChange={(e) => setNewItemMinQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 text-sm font-mono font-bold bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 text-xs font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  id="confirm-add-stock-btn"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Cadastrar no Estoque</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
