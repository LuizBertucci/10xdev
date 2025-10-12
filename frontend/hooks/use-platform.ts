import { useState, useCallback, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { CodeSnippet } from '@/types'; // Assuming a types file exists, adjust as needed

// Define the state and functions for the DevPlatform
export function usePlatform() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Get initial tab from URL or default to 'home'
  const getInitialTab = () => {
    const tabFromUrl = searchParams.get('tab');
    return tabFromUrl || 'home';
  };

  // State for the active tab
  const [activeTab, setActiveTab] = useState<string>(getInitialTab());

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
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === 'home') {
      params.delete('tab');
    } else {
      params.set('tab', tab);
    }
    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
    router.push(newUrl, { scroll: false });
  }, [router, searchParams, pathname]);

  // Listen to URL changes and update tab accordingly
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') || 'home';
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
