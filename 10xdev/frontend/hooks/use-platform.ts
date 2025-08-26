import { useState, useCallback } from 'react';

// Define the state and functions for the DevPlatform
export function usePlatform() {
  // State for the active tab
  const [activeTab, setActiveTab] = useState<string>('home');

  // State for search term
  const [searchTerm, setSearchTerm] = useState<string>('');

  // State for selected technology filter
  const [selectedTech, setSelectedTech] = useState<string>('all');

  // State for favorite items (assuming snippets have an id)
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Function to toggle a favorite
  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(id)) {
        newFavorites.delete(id);
      } else {
        newFavorites.add(id);
      }
      return newFavorites;
    });
  }, []);

  // Return all state and functions
  return {
    activeTab,
    setActiveTab: useCallback((tab: string) => {
      setActiveTab(tab);
    }, [activeTab]),
    searchTerm,
    setSearchTerm,
    selectedTech,
    setSelectedTech,
    favorites,
    toggleFavorite,
  };
}
