import { Search, Filter, User, Clock, Bell, Wifi, ShieldAlert, LogOut, Download, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { usePWA } from '../hooks/usePWA';

const ADMIN_EMAILS = ['robsonbatista3@gmail.com', 'rbvideos0441@gmail.com'];

const AVATAR_COLORS = [
  'bg-gradient-to-br from-rose-500 to-red-650',
  'bg-gradient-to-br from-blue-500 to-indigo-600',
  'bg-gradient-to-br from-emerald-500 to-teal-600',
  'bg-gradient-to-br from-purple-500 to-fuchsia-600',
  'bg-gradient-to-br from-amber-500 to-orange-600',
];

  interface NavbarProps {
    onAdminClick: () => void;
    onSearch: (query: string) => void;
    activeProfile?: any;
    onSwitchProfile?: () => void;
    isDemoMode?: boolean;
  }
  
  export default function Navbar({ onAdminClick, onSearch, activeProfile, onSwitchProfile, isDemoMode }: NavbarProps) {
    const [time, setTime] = useState(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    
    const { isInstallable, installApp, isOffline } = usePWA();
  
    useEffect(() => {
      const timer = setInterval(() => {
        setTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
      }, 1000);
      
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setCurrentUser(user);
      });
  
      return () => {
        clearInterval(timer);
        unsubscribe();
      };
    }, []);
  
    useEffect(() => {
      onSearch(searchQuery);
    }, [searchQuery]);
  
    const isAdmin = currentUser?.email && ADMIN_EMAILS.includes(currentUser.email);
  
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-6 bg-gradient-to-b from-black/90 to-transparent transition-all">
        {/* Brand */}
        <div className="flex items-center gap-10">
          <div className="text-2xl md:text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-red-600 to-red-400 shrink-0">
            RBFLIX
          </div>
          <div className="hidden lg:flex space-x-6 text-sm font-medium text-gray-300">
            <a href="#" className="text-white">Início</a>
            <a href="#" className="hover:text-white transition-colors">Séries</a>
            <a href="#" className="hover:text-white transition-colors">Filmes</a>
            <a href="#" className="hover:text-white transition-colors">Bombando</a>
            <a href="#" className="hover:text-white transition-colors">Minha Lista</a>
          </div>
        </div>
  
        {/* Utilities */}
        <div className="flex items-center gap-3 md:gap-5">
          {/* Custom PWA Install Action */}
          {isInstallable && (
            <button 
              onClick={installApp}
              className="flex items-center gap-1.5 font-black text-white bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 border border-orange-500/20 px-3 md:px-4 py-1.5 rounded-full hover:scale-105 active:scale-95 transition-all text-[9px] md:text-xs tracking-wider shadow-[0_0_15px_rgba(234,88,12,0.3)] shrink-0 cursor-pointer"
              title="Instalar App RBFLIX"
            >
              <Download size={13} className="animate-bounce" />
              <span>INSTALAR</span>
            </button>
          )}

          {isAdmin && (
            <button 
              onClick={onAdminClick}
              className="flex items-center gap-1 font-bold px-3 py-1.5 rounded-full hover:scale-105 transition-all cursor-pointer text-[10px] md:text-sm text-brand bg-brand/10"
            >
              <ShieldAlert size={16} /> <span className="hidden sm:inline">PAINEL ADM</span>
            </button>
          )}

          <div className={`flex items-center bg-black/40 border transition-all rounded-full px-4 py-1.5 ${isSearching ? 'border-brand w-40 md:w-64' : 'border-transparent w-auto'}`}>
            <button 
              onClick={() => setIsSearching(!isSearching)}
              className="text-gray-300 hover:text-white transition-colors cursor-pointer"
            >
              <Search size={20} />
            </button>
            {isSearching && (
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Busque por títulos..."
                className="bg-transparent border-none outline-none text-xs md:text-sm text-white ml-2 w-full"
              />
            )}
          </div>
  
          {/* Profiles and Logout Section */}
          <div className="flex items-center gap-2.5">
            {activeProfile && (
              <div className="flex items-center gap-2 bg-black/50 border border-white/5 pl-2.5 pr-3 py-1.5 rounded-2xl hover:scale-102 transition-all">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${AVATAR_COLORS[activeProfile.avatarId % AVATAR_COLORS.length]} shadow-inner`}>
                  <User size={12} className="text-white fill-white/10" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-bold text-white max-w-[80px] truncate leading-none">
                    {activeProfile.name}
                  </span>
                  <span className="text-[7px] text-gray-500 font-extrabold uppercase mt-0.5">Tela</span>
                </div>
                
                {onSwitchProfile && (
                  <button
                    onClick={onSwitchProfile}
                    title="Alternar Telas / Perfis"
                    className="ml-2.5 pl-2.5 border-l border-white/10 text-[9px] font-bold text-gray-400 hover:text-white tracking-wider flex items-center gap-1 transition-colors uppercase cursor-pointer"
                  >
                    <Users size={11} />
                    <span className="hidden sm:inline">Telas</span>
                  </button>
                )}
              </div>
            )}

            <button 
              onClick={() => auth.signOut()}
              title="Sair da Conta (Logout)"
              className="w-8 h-8 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:text-red-500 active:scale-95 transition-all flex items-center justify-center text-gray-400 cursor-pointer"
            >
              <LogOut size={14} />
            </button>
          </div>

          <div className="hidden sm:flex flex-col items-end">
             <span className="text-sm font-bold text-white leading-none">{time}</span>
             <div className="flex items-center gap-2 mt-1">
               {isDemoMode && (
                 <span className="px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/25 text-[8px] text-amber-500 font-extrabold tracking-wider rounded-md uppercase">
                   Demonstração
                 </span>
               )}
               {isOffline ? (
                 <div className="flex items-center gap-1 text-[8px] text-red-500 font-black tracking-widest uppercase">
                   <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                   <span>Sem Conexão</span>
                 </div>
               ) : (
                 <div className="flex items-center gap-1 text-[8px] text-emerald-500 font-black tracking-widest uppercase">
                   <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                   <span>Online</span>
                 </div>
               )}
             </div>
          </div>
        </div>
      </nav>
    );
  }
