'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAccountSync } from '@/lib/useAccountSync';

const STORAGE_KEY = 'womanlylebanon_favorites';

type FavoritesContextType = {
  favoriteIds: string[];
  isFavorite: (productId: string) => boolean;
  toggleFavorite: (productId: string) => void;
};

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setFavoriteIds(JSON.parse(saved));
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(favoriteIds));
  }, [favoriteIds, loaded]);

  // Signed-in customers: keep favorites in step with their account.
  useAccountSync<string>({
    column: 'favorites',
    value: favoriteIds,
    setValue: setFavoriteIds,
    merge: (remote, local) => Array.from(new Set([...remote, ...local])),
    loaded,
  });

  const isFavorite = (productId: string) => favoriteIds.includes(productId);

  const toggleFavorite = (productId: string) => {
    setFavoriteIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  return (
    <FavoritesContext.Provider value={{ favoriteIds, isFavorite, toggleFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
