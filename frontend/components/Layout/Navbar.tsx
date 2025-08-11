'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Menu, 
  X, 
  User, 
  LogOut, 
  Settings, 
  Crown, 
  BookOpen, 
  Home,
  Code,
  LogIn,
  UserPlus
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import AuthModal from '@/components/Auth/AuthModal'

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Aulas', href: '/aulas', icon: BookOpen },
  { name: 'CardFeatures', href: '/card-features', icon: Code },
]

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const pathname = usePathname()
  
  const { user, isAuthenticated, isAdmin, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    setShowUserMenu(false)
  }

  return (
    <>
      <nav className="bg-white dark:bg-gray-900 shadow-lg border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo e navegação principal */}
            <div className="flex items-center">
              {/* Logo */}
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">10x</span>
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  10xDev
                </span>
              </Link>

              {/* Navegação desktop */}
              <div className="hidden md:flex ml-10 space-x-8">
                {navigation.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <Icon size={18} />
                      <span>{item.name}</span>
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Área de autenticação */}
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  {/* Badge de admin */}
                  {isAdmin && (
                    <div className="hidden sm:flex items-center space-x-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300 rounded-full text-xs font-medium">
                      <Crown size={14} />
                      <span>Admin</span>
                    </div>
                  )}

                  {/* Menu do usuário */}
                  <div className="relative">
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="flex items-center space-x-2 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                        <User size={18} className="text-white" />
                      </div>
                      <div className="hidden sm:block text-left">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {user?.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {user?.email}
                        </p>
                      </div>
                    </button>

                    {/* Dropdown do usuário */}
                    {showUserMenu && (
                      <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {user?.name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {user?.email}
                          </p>
                          {isAdmin && (
                            <div className="flex items-center space-x-1 mt-1">
                              <Crown size={12} className="text-yellow-500" />
                              <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                                Administrador
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <div className="py-2">
                          <Link
                            href="/profile"
                            className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <Settings size={16} />
                            <span>Perfil</span>
                          </Link>
                          
                          {isAdmin && (
                            <Link
                              href="/admin"
                              className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              onClick={() => setShowUserMenu(false)}
                            >
                              <Crown size={16} />
                              <span>Painel Admin</span>
                            </Link>
                          )}
                          
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            <LogOut size={16} />
                            <span>Sair</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Botões de login/registro */
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    <LogIn size={18} />
                    <span className="hidden sm:inline">Entrar</span>
                  </button>
                  
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all text-sm font-medium"
                  >
                    <UserPlus size={18} />
                    <span className="hidden sm:inline">Registrar</span>
                  </button>
                </div>
              )}

              {/* Menu mobile toggle */}
              <div className="md:hidden">
                <button
                  onClick={() => setIsOpen(!isOpen)}
                  className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  {isOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Menu mobile */}
        {isOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200 dark:border-gray-700">
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                
                return (
                  <Link
                    key={item.name}
                    href={item.href as any}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    <Icon size={18} />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
              
              {/* Menu mobile - usuário não logado */}
              {!isAuthenticated && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => {
                      setShowAuthModal(true)
                      setIsOpen(false)
                    }}
                    className="flex items-center space-x-2 px-3 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                  >
                    <LogIn size={18} />
                    <span>Entrar / Registrar</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Modal de autenticação */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false)
          setIsOpen(false)
        }}
      />

      {/* Overlay para fechar menus */}
      {(showUserMenu || isOpen) && (
        <div
          className="fixed inset-0 z-40 bg-transparent"
          onClick={() => {
            setShowUserMenu(false)
            setIsOpen(false)
          }}
        />
      )}
    </>
  )
}