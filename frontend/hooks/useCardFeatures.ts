import { useState, useCallback, useEffect } from 'react'

// Interfaces temporárias - serão movidas para types/cardfeature.ts
interface CardFeatureScreen {
  name: string
  description: string
  code: string
}

interface CardFeature {
  id: string
  title: string
  tech: string
  language: string
  description: string
  screens: CardFeatureScreen[]
  createdAt: Date
  updatedAt: Date
}

interface CardFeatureState {
  items: CardFeature[]
  loading: boolean
  error: string | null
  selectedItem: CardFeature | null
  editingItem: CardFeature | null
  isCreating: boolean
  isEditing: boolean
  showDeleteConfirm: boolean
  deleteItemId: string | null
  activeTab: string
  searchTerm: string
  selectedTech: string
}

interface CreateCardFeatureData {
  title: string
  tech: string
  language: string
  description: string
  screens: Omit<CardFeatureScreen, 'id'>[]
}

interface UpdateCardFeatureData extends Partial<CreateCardFeatureData> {}

// Hook principal para gerenciar CardFeatures
export function useCardFeatures() {
  const [state, setState] = useState<CardFeatureState>({
    items: [],
    loading: false,
    error: null,
    selectedItem: null,
    editingItem: null,
    isCreating: false,
    isEditing: false,
    showDeleteConfirm: false,
    deleteItemId: null,
    activeTab: '',
    searchTerm: '',
    selectedTech: 'all'
  })

  // Gerar ID único simples (será movido para utils)
  const generateId = useCallback(() => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }, [])

  // Carregar dados iniciais (depois virá do localStorage)
  const fetchCardFeatures = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      // Por enquanto, dados mockados - depois virá do localStorage
      const mockData: CardFeature[] = []
      
      setState(prev => ({ 
        ...prev, 
        items: mockData, 
        loading: false 
      }))
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        loading: false 
      }))
    }
  }, [])

  // CREATE - Criar novo CardFeature
  const createCardFeature = useCallback(async (data: CreateCardFeatureData) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const newCardFeature: CardFeature = {
        id: generateId(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      setState(prev => ({
        ...prev,
        items: [...prev.items, newCardFeature],
        loading: false,
        isCreating: false
      }))
      
      return newCardFeature
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Erro ao criar CardFeature',
        loading: false
      }))
      throw error
    }
  }, [generateId])

  // READ - Buscar CardFeature por ID
  const getCardFeature = useCallback((id: string) => {
    return state.items.find(item => item.id === id) || null
  }, [state.items])

  // UPDATE - Atualizar CardFeature existente
  const updateCardFeature = useCallback(async (id: string, data: UpdateCardFeatureData) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      setState(prev => ({
        ...prev,
        items: prev.items.map(item => 
          item.id === id 
            ? { ...item, ...data, updatedAt: new Date() }
            : item
        ),
        loading: false,
        isEditing: false,
        editingItem: null
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Erro ao atualizar CardFeature',
        loading: false
      }))
      throw error
    }
  }, [])

  // DELETE - Remover CardFeature
  const deleteCardFeature = useCallback(async (id: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      setState(prev => ({
        ...prev,
        items: prev.items.filter(item => item.id !== id),
        loading: false,
        showDeleteConfirm: false,
        deleteItemId: null
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Erro ao remover CardFeature',
        loading: false
      }))
      throw error
    }
  }, [])

  // FILTROS - Filtrar itens por busca e tecnologia
  const filteredItems = useCallback(() => {
    return state.items.filter(item => {
      const matchesSearch = state.searchTerm === '' || 
        item.title.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(state.searchTerm.toLowerCase())
      
      const matchesTech = state.selectedTech === 'all' || 
        item.tech.toLowerCase() === state.selectedTech.toLowerCase()
      
      return matchesSearch && matchesTech
    })
  }, [state.items, state.searchTerm, state.selectedTech])

  // AÇÕES DE UI - Controles de interface
  const startCreating = useCallback(() => {
    setState(prev => ({ ...prev, isCreating: true }))
  }, [])

  const cancelCreating = useCallback(() => {
    setState(prev => ({ ...prev, isCreating: false }))
  }, [])

  const startEditing = useCallback((id: string) => {
    const item = getCardFeature(id)
    if (item) {
      setState(prev => ({ 
        ...prev, 
        isEditing: true, 
        editingItem: item 
      }))
    }
  }, [getCardFeature])

  const cancelEditing = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      isEditing: false, 
      editingItem: null 
    }))
  }, [])

  const selectCardFeature = useCallback((id: string) => {
    const item = getCardFeature(id)
    setState(prev => ({ 
      ...prev, 
      selectedItem: item,
      activeTab: item?.screens[0]?.name || '' 
    }))
  }, [getCardFeature])

  const setActiveTab = useCallback((tabName: string) => {
    setState(prev => ({ ...prev, activeTab: tabName }))
  }, [])

  const showDeleteConfirmation = useCallback((id: string) => {
    setState(prev => ({ 
      ...prev, 
      showDeleteConfirm: true, 
      deleteItemId: id 
    }))
  }, [])

  const cancelDelete = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      showDeleteConfirm: false, 
      deleteItemId: null 
    }))
  }, [])

  const setSearchTerm = useCallback((term: string) => {
    setState(prev => ({ ...prev, searchTerm: term }))
  }, [])

  const setSelectedTech = useCallback((tech: string) => {
    setState(prev => ({ ...prev, selectedTech: tech }))
  }, [])

  const clearSelection = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      selectedItem: null, 
      activeTab: '' 
    }))
  }, [])

  // Carregar dados na inicialização
  useEffect(() => {
    fetchCardFeatures()
  }, [fetchCardFeatures])

  // Retorna estado e ações para os componentes
  return {
    // Estado
    items: state.items,
    filteredItems: filteredItems(),
    loading: state.loading,
    error: state.error,
    selectedItem: state.selectedItem,
    editingItem: state.editingItem,
    isCreating: state.isCreating,
    isEditing: state.isEditing,
    showDeleteConfirm: state.showDeleteConfirm,
    deleteItemId: state.deleteItemId,
    activeTab: state.activeTab,
    searchTerm: state.searchTerm,
    selectedTech: state.selectedTech,

    // CRUD Operations
    createCardFeature,
    getCardFeature,
    updateCardFeature,
    deleteCardFeature,
    fetchCardFeatures,

    // UI Actions
    startCreating,
    cancelCreating,
    startEditing,
    cancelEditing,
    selectCardFeature,
    setActiveTab,
    showDeleteConfirmation,
    cancelDelete,
    setSearchTerm,
    setSelectedTech,
    clearSelection
  }
}

// Hook simplificado para casos específicos
export function useCardFeature(id?: string) {
  const cardFeatures = useCardFeatures()
  
  const item = id ? cardFeatures.getCardFeature(id) : null
  
  return {
    item,
    ...cardFeatures
  }
}