'use client';
import React, { createContext, useContext, useState, useCallback } from "react";

const QuickBuyContext = createContext(null);

export const QuickBuyProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [product, setProduct] = useState(null);

  const openQuickBuy = useCallback((prod) => {
    setProduct(prod);
    setIsOpen(true);
  }, []);

  const closeQuickBuy = useCallback(() => {
    setIsOpen(false);
    // Don't clear product immediately to allow for closing animations
    setTimeout(() => setProduct(null), 300);
  }, []);

  return (
    <QuickBuyContext.Provider value={{ isOpen, product, openQuickBuy, closeQuickBuy }}>
      {children}
    </QuickBuyContext.Provider>
  );
};

export const useQuickBuy = () => {
  const context = useContext(QuickBuyContext);
  if (!context) {
    throw new Error("useQuickBuy must be used within a QuickBuyProvider");
  }
  return context;
};
