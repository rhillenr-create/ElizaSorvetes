import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, CartItem, Sale, StockItem, PaymentMethod, NavScreen } from '../types';
import { INITIAL_PRODUCTS, INITIAL_STOCK, INITIAL_SALES } from '../data/initialData';

interface PosContextType {
  currentScreen: NavScreen;
  setCurrentScreen: (screen: NavScreen) => void;
  products: Product[];
  addProduct: (product: Omit<Product, 'id'> & { id?: string }) => Product;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  resetProducts: () => void;
  stock: StockItem[];
  cart: CartItem[];
  sales: Sale[];
  addToCart: (product: Product, flavors: string[], quantity?: number) => void;
  removeFromCart: (cartId: string) => void;
  updateCartQuantity: (cartId: string, delta: number) => void;
  clearCart: () => void;
  cartSubtotal: number;
  cartTotalCount: number;
  finalizeSale: (
    paymentMethod: PaymentMethod,
    amountReceived?: number,
    customerName?: string
  ) => { success: boolean; sale?: Sale; error?: string };
  updateStockQuantity: (stockId: string, newQuantity: number) => void;
  adjustStockQuantity: (stockId: string, delta: number) => void;
  updateStockThreshold: (stockId: string, minQuantity: number) => void;
  lastCompletedSale: Sale | null;
  setLastCompletedSale: (sale: Sale | null) => void;
  resetAllData: () => void;
}

const PosContext = createContext<PosContextType | undefined>(undefined);

export const PosProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentScreen, setCurrentScreen] = useState<NavScreen>('pdv');
  
  // Products state with localStorage
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('eliza_products');
      return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  });

  // Stock state with localStorage
  const [stock, setStock] = useState<StockItem[]>(() => {
    try {
      const saved = localStorage.getItem('eliza_stock');
      return saved ? JSON.parse(saved) : INITIAL_STOCK;
    } catch {
      return INITIAL_STOCK;
    }
  });

  // Sales state with localStorage
  const [sales, setSales] = useState<Sale[]>(() => {
    try {
      const saved = localStorage.getItem('eliza_sales');
      return saved ? JSON.parse(saved) : INITIAL_SALES;
    } catch {
      return INITIAL_SALES;
    }
  });

  // Cart state
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('eliza_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [lastCompletedSale, setLastCompletedSale] = useState<Sale | null>(null);

  // Persistence effects
  useEffect(() => {
    try {
      localStorage.setItem('eliza_products', JSON.stringify(products));
    } catch (e) {
      console.error('Failed to save products', e);
    }
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem('eliza_stock', JSON.stringify(stock));
    } catch (e) {
      console.error('Failed to save stock', e);
    }
  }, [stock]);

  useEffect(() => {
    try {
      localStorage.setItem('eliza_sales', JSON.stringify(sales));
    } catch (e) {
      console.error('Failed to save sales', e);
    }
  }, [sales]);

  useEffect(() => {
    try {
      localStorage.setItem('eliza_cart', JSON.stringify(cart));
    } catch (e) {
      console.error('Failed to save cart', e);
    }
  }, [cart]);

  // Add to cart
  const addToCart = (product: Product, flavors: string[], quantity = 1) => {
    const sortedFlavors = [...flavors].sort();
    setCart((prev) => {
      // Check if item with exact same product and flavors exists
      const existingIndex = prev.findIndex(
        (item) =>
          item.productId === product.id &&
          item.selectedFlavors.length === sortedFlavors.length &&
          [...item.selectedFlavors].sort().every((f, i) => f === sortedFlavors[i])
      );

      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity
        };
        return updated;
      }

      const newItem: CartItem = {
        cartId: `cart_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        productId: product.id,
        productName: product.name,
        price: product.price,
        quantity,
        selectedFlavors: sortedFlavors
      };

      return [...prev, newItem];
    });
  };

  const removeFromCart = (cartId: string) => {
    setCart((prev) => prev.filter((item) => item.cartId !== cartId));
  };

  const updateCartQuantity = (cartId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.cartId === cartId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartTotalCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Finalize Sale & Decrement stock
  const finalizeSale = (
    paymentMethod: PaymentMethod,
    amountReceived?: number,
    customerName?: string
  ): { success: boolean; sale?: Sale; error?: string } => {
    if (cart.length === 0) {
      return { success: false, error: 'O carrinho está vazio.' };
    }

    const total = cartSubtotal;
    let change = 0;

    if (paymentMethod === 'dinheiro') {
      if (!amountReceived || amountReceived < total) {
        return {
          success: false,
          error: `Valor em dinheiro insuficiente. Faltam R$ ${(total - (amountReceived || 0)).toFixed(2).replace('.', ',')}`
        };
      }
      change = Number((amountReceived - total).toFixed(2));
    }

    const now = new Date();
    const saleNumber = 1000 + sales.length + 1;
    const newSale: Sale = {
      id: `VENDA-${saleNumber}`,
      timestamp: now.toISOString(),
      items: [...cart],
      subtotal: total,
      discount: 0,
      total,
      paymentMethod,
      amountReceived: paymentMethod === 'dinheiro' ? amountReceived : undefined,
      change: paymentMethod === 'dinheiro' ? change : undefined,
      cashierName: 'Eliza',
      customerName: customerName?.trim() || 'Consumidor Final'
    };

    // Deduct stock
    setStock((currentStock) => {
      const stockMap = new Map<string, StockItem>(currentStock.map((s) => [s.id, { ...s }]));

      cart.forEach((cartItem) => {
        // If product is water
        if (cartItem.productId === 'agua_mineral') {
          const waterItem = stockMap.get('st_agua_mineral');
          if (waterItem) {
            waterItem.quantity = Math.max(0, waterItem.quantity - cartItem.quantity);
            waterItem.updatedAt = new Date().toISOString().split('T')[0];
          }
        } else if (cartItem.productId === 'sundae') {
          const baseSundae = stockMap.get('st_sundae_base');
          if (baseSundae) {
            baseSundae.quantity = Math.max(0, baseSundae.quantity - cartItem.quantity);
            baseSundae.updatedAt = new Date().toISOString().split('T')[0];
          }
        }

        // Deduct based on chosen flavors
        cartItem.selectedFlavors.forEach((flavorName) => {
          // Find matching stock item by name containing flavor
          for (const item of stockMap.values()) {
            if (
              item.name.toLowerCase().includes(flavorName.toLowerCase()) ||
              flavorName.toLowerCase().includes(item.name.toLowerCase().replace('sorvete: ', '').replace('picolé: ', ''))
            ) {
              item.quantity = Math.max(0, item.quantity - cartItem.quantity);
              item.updatedAt = new Date().toISOString().split('T')[0];
              break;
            }
          }
        });
      });

      return Array.from(stockMap.values());
    });

    setSales((prev) => [newSale, ...prev]);
    setLastCompletedSale(newSale);
    clearCart();

    return { success: true, sale: newSale };
  };

  // Stock adjustment handlers
  const updateStockQuantity = (stockId: string, newQuantity: number) => {
    setStock((prev) =>
      prev.map((item) =>
        item.id === stockId
          ? { ...item, quantity: Math.max(0, newQuantity), updatedAt: new Date().toISOString().split('T')[0] }
          : item
      )
    );
  };

  const adjustStockQuantity = (stockId: string, delta: number) => {
    setStock((prev) =>
      prev.map((item) =>
        item.id === stockId
          ? { ...item, quantity: Math.max(0, item.quantity + delta), updatedAt: new Date().toISOString().split('T')[0] }
          : item
      )
    );
  };

  const updateStockThreshold = (stockId: string, minQuantity: number) => {
    setStock((prev) =>
      prev.map((item) =>
        item.id === stockId ? { ...item, minQuantity: Math.max(1, minQuantity) } : item
      )
    );
  };

  // Product management
  const addProduct = (newProduct: Omit<Product, 'id'> & { id?: string }): Product => {
    const id =
      newProduct.id || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const product: Product = {
      ...newProduct,
      id,
      price: Math.max(0, Number(newProduct.price) || 0)
    };

    setProducts((prev) => [...prev, product]);

    // If it's a product without flavors (e.g. beverage, packaged item), also register in stock
    if (!product.requiresFlavors) {
      setStock((prev) => {
        const exists = prev.some((s) => s.id === `st_${product.id}`);
        if (!exists) {
          const categoryName =
            product.category === 'bebida'
              ? 'Bebida'
              : product.category === 'sobremesa'
              ? 'Sobremesa'
              : product.category === 'picole'
              ? 'Picolé'
              : 'Sorvete';
          const newStockItem: StockItem = {
            id: `st_${product.id}`,
            name: product.name,
            category: categoryName,
            quantity: 20,
            minQuantity: 5,
            unit: product.category === 'bebida' ? 'unidades' : 'porções',
            updatedAt: new Date().toISOString().split('T')[0]
          };
          return [...prev, newStockItem];
        }
        return prev;
      });
    }

    return product;
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const updated = { ...p, ...updates };
          if (updates.price !== undefined) {
            updated.price = Math.max(0, Number(updates.price));
          }
          return updated;
        }
        return p;
      })
    );

    // Update items in open cart if matching product
    setCart((prev) =>
      prev.map((cartItem) => {
        if (cartItem.productId === id) {
          return {
            ...cartItem,
            productName: updates.name !== undefined ? updates.name : cartItem.productName,
            price: updates.price !== undefined ? Math.max(0, Number(updates.price)) : cartItem.price
          };
        }
        return cartItem;
      })
    );

    // Also update associated stock item name if it exists
    if (updates.name) {
      setStock((prev) =>
        prev.map((item) =>
          item.id === `st_${id}` ? { ...item, name: updates.name! } : item
        )
      );
    }
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setCart((prev) => prev.filter((cartItem) => cartItem.productId !== id));
  };

  const resetProducts = () => {
    setProducts(INITIAL_PRODUCTS);
    localStorage.removeItem('eliza_products');
  };

  const resetAllData = () => {
    resetProducts();
    setStock(INITIAL_STOCK);
    setSales(INITIAL_SALES);
    setCart([]);
    localStorage.removeItem('eliza_stock');
    localStorage.removeItem('eliza_sales');
    localStorage.removeItem('eliza_cart');
  };

  return (
    <PosContext.Provider
      value={{
        currentScreen,
        setCurrentScreen,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        resetProducts,
        stock,
        cart,
        sales,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        cartSubtotal,
        cartTotalCount,
        finalizeSale,
        updateStockQuantity,
        adjustStockQuantity,
        updateStockThreshold,
        lastCompletedSale,
        setLastCompletedSale,
        resetAllData
      }}
    >
      {children}
    </PosContext.Provider>
  );
};

export const usePos = () => {
  const context = useContext(PosContext);
  if (!context) {
    throw new Error('usePos must be used within a PosProvider');
  }
  return context;
};
