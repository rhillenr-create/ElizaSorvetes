import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Product, 
  CartItem, 
  Sale, 
  StockItem, 
  PaymentMethod, 
  NavScreen, 
  SyncStatus, 
  OperatorUser,
  CashShift,
  CashMovement,
  CashMovementType,
  SalesReport
} from '../types';
import { INITIAL_PRODUCTS, INITIAL_STOCK, INITIAL_SALES } from '../data/initialData';
import { safeStorage } from '../utils/storage';
import { 
  getBrazilDateString, 
  getBrazilMonthString,
  getBrazilIsoTimestamp, 
  generateBrazilTimestampId 
} from '../utils/dateUtils';
import { 
  buildDailySalesReport, 
  buildMonthlySalesReport, 
  getDistinctSaleDates,
  normalizeSalesReport,
  calculateShiftExpectedCash,
  normalizeCashShift
} from '../utils/reportGenerator';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs,
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

// Deep sanitization to ensure Firestore setDoc never fails due to undefined properties (even inside nested objects/arrays)
export function cleanForFirestore<T>(input: T): T {
  if (input === null || input === undefined) {
    return null as any;
  }
  if (Array.isArray(input)) {
    return input
      .filter((item) => item !== undefined)
      .map((item) => cleanForFirestore(item)) as any;
  }
  if (typeof input === 'object' && !(input instanceof Date)) {
    const result: any = {};
    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) {
        result[key] = cleanForFirestore(value);
      }
    }
    return result;
  }
  return input;
}

// Generate unique, collision-proof, chronological sale ID for Brazilian timezone
export function generateUniqueSaleId(existingSales: Sale[]): string {
  const now = new Date();
  const dateCompact = getBrazilDateString(now).replace(/-/g, '');
  const prefix = `VND-${dateCompact}-`;
  
  let maxSeq = 0;
  existingSales.forEach((s) => {
    if (s?.id && s.id.startsWith(prefix)) {
      const parts = s.id.split('-');
      if (parts.length >= 3) {
        const num = parseInt(parts[2], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }
  });

  const nextSeq = String(maxSeq + 1).padStart(3, '0');
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${nextSeq}-${randomSuffix}`;
}

// Reconcile open cash shift with sales from the database
export function reconcileShiftWithSales(
  shift: CashShift,
  allSales: Sale[]
): { updatedShift: CashShift; changed: boolean } {
  const shiftSales = allSales.filter((s) => {
    if (s.shiftId) {
      return s.shiftId === shift.id;
    }
    const saleTime = new Date(s.timestamp).getTime();
    const openTime = new Date(shift.openedAt).getTime();
    if (saleTime < openTime) {
      const saleDate = getBrazilDateString(s.timestamp);
      const shiftDate = getBrazilDateString(shift.openedAt);
      return saleDate === shiftDate;
    }
    if (shift.closedAt) {
      const closeTime = new Date(shift.closedAt).getTime();
      return saleTime <= closeTime;
    }
    return true;
  });

  const totalSalesCount = shiftSales.length;
  const totalSalesAmount = Number(shiftSales.reduce((acc, s) => acc + (s.total || 0), 0).toFixed(2));
  const totalCashSales = Number(shiftSales.filter((s) => s.paymentMethod === 'dinheiro').reduce((acc, s) => acc + (s.total || 0), 0).toFixed(2));
  const totalPixSales = Number(shiftSales.filter((s) => s.paymentMethod === 'pix').reduce((acc, s) => acc + (s.total || 0), 0).toFixed(2));
  const totalDebitSales = Number(shiftSales.filter((s) => s.paymentMethod === 'cartao_debito').reduce((acc, s) => acc + (s.total || 0), 0).toFixed(2));
  const totalCreditSales = Number(shiftSales.filter((s) => s.paymentMethod === 'cartao_credito').reduce((acc, s) => acc + (s.total || 0), 0).toFixed(2));

  const expectedCash = calculateShiftExpectedCash(
    shift.initialCash,
    totalCashSales,
    shift.movements
  );

  const changed =
    shift.totalSalesCount !== totalSalesCount ||
    Math.abs(shift.totalSalesAmount - totalSalesAmount) > 0.001 ||
    Math.abs(shift.totalCashSales - totalCashSales) > 0.001 ||
    Math.abs(shift.totalPixSales - totalPixSales) > 0.001 ||
    Math.abs(shift.totalDebitSales - totalDebitSales) > 0.001 ||
    Math.abs(shift.totalCreditSales - totalCreditSales) > 0.001 ||
    Math.abs(shift.expectedCash - expectedCash) > 0.001;

  const updatedShift: CashShift = {
    ...shift,
    totalSalesCount,
    totalSalesAmount,
    totalCashSales,
    totalPixSales,
    totalDebitSales,
    totalCreditSales,
    expectedCash
  };

  return { updatedShift, changed };
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
  deleteAllSales: () => Promise<boolean>;
  syncAllCatalogToDatabase: () => Promise<{ productsCount: number; stockCount: number }>;
  updateStockQuantity: (stockId: string, newQuantity: number) => void;
  adjustStockQuantity: (stockId: string, delta: number) => void;
  updateStockThreshold: (stockId: string, minQuantity: number) => void;
  addStockItem: (item: Omit<StockItem, 'id' | 'updatedAt'>) => StockItem;
  deleteStockItem: (stockId: string) => void;
  lastCompletedSale: Sale | null;
  setLastCompletedSale: (sale: Sale | null) => void;
  resetAllData: () => void;
  // Real-time Daily Revenue & Shift Statistics (Sincronizado automaticamente com o banco)
  todayRevenue: number;
  todaySalesCount: number;
  todayCashSales: number;
  todayPixSales: number;
  todayCardSales: number;
  todaySales: Sale[];
  shiftRevenue: number;
  shiftSalesCount: number;
  // Cash Register Shift Management
  activeShift: CashShift | null;
  shiftsHistory: CashShift[];
  openShift: (initialCash: number, operatorName: string, notes?: string) => Promise<CashShift>;
  closeShift: (countedCash: number, notes?: string, applyAdjustment?: boolean, adjustmentReason?: string) => Promise<CashShift>;
  addCashMovement: (type: CashMovementType, amount: number, reason: string, adjustmentType?: 'sobra' | 'falta') => Promise<void>;
  adjustCash: (amount: number, adjustmentType: 'sobra' | 'falta', reason: string) => Promise<void>;
  adjustCashToCounted: (countedCash: number, reason: string) => Promise<void>;
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
  // Sales Reports (Gravação Automática no Banco de Dados)
  salesReports: SalesReport[];
  isSavingReport: boolean;
  lastReportSyncTime: string | null;
  saveSalesReportForDate: (dateStr: string) => Promise<SalesReport | null>;
  saveAllReportsToDatabase: () => Promise<{ success: boolean; count: number }>;
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
    const saved = safeStorage.get<any[]>('eliza_stock', INITIAL_STOCK);
    if (Array.isArray(saved) && saved.length > 0) {
      return saved.map((s, idx) => ({
        id: String(s?.id || `st_init_${idx}`),
        name: String(s?.name || 'Item sem nome'),
        category: s?.category || 'Sorvete',
        quantity: typeof s?.quantity === 'number' ? s.quantity : 0,
        minQuantity: typeof s?.minQuantity === 'number' ? s.minQuantity : 5,
        unit: String(s?.unit || 'unidades'),
        updatedAt: s?.updatedAt,
        lastRestocked: s?.lastRestocked
      }));
    }
    return JSON.parse(JSON.stringify(INITIAL_STOCK));
  });

  // Sales state with safeStorage (defaults to empty or saved)
  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = safeStorage.get<Sale[]>('eliza_sales', INITIAL_SALES);
    return Array.isArray(saved) ? saved : [];
  });

  // Cart state with safeStorage
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = safeStorage.get<CartItem[]>('eliza_cart', []);
    return Array.isArray(saved) ? saved : [];
  });

  const [lastCompletedSale, setLastCompletedSale] = useState<Sale | null>(null);

  // Cash Register Shifts State
  const [activeShift, setActiveShift] = useState<CashShift | null>(() => {
    const saved = safeStorage.get<any>('eliza_active_shift', null);
    return saved ? normalizeCashShift(saved) : null;
  });

  const [shiftsHistory, setShiftsHistory] = useState<CashShift[]>(() => {
    const saved = safeStorage.get<any[]>('eliza_shifts_history', []);
    return Array.isArray(saved) ? saved.map(normalizeCashShift) : [];
  });

  // Sales Reports State (Relatórios consolidados gravados automaticamente no banco)
  const [salesReports, setSalesReports] = useState<SalesReport[]>(() => {
    const saved = safeStorage.get<any[]>('eliza_sales_reports', []);
    return Array.isArray(saved) ? saved.map(normalizeSalesReport) : [];
  });
  const [isSavingReport, setIsSavingReport] = useState<boolean>(false);
  const [lastReportSyncTime, setLastReportSyncTime] = useState<string | null>(null);

  // Faturamento do Dia em Tempo Real (Calculado e sincronizado com o banco de dados)
  const todayDate = getBrazilDateString();
  const todaySales = useMemo(() => {
    return sales.filter((s) => getBrazilDateString(s.timestamp) === todayDate);
  }, [sales, todayDate]);

  const todayRevenue = useMemo(() => {
    return Number(todaySales.reduce((sum, s) => sum + (s.total || 0), 0).toFixed(2));
  }, [todaySales]);

  const todaySalesCount = todaySales.length;

  const todayCashSales = useMemo(() => {
    return Number(todaySales.filter((s) => s.paymentMethod === 'dinheiro').reduce((sum, s) => sum + (s.total || 0), 0).toFixed(2));
  }, [todaySales]);

  const todayPixSales = useMemo(() => {
    return Number(todaySales.filter((s) => s.paymentMethod === 'pix').reduce((sum, s) => sum + (s.total || 0), 0).toFixed(2));
  }, [todaySales]);

  const todayCardSales = useMemo(() => {
    return Number(todaySales.filter((s) => s.paymentMethod === 'cartao_debito' || s.paymentMethod === 'cartao_credito').reduce((sum, s) => sum + (s.total || 0), 0).toFixed(2));
  }, [todaySales]);

  const shiftRevenue = useMemo(() => {
    return activeShift ? activeShift.totalSalesAmount : todayRevenue;
  }, [activeShift, todayRevenue]);

  const shiftSalesCount = useMemo(() => {
    return activeShift ? activeShift.totalSalesCount : todaySalesCount;
  }, [activeShift, todaySalesCount]);

  // Sincronização automática do Turno de Caixa em Aberto com as vendas do banco
  useEffect(() => {
    if (!activeShift || activeShift.status !== 'aberto') return;

    const { updatedShift, changed } = reconcileShiftWithSales(activeShift, sales);
    if (changed) {
      setActiveShift(updatedShift);
      safeStorage.set('eliza_active_shift', updatedShift);
      setDoc(doc(db, 'cash_shifts', updatedShift.id), cleanForFirestore(updatedShift), { merge: true }).catch((err) => {
        console.warn('Erro ao sincronizar turno com vendas no Firestore:', err);
      });
    }
  }, [sales, activeShift?.id, activeShift?.status, activeShift?.initialCash, activeShift?.movements]);

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

  useEffect(() => {
    safeStorage.set('eliza_active_shift', activeShift);
  }, [activeShift]);

  useEffect(() => {
    safeStorage.set('eliza_shifts_history', shiftsHistory);
  }, [shiftsHistory]);

  useEffect(() => {
    safeStorage.set('eliza_sales_reports', salesReports);
  }, [salesReports]);

  // Ensure ALL registered items are in Firestore database on boot
  useEffect(() => {
    const seedCatalogToFirestore = async () => {
      try {
        for (const p of INITIAL_PRODUCTS) {
          await setDoc(doc(db, 'products', p.id), cleanForFirestore(p), { merge: true });
        }
        for (const s of INITIAL_STOCK) {
          await setDoc(doc(db, 'stock', s.id), cleanForFirestore(s), { merge: true });
        }
      } catch (err) {
        console.warn('Notice seeding catalog:', err);
      }
    };
    seedCatalogToFirestore();
  }, []);

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
    let unsubShifts: (() => void) | undefined;
    let unsubReports: (() => void) | undefined;

    try {
      const productsPath = 'products';
      unsubProducts = onSnapshot(
        collection(db, productsPath),
        async (snapshot) => {
          if (!snapshot.empty) {
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
          if (!snapshot.empty) {
            const list = snapshot.docs.map((d) => {
              const data = d.data() as any;
              return {
                id: String(data?.id || d.id),
                name: String(data?.name || 'Item sem nome'),
                category: data?.category || 'Sorvete',
                quantity: typeof data?.quantity === 'number' ? data.quantity : 0,
                minQuantity: typeof data?.minQuantity === 'number' ? data.minQuantity : 5,
                unit: String(data?.unit || 'unidades'),
                updatedAt: data?.updatedAt,
                lastRestocked: data?.lastRestocked
              } as StockItem;
            });
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
          const cloudSales: Sale[] = snapshot.docs.map((d) => {
            const data = d.data() as any;
            return {
              id: String(data?.id || d.id),
              timestamp: String(data?.timestamp || getBrazilIsoTimestamp()),
              items: Array.isArray(data?.items) ? data.items : [],
              subtotal: typeof data?.subtotal === 'number' ? data.subtotal : (data?.total || 0),
              discount: typeof data?.discount === 'number' ? data.discount : 0,
              total: typeof data?.total === 'number' ? data.total : 0,
              paymentMethod: data?.paymentMethod || 'dinheiro',
              amountReceived: data?.amountReceived,
              change: data?.change,
              cashierName: data?.cashierName || 'Eliza',
              customerName: data?.customerName || 'Consumidor Final',
              shiftId: data?.shiftId || undefined
            } as Sale;
          });

          cloudSales.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

          setSales((currentLocal) => {
            const cloudIds = new Set(cloudSales.map((s) => s.id));
            const pendingLocal = currentLocal.filter((local) => !cloudIds.has(local.id));

            // Push pending local sales to Firestore so they are never lost
            if (pendingLocal.length > 0) {
              pendingLocal.forEach((p) => {
                setDoc(doc(db, 'sales', p.id), cleanForFirestore(p), { merge: true }).catch((e) => {
                  console.warn('Tentativa de sincronizar venda pendente:', p.id, e);
                });
              });
            }

            const combined = [...cloudSales, ...pendingLocal];
            combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            safeStorage.set('eliza_sales', combined);
            return combined;
          });

          setSyncStatus('synced');
        },
        (error) => {
          console.warn('Sales onSnapshot status:', error.message);
          setSyncStatus('offline');
        }
      );

      const shiftsPath = 'cash_shifts';
      unsubShifts = onSnapshot(
        collection(db, shiftsPath),
        (snapshot) => {
          const list = snapshot.docs.map((d) => normalizeCashShift(d.data()));
          list.sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
          
          const currentOpen = list.find((s) => s.status === 'aberto') || null;
          const closed = list.filter((s) => s.status === 'fechado');

          setActiveShift(currentOpen);
          safeStorage.set('eliza_active_shift', currentOpen);

          setShiftsHistory(closed);
          safeStorage.set('eliza_shifts_history', closed);
        },
        (error) => {
          console.warn('Cash shifts onSnapshot status:', error.message);
        }
      );

      const reportsPath = 'sales_reports';
      unsubReports = onSnapshot(
        collection(db, reportsPath),
        (snapshot) => {
          const list = snapshot.docs.map((d) => normalizeSalesReport(d.data()));
          list.sort((a, b) => (b.periodDate || '').localeCompare(a.periodDate || ''));
          setSalesReports(list);
          safeStorage.set('eliza_sales_reports', list);
          setLastReportSyncTime(getBrazilIsoTimestamp());
        },
        (error) => {
          console.warn('Sales reports onSnapshot status:', error.message);
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
      unsubShifts?.();
      unsubReports?.();
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
        loggedInAt: getBrazilIsoTimestamp()
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
        loggedInAt: getBrazilIsoTimestamp()
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

  // Helper para persistir relatório de vendas consolidado no Firestore e estado local
  const persistReportToFirestore = async (report: SalesReport): Promise<void> => {
    try {
      setSalesReports((prev) => {
        const idx = prev.findIndex((r) => r.id === report.id);
        const updated = idx >= 0 ? prev.map((r, i) => (i === idx ? report : r)) : [report, ...prev];
        safeStorage.set('eliza_sales_reports', updated);
        return updated;
      });
      await setDoc(doc(db, 'sales_reports', report.id), cleanForFirestore(report), { merge: true });
      setLastReportSyncTime(getBrazilIsoTimestamp());
    } catch (err) {
      console.warn(`Aviso ao gravar relatório ${report.id} no Firestore:`, err);
    }
  };

  // Salva ou atualiza relatório de vendas de uma data específica
  const saveSalesReportForDate = async (dateStr: string): Promise<SalesReport | null> => {
    try {
      setIsSavingReport(true);
      const existing = salesReports.find((r) => r.id === `REL-DIA-${dateStr}`);
      const dailyReport = buildDailySalesReport(dateStr, sales, operatorUser?.name, existing);
      await persistReportToFirestore(dailyReport);

      const monthStr = dateStr.slice(0, 7);
      const existingMonth = salesReports.find((r) => r.id === `REL-MES-${monthStr}`);
      const monthlyReport = buildMonthlySalesReport(monthStr, sales, operatorUser?.name, existingMonth);
      await persistReportToFirestore(monthlyReport);

      return dailyReport;
    } catch (err) {
      console.warn(`Erro ao consolidar relatório para data ${dateStr}:`, err);
      return null;
    } finally {
      setIsSavingReport(false);
    }
  };

  // Grava todos os relatórios pendentes/históricos no banco de dados
  const saveAllReportsToDatabase = async (): Promise<{ success: boolean; count: number }> => {
    try {
      setIsSavingReport(true);
      const distinctDates = getDistinctSaleDates(sales);
      const today = getBrazilDateString();
      if (!distinctDates.includes(today)) {
        distinctDates.push(today);
      }

      let count = 0;
      const distinctMonths = new Set<string>();

      for (const d of distinctDates) {
        const existing = salesReports.find((r) => r.id === `REL-DIA-${d}`);
        const report = buildDailySalesReport(d, sales, operatorUser?.name, existing);
        await persistReportToFirestore(report);
        count++;
        distinctMonths.add(d.slice(0, 7));
      }

      for (const m of distinctMonths) {
        const existingMonth = salesReports.find((r) => r.id === `REL-MES-${m}`);
        const monthlyReport = buildMonthlySalesReport(m, sales, operatorUser?.name, existingMonth);
        await persistReportToFirestore(monthlyReport);
        count++;
      }

      return { success: true, count };
    } catch (err) {
      console.error('Erro ao gravar todos os relatórios no banco:', err);
      return { success: false, count: 0 };
    } finally {
      setIsSavingReport(false);
    }
  };

  // Gravação automática contínua de relatórios no Firestore (executa quando as vendas mudam)
  useEffect(() => {
    if (!sales || sales.length === 0) return;

    const timer = setTimeout(() => {
      const today = getBrazilDateString();
      const existingTodayReport = salesReports.find((r) => r.id === `REL-DIA-${today}`);
      const todaySales = sales.filter((s) => getBrazilDateString(s.timestamp) === today);

      const needsUpdate =
        !existingTodayReport ||
        existingTodayReport.totalSalesCount !== todaySales.length ||
        Math.abs(existingTodayReport.totalRevenue - todaySales.reduce((sum, s) => sum + s.total, 0)) > 0.01;

      if (needsUpdate) {
        const newDaily = buildDailySalesReport(today, sales, operatorUser?.name, existingTodayReport);
        persistReportToFirestore(newDaily).catch(() => {});

        const currentMonth = today.slice(0, 7);
        const existingMonthReport = salesReports.find((r) => r.id === `REL-MES-${currentMonth}`);
        const newMonthly = buildMonthlySalesReport(currentMonth, sales, operatorUser?.name, existingMonthReport);
        persistReportToFirestore(newMonthly).catch(() => {});
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [sales, operatorUser?.name]);

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
    const todayDate = getBrazilDateString(now);
    const newSaleId = generateUniqueSaleId(sales);
    const newSale: Sale = {
      id: newSaleId,
      timestamp: getBrazilIsoTimestamp(now),
      items: [...cart],
      subtotal: total,
      discount: 0,
      total,
      paymentMethod,
      amountReceived: paymentMethod === 'dinheiro' ? amountReceived : undefined,
      change: paymentMethod === 'dinheiro' ? change : undefined,
      cashierName: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Eliza',
      customerName: customerName?.trim() || 'Consumidor Final',
      shiftId: activeShift?.id || undefined
    };

    // Calculate stock changes synchronously to ensure immediate Firestore persistence
    const currentStock = stock;
    const stockMap = new Map<string, StockItem>(currentStock.map((s) => [s.id, { ...s }]));

    cart.forEach((cartItem) => {
      // If product is water
      if (cartItem.productId === 'agua_mineral') {
        const waterItem = stockMap.get('st_agua_mineral');
        if (waterItem) {
          waterItem.quantity = Math.max(0, waterItem.quantity - cartItem.quantity);
          waterItem.updatedAt = todayDate;
        }
      } else if (cartItem.productId === 'sundae') {
        const baseSundae = stockMap.get('st_sundae_base');
        if (baseSundae) {
          baseSundae.quantity = Math.max(0, baseSundae.quantity - cartItem.quantity);
          baseSundae.updatedAt = todayDate;
        }
      }

      // Deduct based on chosen flavors
      cartItem.selectedFlavors.forEach((flavorName) => {
        if (!flavorName) return;
        const target = flavorName.toLowerCase();
        for (const item of stockMap.values()) {
          const itemName = (item?.name || '').toLowerCase();
          const cleanItemName = itemName.replace('sorvete: ', '').replace('picolé: ', '').replace('picole: ', '');
          if (
            itemName.includes(target) ||
            target.includes(cleanItemName)
          ) {
            item.quantity = Math.max(0, item.quantity - cartItem.quantity);
            item.updatedAt = todayDate;
            break;
          }
        }
      });
    });

    const modifiedStockItems = Array.from(stockMap.values());
    setStock(modifiedStockItems);
    safeStorage.set('eliza_stock', modifiedStockItems);

    const updatedSalesList = [newSale, ...sales];
    setSales(updatedSalesList);
    safeStorage.set('eliza_sales', updatedSalesList);
    setLastCompletedSale(newSale);
    clearCart();

    // If there is an active cash register shift, update the shift metrics immediately
    if (activeShift) {
      const updatedShift: CashShift = {
        ...activeShift,
        totalSalesCount: activeShift.totalSalesCount + 1,
        totalSalesAmount: Number((activeShift.totalSalesAmount + total).toFixed(2)),
        totalCashSales: paymentMethod === 'dinheiro' ? Number((activeShift.totalCashSales + total).toFixed(2)) : activeShift.totalCashSales,
        totalPixSales: paymentMethod === 'pix' ? Number((activeShift.totalPixSales + total).toFixed(2)) : activeShift.totalPixSales,
        totalDebitSales: paymentMethod === 'cartao_debito' ? Number((activeShift.totalDebitSales + total).toFixed(2)) : activeShift.totalDebitSales,
        totalCreditSales: paymentMethod === 'cartao_credito' ? Number((activeShift.totalCreditSales + total).toFixed(2)) : activeShift.totalCreditSales,
      };

      updatedShift.expectedCash = calculateShiftExpectedCash(
        updatedShift.initialCash,
        updatedShift.totalCashSales,
        updatedShift.movements
      );

      setActiveShift(updatedShift);
      safeStorage.set('eliza_active_shift', updatedShift);

      setDoc(doc(db, 'cash_shifts', updatedShift.id), cleanForFirestore(updatedShift), { merge: true }).catch((err) => {
        console.warn('Erro ao atualizar turno de caixa no Firestore:', err);
      });
    }

    // Persist to Firestore automatically with zero risk of loss
    setDoc(doc(db, 'sales', newSale.id), cleanForFirestore(newSale)).catch((err) => {
      console.warn('Venda preservada localmente. Firestore sincronizará:', err);
    });

    // Update deducted stock items in Firestore
    modifiedStockItems.forEach((st) => {
      setDoc(doc(db, 'stock', st.id), cleanForFirestore(st), { merge: true }).catch((err) => {
        console.warn('Estoque preservado localmente. Firestore sincronizará:', err);
      });
    });

    // Gravação automática dos relatórios consolidados de vendas no banco de dados (Firestore)
    const autoDailyReport = buildDailySalesReport(todayDate, updatedSalesList, operatorUser?.name);
    persistReportToFirestore(autoDailyReport).catch((err) => {
      console.warn('Gravação automática do relatório diário no Firestore falhou:', err);
    });
    const autoMonthlyReport = buildMonthlySalesReport(todayDate.slice(0, 7), updatedSalesList, operatorUser?.name);
    persistReportToFirestore(autoMonthlyReport).catch(() => {});

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
        const today = getBrazilDateString();

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
            if (!flavorName) return;
            const target = flavorName.toLowerCase();
            for (const item of stockMap.values()) {
              const itemName = (item?.name || '').toLowerCase();
              const cleanItemName = itemName.replace('sorvete: ', '').replace('picolé: ', '').replace('picole: ', '');
              if (
                itemName.includes(target) ||
                target.includes(cleanItemName)
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

    // Immediately remove from state and local storage
    setSales((prev) => {
      const updated = prev.filter((s) => s.id !== saleId);
      safeStorage.set('eliza_sales', updated);
      return updated;
    });

    if (lastCompletedSale?.id === saleId) {
      setLastCompletedSale(null);
    }

    // Adjust active cash shift metrics if applicable
    if (activeShift) {
      setActiveShift((currentShift) => {
        if (!currentShift) return null;
        const updatedShift: CashShift = {
          ...currentShift,
          totalSalesCount: Math.max(0, currentShift.totalSalesCount - 1),
          totalSalesAmount: Math.max(0, currentShift.totalSalesAmount - saleToDelete.total),
          totalCashSales: saleToDelete.paymentMethod === 'dinheiro' ? Math.max(0, currentShift.totalCashSales - saleToDelete.total) : currentShift.totalCashSales,
          totalPixSales: saleToDelete.paymentMethod === 'pix' ? Math.max(0, currentShift.totalPixSales - saleToDelete.total) : currentShift.totalPixSales,
          totalDebitSales: saleToDelete.paymentMethod === 'cartao_debito' ? Math.max(0, currentShift.totalDebitSales - saleToDelete.total) : currentShift.totalDebitSales,
          totalCreditSales: saleToDelete.paymentMethod === 'cartao_credito' ? Math.max(0, currentShift.totalCreditSales - saleToDelete.total) : currentShift.totalCreditSales,
        };

        const sumSuprimentos = updatedShift.movements.filter((m) => m.type === 'suprimento').reduce((a, b) => a + b.amount, 0);
        const sumSangrias = updatedShift.movements.filter((m) => m.type === 'sangria').reduce((a, b) => a + b.amount, 0);
        updatedShift.expectedCash = updatedShift.initialCash + updatedShift.totalCashSales + sumSuprimentos - sumSangrias;

        safeStorage.set('eliza_active_shift', updatedShift);
        setDoc(doc(db, 'cash_shifts', updatedShift.id), cleanForFirestore(updatedShift), { merge: true }).catch(() => {});
        return updatedShift;
      });
    }

    // Persist delete to Firestore
    deleteDoc(doc(db, 'sales', saleId)).catch((err) => {
      console.warn('Error deleting sale from Firestore:', err);
    });

    if (restoreStock && restoredStockItems.length > 0) {
      restoredStockItems.forEach((st) => {
        setDoc(doc(db, 'stock', st.id), cleanForFirestore(st), { merge: true }).catch((err) => {
          console.warn('Error updating restored stock in Firestore:', err);
        });
      });
    }

    // Atualiza automaticamente o relatório diário e mensal no Firestore
    const remainingSales = sales.filter((s) => s.id !== saleId);
    const saleDate = getBrazilDateString(saleToDelete.timestamp);
    const updatedDailyReport = buildDailySalesReport(saleDate, remainingSales, operatorUser?.name);
    persistReportToFirestore(updatedDailyReport).catch(() => {});
    const saleMonth = saleDate.slice(0, 7);
    const updatedMonthlyReport = buildMonthlySalesReport(saleMonth, remainingSales, operatorUser?.name);
    persistReportToFirestore(updatedMonthlyReport).catch(() => {});

    return true;
  };

  // Delete all test / existing sales completely
  const deleteAllSales = async (): Promise<boolean> => {
    try {
      setSales([]);
      safeStorage.set('eliza_sales', []);
      setLastCompletedSale(null);

      const snap = await getDocs(collection(db, 'sales'));
      const deletes = snap.docs.map((d) => deleteDoc(doc(db, 'sales', d.id)));
      await Promise.all(deletes);

      // Limpar ou resetar relatórios no Firestore
      const reportsSnap = await getDocs(collection(db, 'sales_reports'));
      const reportDeletes = reportsSnap.docs.map((d) => deleteDoc(doc(db, 'sales_reports', d.id)));
      await Promise.all(reportDeletes);
      setSalesReports([]);
      safeStorage.set('eliza_sales_reports', []);

      // Reset sales in active shift if present
      if (activeShift) {
        setActiveShift((prev) => {
          if (!prev) return null;
          const reset: CashShift = {
            ...prev,
            totalSalesCount: 0,
            totalSalesAmount: 0,
            totalCashSales: 0,
            totalPixSales: 0,
            totalDebitSales: 0,
            totalCreditSales: 0,
            expectedCash: prev.initialCash
          };
          safeStorage.set('eliza_active_shift', reset);
          setDoc(doc(db, 'cash_shifts', reset.id), cleanForFirestore(reset), { merge: true }).catch(() => {});
          return reset;
        });
      }

      return true;
    } catch (err) {
      console.warn('Notice deleting all sales:', err);
      setSales([]);
      safeStorage.set('eliza_sales', []);
      return true;
    }
  };

  // Put / Sync all catalog items into Firestore database
  const syncAllCatalogToDatabase = async (): Promise<{ productsCount: number; stockCount: number }> => {
    setSyncStatus('syncing');
    let pCount = 0;
    let sCount = 0;
    try {
      const prodsToSave = products.length > 0 ? products : INITIAL_PRODUCTS;
      for (const p of prodsToSave) {
        await setDoc(doc(db, 'products', p.id), cleanForFirestore(p), { merge: true });
        pCount++;
      }

      const stockToSave = stock.length > 0 ? stock : INITIAL_STOCK;
      for (const s of stockToSave) {
        await setDoc(doc(db, 'stock', s.id), cleanForFirestore(s), { merge: true });
        sCount++;
      }

      setSyncStatus('synced');
      return { productsCount: pCount, stockCount: sCount };
    } catch (e) {
      console.warn('Erro ao sincronizar catálogo no Firestore:', e);
      setSyncStatus('synced');
      return { productsCount: pCount, stockCount: sCount };
    }
  };

  // Cash Shift Operations
  const openShift = async (initialCash: number, operatorName: string, notes?: string): Promise<CashShift> => {
    const shiftId = generateBrazilTimestampId('CX');
    const openedAt = getBrazilIsoTimestamp();
    const todayStr = getBrazilDateString();

    // Reconcile with unassigned today's sales so daily revenue is never wiped upon opening a register
    const unassignedTodaySales = sales.filter((s) => {
      const isToday = getBrazilDateString(s.timestamp) === todayStr;
      return isToday && (!s.shiftId || s.shiftId === shiftId);
    });

    const initCash = Number(initialCash) || 0;
    const initialSalesCount = unassignedTodaySales.length;
    const initialSalesAmount = Number(unassignedTodaySales.reduce((sum, s) => sum + (s.total || 0), 0).toFixed(2));
    const initialCashSales = Number(unassignedTodaySales.filter((s) => s.paymentMethod === 'dinheiro').reduce((sum, s) => sum + (s.total || 0), 0).toFixed(2));
    const initialPixSales = Number(unassignedTodaySales.filter((s) => s.paymentMethod === 'pix').reduce((sum, s) => sum + (s.total || 0), 0).toFixed(2));
    const initialDebitSales = Number(unassignedTodaySales.filter((s) => s.paymentMethod === 'cartao_debito').reduce((sum, s) => sum + (s.total || 0), 0).toFixed(2));
    const initialCreditSales = Number(unassignedTodaySales.filter((s) => s.paymentMethod === 'cartao_credito').reduce((sum, s) => sum + (s.total || 0), 0).toFixed(2));

    const expectedCash = calculateShiftExpectedCash(initCash, initialCashSales, []);

    const newShift: CashShift = {
      id: shiftId,
      status: 'aberto',
      openedAt,
      operatorName: operatorName.trim() || operatorUser?.name || 'Operador',
      initialCash: initCash,
      movements: [],
      totalCashSales: initialCashSales,
      totalPixSales: initialPixSales,
      totalDebitSales: initialDebitSales,
      totalCreditSales: initialCreditSales,
      totalSalesAmount: initialSalesAmount,
      totalSalesCount: initialSalesCount,
      expectedCash,
      notes: notes?.trim() || undefined
    };

    // Associate unassigned sales from today to this new shift
    if (unassignedTodaySales.length > 0) {
      setSales((prevSales) =>
        prevSales.map((s) => {
          if (unassignedTodaySales.some((u) => u.id === s.id)) {
            const updated = { ...s, shiftId };
            setDoc(doc(db, 'sales', s.id), cleanForFirestore(updated), { merge: true }).catch(() => {});
            return updated;
          }
          return s;
        })
      );
    }

    setActiveShift(newShift);
    safeStorage.set('eliza_active_shift', newShift);

    await setDoc(doc(db, 'cash_shifts', newShift.id), cleanForFirestore(newShift), { merge: true }).catch((err) => {
      console.warn('Erro ao salvar abertura de caixa no Firestore:', err);
    });

    return newShift;
  };

  const closeShift = async (
    countedCash: number,
    notes?: string,
    applyAdjustment = false,
    adjustmentReason?: string
  ): Promise<CashShift> => {
    if (!activeShift) throw new Error('Nenhum caixa aberto para fechar.');

    const counted = Number(countedCash) || 0;
    let expected = calculateShiftExpectedCash(
      activeShift.initialCash,
      activeShift.totalCashSales,
      activeShift.movements
    );
    let movements = [...activeShift.movements];
    let difference = Number((counted - expected).toFixed(2));
    let hasAdjustment = Boolean(activeShift.hasAdjustment);
    let adjustmentAmount = activeShift.adjustmentAmount;
    let finalAdjustmentReason = activeShift.adjustmentReason;

    // Se o operador optou por registrar ajuste contábil da divergência na finalização
    if (applyAdjustment && Math.abs(difference) > 0.001) {
      const adjType: 'sobra' | 'falta' = difference > 0 ? 'sobra' : 'falta';
      const adjAmount = Math.abs(difference);
      const reason =
        adjustmentReason?.trim() ||
        `Ajuste de fechamento (${adjType === 'sobra' ? 'Sobra' : 'Falta'} de R$ ${adjAmount.toFixed(2).replace('.', ',')})`;

      const movement: CashMovement = {
        id: `MOV-${Date.now()}`,
        type: 'ajuste',
        amount: adjAmount,
        reason,
        timestamp: getBrazilIsoTimestamp(),
        operatorName: operatorUser?.name || activeShift.operatorName || 'Operador',
        adjustmentType: adjType,
        previousExpectedCash: expected,
        newExpectedCash: counted
      };

      movements.push(movement);
      expected = counted;
      difference = 0;
      hasAdjustment = true;
      adjustmentAmount = adjAmount;
      finalAdjustmentReason = reason;
    }

    const closedShift: CashShift = {
      ...activeShift,
      status: 'fechado',
      closedAt: getBrazilIsoTimestamp(),
      movements,
      expectedCash: expected,
      countedCash: counted,
      difference,
      notes: notes?.trim() || activeShift.notes,
      hasAdjustment,
      adjustmentAmount,
      adjustmentReason: finalAdjustmentReason,
      adjustedCountedCash: hasAdjustment ? counted : undefined
    };

    setShiftsHistory((prev) => {
      const updated = [closedShift, ...prev.filter((s) => s.id !== closedShift.id)];
      safeStorage.set('eliza_shifts_history', updated);
      return updated;
    });

    setActiveShift(null);
    safeStorage.set('eliza_active_shift', null);

    await setDoc(doc(db, 'cash_shifts', closedShift.id), cleanForFirestore(closedShift), { merge: true }).catch((err) => {
      console.warn('Erro ao salvar fechamento de caixa no Firestore:', err);
    });

    // Grava e atualiza automaticamente o relatório consolidado no banco após o fechamento de caixa
    const shiftDate = getBrazilDateString(closedShift.closedAt);
    saveSalesReportForDate(shiftDate).catch(() => {});

    return closedShift;
  };

  const addCashMovement = async (
    type: CashMovementType,
    amount: number,
    reason: string,
    adjustmentType?: 'sobra' | 'falta'
  ): Promise<void> => {
    if (!activeShift) throw new Error('Não há caixa aberto no momento.');

    const val = Math.abs(Number(amount)) || 0;
    if (val <= 0) return;

    let defaultReason = type === 'suprimento' ? 'Suprimento de troco' : 'Sangria de caixa';
    if (type === 'ajuste') {
      defaultReason = adjustmentType === 'falta' ? 'Ajuste de caixa (Falta/Quebra)' : 'Ajuste de caixa (Sobra)';
    }

    const previousExpected = calculateShiftExpectedCash(
      activeShift.initialCash,
      activeShift.totalCashSales,
      activeShift.movements
    );

    const movement: CashMovement = {
      id: `MOV-${Date.now()}`,
      type,
      amount: val,
      reason: reason.trim() || defaultReason,
      timestamp: getBrazilIsoTimestamp(),
      operatorName: operatorUser?.name || activeShift.operatorName || 'Operador',
      adjustmentType: type === 'ajuste' ? adjustmentType : undefined,
      previousExpectedCash: previousExpected
    };

    const updatedMovements = [...activeShift.movements, movement];
    const newExpected = calculateShiftExpectedCash(
      activeShift.initialCash,
      activeShift.totalCashSales,
      updatedMovements
    );
    movement.newExpectedCash = newExpected;

    const updatedShift: CashShift = {
      ...activeShift,
      movements: updatedMovements,
      expectedCash: newExpected,
      hasAdjustment: Boolean(activeShift.hasAdjustment || type === 'ajuste'),
      adjustmentAmount: type === 'ajuste' ? val : activeShift.adjustmentAmount,
      adjustmentReason: type === 'ajuste' ? movement.reason : activeShift.adjustmentReason
    };

    setActiveShift(updatedShift);
    safeStorage.set('eliza_active_shift', updatedShift);

    await setDoc(doc(db, 'cash_shifts', updatedShift.id), cleanForFirestore(updatedShift), { merge: true }).catch((err) => {
      console.warn('Erro ao registrar movimentação de caixa no Firestore:', err);
    });
  };

  const adjustCash = async (amount: number, adjustmentType: 'sobra' | 'falta', reason: string): Promise<void> => {
    return addCashMovement('ajuste', amount, reason, adjustmentType);
  };

  const adjustCashToCounted = async (countedCash: number, reason: string): Promise<void> => {
    if (!activeShift) throw new Error('Não há caixa aberto no momento.');
    const expected = calculateShiftExpectedCash(
      activeShift.initialCash,
      activeShift.totalCashSales,
      activeShift.movements
    );
    const diff = Number((countedCash - expected).toFixed(2));
    if (Math.abs(diff) < 0.001) return;
    const type: 'sobra' | 'falta' = diff > 0 ? 'sobra' : 'falta';
    const finalReason =
      reason.trim() ||
      `Ajuste para valor conferido R$ ${countedCash.toFixed(2).replace('.', ',')} (${type === 'sobra' ? 'Sobra' : 'Falta'})`;
    return addCashMovement('ajuste', Math.abs(diff), finalReason, type);
  };

  // Stock adjustment handlers
  const updateStockQuantity = (stockId: string, newQuantity: number) => {
    const today = getBrazilDateString();
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
    const today = getBrazilDateString();
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
      setDoc(doc(db, 'stock', stockId), cleanForFirestore(updatedItem), { merge: true }).catch((err) => {
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
            updatedAt: getBrazilDateString()
          };
          return [...prev, newStockItem];
        }
        return prev;
      });
    }

    setDoc(doc(db, 'products', product.id), cleanForFirestore(product)).catch((err) => {
      console.warn('Error adding product to Firestore:', err);
    });
    if (newStockItem) {
      setDoc(doc(db, 'stock', (newStockItem as StockItem).id), cleanForFirestore(newStockItem)).catch((err) => {
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
      setDoc(doc(db, 'products', id), cleanForFirestore(updatedProductData), { merge: true }).catch((err) => {
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
      updatedAt: getBrazilDateString()
    };

    setStock((prev) => {
      const updated = [newItem, ...prev];
      safeStorage.set('eliza_stock', updated);
      return updated;
    });

    setDoc(doc(db, 'stock', newItem.id), cleanForFirestore(newItem)).catch((err) => {
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
      setDoc(doc(db, 'products', p.id), cleanForFirestore(p)).catch(() => {});
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
      setDoc(doc(db, 'products', p.id), cleanForFirestore(p)).catch(() => {});
    });
    freshStock.forEach((s: StockItem) => {
      setDoc(doc(db, 'stock', s.id), cleanForFirestore(s)).catch(() => {});
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
        deleteAllSales,
        syncAllCatalogToDatabase,
        updateStockQuantity,
        adjustStockQuantity,
        updateStockThreshold,
        addStockItem,
        deleteStockItem,
        lastCompletedSale,
        setLastCompletedSale,
        resetAllData,
        // Real-time Daily Revenue & Shift Statistics (Sincronizado automaticamente com o banco)
        todayRevenue,
        todaySalesCount,
        todayCashSales,
        todayPixSales,
        todayCardSales,
        todaySales,
        shiftRevenue,
        shiftSalesCount,
        // Cash Register Shift
        activeShift,
        shiftsHistory,
        openShift,
        closeShift,
        addCashMovement,
        adjustCash,
        adjustCashToCounted,
        syncStatus,
        currentUser,
        operatorUser,
        isAuthenticated,
        isAuthReady,
        loginWithCredentials,
        loginWithGoogle,
        reconnectFirebase: autoConnectFirebase,
        logout,
        // Sales Reports (Gravação Automática no Banco de Dados)
        salesReports,
        isSavingReport,
        lastReportSyncTime,
        saveSalesReportForDate,
        saveAllReportsToDatabase
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
