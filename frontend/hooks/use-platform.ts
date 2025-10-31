import { useState, useCallback, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { CodeSnippet } from '@/types';
import { normalizeTab, isValidTab, type TabKey } from '@/utils/routes';

// Define the state and functions for the DevPlatform
export function usePlatform() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Get initial tab from URL or default to 'home'
  const getInitialTab = (): TabKey => {
    const tabFromUrl = searchParams.get('tab');
    return normalizeTab(tabFromUrl);
  };

  // State for the active tab
  const [activeTab, setActiveTab] = useState<TabKey>(getInitialTab());

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

  // Function to filter snippets based on searchTerm and selectedTech
  // This would be used by the Codes page
  const filteredSnippets = useCallback((snippets: CodeSnippet[]) => {
    return snippets.filter(snippet => {
      const matchesSearch = snippet.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            snippet.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTech = selectedTech === 'all' || snippet.tech.toLowerCase() === selectedTech.toLowerCase();
      return matchesSearch && matchesTech;
    });
  }, [searchTerm, selectedTech]);

  // Enhanced setActiveTab that updates URL
  const setActiveTabWithUrl = useCallback((tab: string) => {
    // Normalizar a tab para garantir que é válida
    const normalizedTab = normalizeTab(tab);
    setActiveTab(normalizedTab);
    
    const params = new URLSearchParams(searchParams.toString());
    if (normalizedTab === 'home') {
      params.delete('tab');
    } else {
      params.set('tab', normalizedTab);
    }
    const queryString = params.toString();
    const newUrl = queryString ? `/?${queryString}` : '/';
    router.push(newUrl, { scroll: false });
  }, [router, searchParams]);

  // Listen to URL changes and update tab accordingly
  useEffect(() => {
    const tabFromUrl = normalizeTab(searchParams.get('tab'));
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams, activeTab]);

  // Return all state and functions
  return {
    activeTab,
    setActiveTab: setActiveTabWithUrl,
    searchTerm,
    setSearchTerm,
    selectedTech,
    setSelectedTech,
    favorites,
    toggleFavorite,
    filteredSnippets,
  };
}
