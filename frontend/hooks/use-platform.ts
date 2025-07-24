import { useState, useCallback } from 'react';
import { CodeSnippet } from '@/types'; // Assuming a types file exists, adjust as needed

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

  // Function to filter snippets based on searchTerm and selectedTech
  // This would be used by the Codes page
  const filteredSnippets = useCallback((snippets: CodeSnippet[]) => {
    return snippets.filter(snippet => {
      const matchesSearch = snippet.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            snippet.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTech = selectedTech === 'all' || snippet.technology === selectedTech;
      return matchesSearch && matchesTech;
    });
  }, [searchTerm, selectedTech]);

  // Return all state and functions
  return {
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
    selectedTech,
    setSelectedTech,
    favorites,
    toggleFavorite,
    filteredSnippets,
  };
}
