/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PosProvider, usePos } from './context/PosContext';
import { Header } from './components/Header';
import { PdvView } from './components/PDV/PdvView';
import { ProductsView } from './components/Products/ProductsView';
import { StockView } from './components/Stock/StockView';
import { ReportsView } from './components/Reports/ReportsView';

const MainLayout: React.FC = () => {
  const { currentScreen } = usePos();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFFDF9] via-[#FFF8F0] to-[#FFF1F2] text-stone-800 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      <Header />
      <main className="flex-1 flex flex-col min-h-0 overflow-y-auto lg:overflow-hidden pb-16 sm:pb-0">
        {currentScreen === 'pdv' && <PdvView />}
        {currentScreen === 'produtos' && <ProductsView />}
        {currentScreen === 'estoque' && <StockView />}
        {currentScreen === 'relatorios' && <ReportsView />}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <PosProvider>
      <MainLayout />
    </PosProvider>
  );
}
