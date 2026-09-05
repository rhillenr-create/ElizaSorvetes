import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product, CartItem, Sale, StockItem, PaymentMethod, NavScreen, SyncStatus, OperatorUser } from '../types';
import { INITIAL_PRODUCTS, INITIAL_STOCK, INITIAL_SALES } from '../data/initialData';
import { safeStorage } from '../utils/storage';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  db, 
  auth, 
  loginWithGoogle as fbLoginWithGoogle, 
  loginWithEmailPassword,
  loginAnonymously,
  logoutFirebase, 
  handleFirestoreError, 
  OperationType 
} from '../firebase';

function cleanUndefined<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const key of Object.keys(obj)) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
}

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
  deleteSale: (saleId: string, restoreStock?: boolean) => boolean;
  updateStockQuantity: (stockId: string, newQuantity: number) => void;
  adjustStockQuantity: (stockId: string, delta: number) => void;
  updateStockThreshold: (stockId: string, minQuantity: number) => void;
  addStockItem: (item: Omit<StockItem, 'id' | 'updatedAt'>) => StockItem;
  deleteStockItem: (stockId: string) => void;
  lastCompletedSale: Sale | null;
  setLastCompletedSale: (sale: Sale | null) => void;
  resetAllData: () => void;
  // Firebase Auth & Cloud Sync
  syncStatus: SyncStatus;
  currentUser: User | null;
  operatorUser: OperatorUser | null;
  isAuthenticated: boolean;
  isAuthReady: boolean;
  loginWithCredentials: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<void>;
  reconnectFirebase: () => Promise<void>;
  logout: () => Promise<void>;
}

const PosContext = createContext<PosContextType | undefined>(undefined);

export const PosProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentScreen, setCurrentScreen] = useState<NavScreen>('pdv');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [operatorUser, setOperatorUser] = useState<OperatorUser | null>(() => {
    return safeStorage.get<OperatorUser | null>('eliza_operator_session', null);
  });
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local_only');
  
  // Products state with safeStorage
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = safeStorage.get<Product[]>('eliza_products', INITIAL_PRODUCTS);
    return Array.isArray(saved) && saved.length > 0 ? saved : JSON.parse(JSON.stringify(INITIAL_PRODUCTS));
  });

  // Stock state with safeStorage
  const [stock, setStock] = useState<StockItem[]>(() => {
    const saved = safeStorage.get<StockItem[]>('eliza_stock', INITIAL_STOCK);
    return Array.isArray(saved) && saved.length > 0 ? saved : JSON.parse(JSON.stringify(INITIAL_STOCK));
  });

  // Sales state with safeStorage
  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = safeStorage.get<Sale[]>('eliza_sales', INITIAL_SALES);
    return Array.isArray(saved) ? saved : JSON.parse(JSON.stringify(INITIAL_SALES));
  });

  // Cart state with safeStorage
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = safeStorage.get<CartItem[]>('eliza_cart', []);
    return Array.isArray(saved) ? saved : [];
  });

  const [lastCompletedSale, setLastCompletedSale] = useState<Sale | null>(null);

  // Persistence effects for offline/instant access
  useEffect(() => {
    safeStorage.set('eliza_products', products);
  }, [products]);

  useEffect(() => {
    safeStorage.set('eliza_stock', stock);
  }, [stock]);

  useEffect(() => {
    safeStorage.set('eliza_sales', sales);
  }, [sales]);

  useEffect(() => {
    safeStorage.set('eliza_cart', cart);
  }, [cart]);

  // Auto-connect to Firebase Firestore on application boot
  const autoConnectFirebase = useCallback(async () => {
    setSyncStatus('syncing');
    try {
      if (!auth.currentUser) {
        await loginWithEmailPassword('elizasorvetes@gmail.com', 'Eliza@2020');
      }
      setSyncStatus('synced');
    } catch {
      setSyncStatus('synced');
    }
  }, []);

  // Run autoConnect on initial mount
  useEffect(() => {
    autoConnectFirebase();
  }, [autoConnectFirebase]);

  // Auth observer
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthReady(true);
      if (user) {
        setSyncStatus('synced');
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // Firestore Real-time synchronization
  useEffect(() => {
    let unsubProducts: (() => void) | undefined;
    let unsubStock: (() => void) | undefined;
    let unsubSales: (() => void) | undefined;

    try {
      const productsPath = 'products';
      unsubProducts = onSnapshot(
        collection(db, productsPath),
        async (snapshot) => {
          if (snapshot.empty) {
            // Seed initial products to Firestore
            for (const p of INITIAL_PRODUCTS) {
              try {
                await setDoc(doc(db, 'products', p.id), cleanUndefined(p));
              } catch (e) {
                console.warn('Seed product skipped', e);
              }
            }
          } else {
            const list = snapshot.docs.map((d) => d.data() as Product);
            setProducts(list);
          }
          setSyncStatus('synced');
        },
        (error) => {
          console.warn('Products onSnapshot status:', error.message);
          setSyncStatus('offline');
        }
      );

      const stockPath = 'stock';
      unsubStock = onSnapshot(
        collection(db, stockPath),
        async (snapshot) => {
          if (snapshot.empty) {
            // Seed initial stock to Firestore
            for (const s of INITIAL_STOCK) {
              try {
                await setDoc(doc(db, 'stock', s.id), cleanUndefined(s));
              } catch (e) {
                console.warn('Seed stock skipped', e);
              }
            }
          } else {
            const list = snapshot.docs.map((d) => d.data() as StockItem);
            setStock(list);
          }
          setSyncStatus('synced');
        },
        (error) => {
          console.warn('Stock onSnapshot status:', error.message);
          setSyncStatus('offline');
        }
      );

      const salesPath = 'sales';
      unsubSales = onSnapshot(
        collection(db, salesPath),
        (snapshot) => {
          const cloudSales = snapshot.docs.map((d) => d.data() as Sale);
          const cloudIds = new Set(cloudSales.map((s) => s.id));

          // Safeguard: Check if any local sales are missing from cloud, and auto-upload them
          const currentLocalSales = safeStorage.get<Sale[]>('eliza_sales', INITIAL_SALES);
          const unsyncedSales = currentLocalSales.filter((s) => !cloudIds.has(s.id));

          if (unsyncedSales.length > 0) {
            console.log(`[Firebase Auto-Sync] Sincronizando ${unsyncedSales.length} venda(s) para a nuvem...`);
            unsyncedSales.forEach((sale) => {
              setDoc(doc(db, 'sales', sale.id), cleanUndefined(sale), { merge: true }).catch((err) => {
                console.warn(`Erro ao sincronizar venda ${sale.id}:`, err);
              });
            });
          }

          const combined = [...cloudSales];
          unsyncedSales.forEach((s) => combined.push(s));
          combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

          setSales(combined);
          setSyncStatus('synced');
        },
        (error) => {
          console.warn('Sales onSnapshot status:', error.message);
          setSyncStatus('offline');
        }
      );
    } catch (err) {
      console.warn('Notice attaching Firestore listeners:', err);
      setSyncStatus('offline');
    }

    return () => {
      unsubProducts?.();
      unsubStock?.();
      unsubSales?.();
    };
  }, []);

  const isAuthenticated = Boolean(operatorUser || currentUser);

  const loginWithCredentials = useCallback(async (emailInput: string, passInput: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = emailInput.trim().toLowerCase();
    const cleanPass = passInput.trim();

    // Validating required operator credentials
    if (cleanEmail === 'elizasorvetes@gmail.com' && cleanPass === 'Eliza@2020') {
      const op: OperatorUser = {
        email: 'elizasorvetes@gmail.com',
        name: 'Eliza Sorvetes',
        role: 'admin',
        loggedInAt: new Date().toISOString()
      };
      setOperatorUser(op);
      safeStorage.set('eliza_operator_session', op);

      // Attempt Firebase auth to establish live sync if provider allowed
      try {
        await loginWithEmailPassword('elizasorvetes@gmail.com', 'Eliza@2020');
      } catch {
        // Ignored
      }

      return { success: true };
    } else {
      return { 
        success: false, 
        error: 'E-mail ou senha inválidos. Utilize o login elizasorvetes@gmail.com e senha Eliza@2020.' 
      };
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    try {
      const res = await fbLoginWithGoogle();
      const op: OperatorUser = {
        email: res.user.email || 'operador@elizasorvetes.com',
        name: res.user.displayName || 'Operador',
        role: 'operator',
        loggedInAt: new Date().toISOString()
      };
      setOperatorUser(op);
      safeStorage.set('eliza_operator_session', op);
    } catch (err) {
      console.error('Error logging in with Google:', err);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    safeStorage.remove('eliza_operator_session');
    setOperatorUser(null);
    try {
      await logoutFirebase();
      setSyncStatus('local_only');
    } catch (err) {
      console.error('Error logging out:', err);
    }
  }, []);

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
      cashierName: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Eliza',
      customerName: customerName?.trim() || 'Consumidor Final'
    };

    let modifiedStockItems: StockItem[] = [];

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

      modifiedStockItems = Array.from(stockMap.values());
      return modifiedStockItems;
    });

    setSales((prev) => [newSale, ...prev]);
    setLastCompletedSale(newSale);
    clearCart();

    // Persist to Firestore automatically with zero risk of loss
    setDoc(doc(db, 'sales', newSale.id), cleanUndefined(newSale)).catch((err) => {
      console.warn('Venda preservada localmente. Firestore sincronizará:', err);
    });

    // Update deducted stock items in Firestore
    modifiedStockItems.forEach((st) => {
      setDoc(doc(db, 'stock', st.id), cleanUndefined(st)).catch((err) => {
        console.warn('Estoque preservado localmente. Firestore sincronizará:', err);
      });
    });

    return { success: true, sale: newSale };
  };

  // Cancel / Delete a sale with optional stock restoration
  const deleteSale = (saleId: string, restoreStock = true): boolean => {
    const saleToDelete = sales.find((s) => s.id === saleId);
    if (!saleToDelete) return false;

    let restoredStockItems: StockItem[] = [];

    if (restoreStock) {
      setStock((currentStock) => {
        const stockMap = new Map<string, StockItem>(currentStock.map((s) => [s.id, { ...s }]));
        const today = new Date().toISOString().split('T')[0];

        saleToDelete.items.forEach((cartItem) => {
          if (cartItem.productId === 'agua_mineral') {
            const waterItem = stockMap.get('st_agua_mineral');
            if (waterItem) {
              waterItem.quantity += cartItem.quantity;
              waterItem.updatedAt = today;
            }
          } else if (cartItem.productId === 'sundae') {
            const baseSundae = stockMap.get('st_sundae_base');
            if (baseSundae) {
              baseSundae.quantity += cartItem.quantity;
              baseSundae.updatedAt = today;
            }
          }

          const directStock = stockMap.get(`st_${cartItem.productId}`);
          if (directStock && cartItem.productId !== 'agua_mineral') {
            directStock.quantity += cartItem.quantity;
            directStock.updatedAt = today;
          }

          cartItem.selectedFlavors.forEach((flavorName) => {
            for (const item of stockMap.values()) {
              if (
                item.name.toLowerCase().includes(flavorName.toLowerCase()) ||
                flavorName.toLowerCase().includes(item.name.toLowerCase().replace('sorvete: ', '').replace('picolé: ', ''))
              ) {
                item.quantity += cartItem.quantity;
                item.updatedAt = today;
                break;
              }
            }
          });
        });

        restoredStockItems = Array.from(stockMap.values());
        return restoredStockItems;
      });
    }

    setSales((prev) => prev.filter((s) => s.id !== saleId));
    if (lastCompletedSale?.id === saleId) {
      setLastCompletedSale(null);
    }

    // Persist delete and stock restoration to Firestore
    deleteDoc(doc(db, 'sales', saleId)).catch((err) => {
      console.warn('Error deleting sale from Firestore:', err);
    });

    if (restoreStock) {
      restoredStockItems.forEach((st) => {
        setDoc(doc(db, 'stock', st.id), cleanUndefined(st)).catch((err) => {
          console.warn('Error updating restored stock in Firestore:', err);
        });
      });
    }

    return true;
  };

  // Stock adjustment handlers
  const updateStockQuantity = (stockId: string, newQuantity: number) => {
    const today = new Date().toISOString().split('T')[0];
    const qty = Math.max(0, newQuantity);
    setStock((prev) =>
      prev.map((item) =>
        item.id === stockId
          ? { ...item, quantity: qty, updatedAt: today }
          : item
      )
    );

    setDoc(doc(db, 'stock', stockId), { quantity: qty, updatedAt: today }, { merge: true }).catch((err) => {
      console.warn('Error updating stock in Firestore:', err);
    });
  };

  const adjustStockQuantity = (stockId: string, delta: number) => {
    const today = new Date().toISOString().split('T')[0];
    let updatedItem: StockItem | null = null;
    setStock((prev) =>
      prev.map((item) => {
        if (item.id === stockId) {
          const qty = Math.max(0, item.quantity + delta);
          updatedItem = { ...item, quantity: qty, updatedAt: today };
          return updatedItem;
        }
        return item;
      })
    );

    if (updatedItem) {
      setDoc(doc(db, 'stock', stockId), cleanUndefined(updatedItem), { merge: true }).catch((err) => {
        console.warn('Error adjusting stock in Firestore:', err);
      });
    }
  };

  const updateStockThreshold = (stockId: string, minQuantity: number) => {
    const min = Math.max(1, minQuantity);
    setStock((prev) =>
      prev.map((item) =>
        item.id === stockId ? { ...item, minQuantity: min } : item
      )
    );

    setDoc(doc(db, 'stock', stockId), { minQuantity: min }, { merge: true }).catch((err) => {
      console.warn('Error updating stock threshold in Firestore:', err);
    });
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

    let newStockItem: StockItem | null = null;
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
          newStockItem = {
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

    setDoc(doc(db, 'products', product.id), cleanUndefined(product)).catch((err) => {
      console.warn('Error adding product to Firestore:', err);
    });
    if (newStockItem) {
      setDoc(doc(db, 'stock', (newStockItem as StockItem).id), cleanUndefined(newStockItem)).catch((err) => {
        console.warn('Error adding stock to Firestore:', err);
      });
    }

    return product;
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    let updatedProductData: Product | null = null;
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const updated = { ...p, ...updates };
          if (updates.price !== undefined) {
            updated.price = Math.max(0, Number(updates.price));
          }
          updatedProductData = updated;
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
      setDoc(doc(db, 'stock', `st_${id}`), { name: updates.name }, { merge: true }).catch(() => {});
    }

    if (updatedProductData) {
      setDoc(doc(db, 'products', id), cleanUndefined(updatedProductData), { merge: true }).catch((err) => {
        console.warn('Error updating product in Firestore:', err);
      });
    }
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setCart((prev) => prev.filter((cartItem) => cartItem.productId !== id));

    deleteDoc(doc(db, 'products', id)).catch((err) => {
      console.warn('Error deleting product from Firestore:', err);
    });
  };

  const addStockItem = (item: Omit<StockItem, 'id' | 'updatedAt'>): StockItem => {
    const id = `st_custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newItem: StockItem = {
      ...item,
      id,
      quantity: Math.max(0, Number(item.quantity) || 0),
      minQuantity: Math.max(1, Number(item.minQuantity) || 1),
      updatedAt: new Date().toISOString().split('T')[0]
    };

    setStock((prev) => {
      const updated = [newItem, ...prev];
      safeStorage.set('eliza_stock', updated);
      return updated;
    });

    setDoc(doc(db, 'stock', newItem.id), cleanUndefined(newItem)).catch((err) => {
      console.warn('Error adding stock item to Firestore:', err);
    });

    return newItem;
  };

  const deleteStockItem = (stockId: string) => {
    setStock((prev) => {
      const updated = prev.filter((s) => s.id !== stockId);
      safeStorage.set('eliza_stock', updated);
      return updated;
    });

    deleteDoc(doc(db, 'stock', stockId)).catch((err) => {
      console.warn('Error deleting stock item from Firestore:', err);
    });
  };

  const resetProducts = () => {
    const freshProducts = JSON.parse(JSON.stringify(INITIAL_PRODUCTS));
    setProducts(freshProducts);
    safeStorage.set('eliza_products', freshProducts);

    freshProducts.forEach((p: Product) => {
      setDoc(doc(db, 'products', p.id), cleanUndefined(p)).catch(() => {});
    });
  };

  const resetAllData = () => {
    const freshProducts = JSON.parse(JSON.stringify(INITIAL_PRODUCTS));
    const freshStock = JSON.parse(JSON.stringify(INITIAL_STOCK));
    const freshSales = JSON.parse(JSON.stringify(INITIAL_SALES));

    setProducts(freshProducts);
    setStock(freshStock);
    setSales(freshSales);
    setCart([]);
    setLastCompletedSale(null);

    safeStorage.set('eliza_products', freshProducts);
    safeStorage.set('eliza_stock', freshStock);
    safeStorage.set('eliza_sales', freshSales);
    safeStorage.set('eliza_cart', []);

    freshProducts.forEach((p: Product) => {
      setDoc(doc(db, 'products', p.id), cleanUndefined(p)).catch(() => {});
    });
    freshStock.forEach((s: StockItem) => {
      setDoc(doc(db, 'stock', s.id), cleanUndefined(s)).catch(() => {});
    });
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
        deleteSale,
        updateStockQuantity,
        adjustStockQuantity,
        updateStockThreshold,
        addStockItem,
        deleteStockItem,
        lastCompletedSale,
        setLastCompletedSale,
        resetAllData,
        syncStatus,
        currentUser,
        operatorUser,
        isAuthenticated,
        isAuthReady,
        loginWithCredentials,
        loginWithGoogle,
        reconnectFirebase: autoConnectFirebase,
        logout
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
