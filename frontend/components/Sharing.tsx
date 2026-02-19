import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Check, Loader2, Search, User as UserIcon, X } from "lucide-react"
import { userService, type User } from "@/services"
import { toast } from "sonner"

interface SharingProps {
  label?: string
  helperText?: string
  selectedUsers: User[]
  onChange: (users: User[]) => void
  maxSelected?: number
  placeholder?: string
  disabled?: boolean
  manualSearchMinChars?: number
  autoSearchMinChars?: number
  debounceMs?: number
  /** IDs de usuários que já fazem parte (exibidos com tag "Já adicionado" e não selecionáveis) */
  existingUserIds?: string[]
}

export function Sharing({
  label,
  helperText,
  selectedUsers,
  onChange,
  maxSelected,
  placeholder = "Busque os membros que deseja adicionar...",
  disabled = false,
  manualSearchMinChars = 2,
  autoSearchMinChars = 3,
  debounceMs = 400,
  existingUserIds = [],
}: SharingProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearchUsers = async () => {
    if (disabled) return
    if (!searchQuery || searchQuery.length < manualSearchMinChars) {
      toast.error(`Digite pelo menos ${manualSearchMinChars} caracteres`)
      return
    }

    try {
      setIsSearching(true)
      setHasSearched(true)
      const response = await userService.searchUsers(searchQuery)
      if (response?.success && response?.data) {
        setSearchResults(response.data)
        if (response.data.length === 0) {
          toast.info("Nenhum usuário encontrado")
        }
      } else {
        setSearchResults([])
        toast.error(response?.error || "Erro ao buscar usuários")
      }
    } catch {
      toast.error("Erro ao buscar usuários")
    } finally {
      setIsSearching(false)
    }
  }

  useEffect(() => {
    if (!searchQuery || searchQuery.length < manualSearchMinChars) {
      setHasSearched(false)
      setSearchResults([])
    }
  }, [searchQuery, manualSearchMinChars])

  useEffect(() => {
    if (disabled) return
    if (!searchQuery || searchQuery.length < autoSearchMinChars) return

    const timeoutId = window.setTimeout(() => {
      const doSearch = async () => {
        try {
          setIsSearching(true)
          setHasSearched(true)
          const response = await userService.searchUsers(searchQuery)
          if (response?.success && response?.data) {
            setSearchResults(response.data)
          } else {
            setSearchResults([])
          }
        } catch {
          // Silent fail for debounced auto-search
        } finally {
          setIsSearching(false)
        }
      }
      doSearch()
    }, debounceMs)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [searchQuery, autoSearchMinChars, debounceMs, disabled])

  const handleSelectUser = (user: User) => {
    if (disabled) return
    if (selectedUsers.some((item) => item.id === user.id)) {
      toast.info("Usuário já adicionado")
      return
    }
    if (maxSelected && selectedUsers.length >= maxSelected) {
      toast.warning(`Limite máximo de ${maxSelected} usuário(s)`)
      return
    }

    onChange([...selectedUsers, user])
    setSearchQuery("")
    setSearchResults([])
  }

  const handleRemoveUser = (userId: string) => {
    if (disabled) return
    onChange(selectedUsers.filter((user) => user.id !== userId))
  }

  return (
    <div className="space-y-2.5">
      {label && (
        <label className="text-xs font-medium text-gray-600 block">
          {label}
        </label>
      )}

      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-md border border-gray-200">
          {selectedUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-md border border-gray-300 text-xs"
            >
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name || user.email} className="w-4 h-4 rounded-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <UserIcon className="h-3 w-3 text-gray-500" />
              )}
              <span className="font-medium truncate max-w-[140px]">
                {user.name || user.email}
              </span>
              <button
                type="button"
                onClick={() => handleRemoveUser(user.id)}
                className="text-gray-400 hover:text-red-600 ml-1"
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={placeholder}
          onKeyDown={(event) => event.key === "Enter" && handleSearchUsers()}
          className="flex-1 bg-white border-blue-300 text-xs h-9 shadow-sm pl-9 pr-9 focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-blue-300 focus:shadow-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-blue-300 focus-visible:shadow-none"
          disabled={disabled}
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
        )}
      </div>

      <div className="min-h-[40px]">
        {searchResults.length > 0 && (
          <div className="max-h-[150px] overflow-y-auto overscroll-contain space-y-1.5 border border-gray-200 rounded-md p-2 bg-white">
            {searchResults.map((user) => {
              const isExisting = existingUserIds.includes(user.id)
              const isSelected = selectedUsers.some((item) => item.id === user.id)
              return (
                <div
                  key={user.id}
                  className={`p-2 border rounded-md flex items-center gap-2 transition-colors text-xs ${
                    isExisting
                      ? "border-gray-200 bg-white cursor-default"
                      : isSelected
                        ? "border-green-300 bg-green-50 cursor-pointer"
                        : "hover:bg-gray-50 border-gray-200 cursor-pointer"
                  }`}
                  onClick={() => !isExisting && handleSelectUser(user)}
                >
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name || user.email} className="w-6 h-6 rounded-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                      <UserIcon className="h-3 w-3 text-gray-500" />
                    </div>
                  )}
                  <div className="flex-1 overflow-hidden">
                    <p className="font-medium truncate">{user.name || user.email}</p>
                    {user.name && <p className="text-[10px] text-gray-500 truncate">{user.email}</p>}
                  </div>
                  {isExisting && (
                    <span className="text-[10px] font-medium text-green-700 bg-green-100 ring-1 ring-green-300 px-2 py-0.5 rounded-md shrink-0">Já adicionado</span>
                  )}
                  {!isExisting && isSelected && (
                    <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {!isSearching && hasSearched && searchResults.length === 0 && searchQuery.length >= manualSearchMinChars && (
          <p className="text-xs text-gray-500 text-center py-2">
            Nenhum usuário encontrado
          </p>
        )}
      </div>

      {helperText && (
        <p className="text-xs text-gray-500">{helperText}</p>
      )}
    </div>
  )
}
