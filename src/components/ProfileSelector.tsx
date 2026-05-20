import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Edit2, Check, User, ShieldAlert } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Profile {
  id: string;
  name: string;
  avatarId: number;
}

interface ProfileSelectorProps {
  userId: string;
  userName: string;
  profiles: Profile[];
  maxScreens: number;
  onSelectProfile: (profile: Profile) => void;
  isAdmin?: boolean;
  onAdminClick?: () => void;
}

const AVATAR_COLORS = [
  'bg-gradient-to-br from-rose-500 to-red-600',
  'bg-gradient-to-br from-blue-500 to-indigo-600',
  'bg-gradient-to-br from-emerald-500 to-teal-600',
  'bg-gradient-to-br from-purple-500 to-fuchsia-600',
  'bg-gradient-to-br from-amber-500 to-orange-600',
];

export default function ProfileSelector({
  userId,
  userName,
  profiles = [],
  maxScreens = 1,
  onSelectProfile,
  isAdmin = false,
  onAdminClick,
}: ProfileSelectorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(0);
  const [loading, setLoading] = useState(false);

  // Initialize profiles default list if none found
  const activeProfiles = profiles.length > 0 
    ? profiles 
    : [{ id: 'default', name: userName || 'Principal', avatarId: 0 }];

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || loading) return;

    if (activeProfiles.length >= maxScreens) {
      alert(`Seu plano permite o cadastro de no máximo ${maxScreens} tela(s). Faça upgrade de plano para liberar mais!`);
      return;
    }

    setLoading(true);
    try {
      const newProfile: Profile = {
        id: Math.random().toString(36).substr(2, 9),
        name: newName.trim(),
        avatarId: selectedAvatar,
      };

      const userDocRef = doc(db, 'users', userId);
      const updatedProfiles = [...profiles, newProfile];

      await setDoc(userDocRef, {
        profiles: updatedProfiles,
      }, { merge: true });

      setNewName('');
      setIsAdding(false);
    } catch (err) {
      console.error('Error creating profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (activeProfiles.length <= 1) {
      alert('Sua conta precisa de pelo menos uma tela ativa.');
      return;
    }

    if (!confirm('Tem certeza de que deseja deletar esta tela? Seu histórico nela será perdido.')) {
      return;
    }

    try {
      const userDocRef = doc(db, 'users', userId);
      const updatedProfiles = profiles.filter((p) => p.id !== profileId);

      await setDoc(userDocRef, {
        profiles: updatedProfiles,
      }, { merge: true });
    } catch (err) {
      console.error('Error deleting profile:', err);
    }
  };

  return (
    <div className="min-h-screen bg-surface-900 text-white flex flex-col justify-center items-center p-6 bg-[radial-gradient(ellipse_at_top,rgba(225,29,72,0.08)_0,transparent_60%)] relative">
      <div className="absolute top-8 left-1/2 -translate-x-1/2 text-center">
        <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-red-600 to-red-400 tracking-tighter">
          RBFLIX
        </h1>
        <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">
          Cinema em Casa • IPTV • Filmes e Séries
        </div>
      </div>

      <div className="max-w-4xl w-full text-center">
        <AnimatePresence mode="wait">
          {!isAdding ? (
            <motion.div
              key="select-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="flex flex-col items-center"
            >
              <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight mb-3">
                Quem está assistindo?
              </h2>
              <p className="text-sm text-gray-400 mb-12 max-w-md">
                Escolha uma das telas abaixo para acessar o catálogo. Seus históricos e recomendações são separados por tela.
              </p>

              {/* Profiles Grid */}
              <div className="flex flex-wrap justify-center gap-8 md:gap-10 mb-12">
                {activeProfiles.map((profile) => (
                  <div key={profile.id} className="flex flex-col items-center group relative">
                    {/* Delete button option */}
                    {isEditing && (
                      <button
                        onClick={() => handleDeleteProfile(profile.id)}
                        className="absolute -top-2 -right-2 z-30 bg-red-600 hover:bg-red-700 p-2 rounded-full text-white shadow-lg border border-red-500 hover:scale-115 transition-all cursor-pointer shadow-red-600/20"
                        title="Remover Tela"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}

                    <button
                      id={`profile-card-${profile.id}`}
                      onClick={() => !isEditing && onSelectProfile(profile)}
                      className={`w-28 h-28 md:w-32 md:h-32 rounded-3xl ${AVATAR_COLORS[profile.avatarId % AVATAR_COLORS.length]} p-0.5 shadow-2xl relative mb-3 hover:scale-105 active:scale-95 transition-all text-left flex items-center justify-center cursor-pointer border-2 border-transparent hover:border-white group-hover:shadow-[0_0_30px_rgba(225,29,72,0.25)]`}
                    >
                      <User size={48} className="text-white fill-white/10 opacity-90 transition-transform group-hover:scale-110" />
                    </button>

                    <span className="text-sm font-bold text-gray-300 group-hover:text-white transition-colors">
                      {profile.name}
                    </span>
                  </div>
                ))}

                {/* Add Profile Trigger */}
                {activeProfiles.length < maxScreens ? (
                  <div className="flex flex-col items-center">
                    <button
                      id="add-profile-btn"
                      onClick={() => setIsAdding(true)}
                      className="w-28 h-28 md:w-32 md:h-32 rounded-3xl bg-surface-800 hover:bg-surface-700/80 border-2 border-dashed border-white/10 hover:border-brand flex items-center justify-center hover:scale-105 active:scale-95 transition-all group cursor-pointer mb-3"
                    >
                      <Plus size={36} className="text-gray-500 group-hover:text-brand transition-colors" />
                    </button>
                    <span className="text-xs font-bold text-gray-500">
                      Adicionar Tela
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center opacity-40" title="Limite do plano alcançado">
                    <div className="w-28 h-28 md:w-32 md:h-32 rounded-3xl bg-surface-900 border-2 border-dashed border-white/5 flex flex-col items-center justify-center mb-3">
                      <Plus size={32} className="text-gray-600" />
                    </div>
                    <span className="text-[10px] font-black text-gray-500 max-w-[120px] leading-tight text-center uppercase tracking-wide">
                      Limite de {maxScreens} {maxScreens === 1 ? 'Tela' : 'Telas'}
                    </span>
                  </div>
                )}
              </div>

              {/* Edit Profiles toggle */}
              <div className="flex flex-col gap-4 items-center">
                <button
                  id="manage-profiles-toggle"
                  onClick={() => setIsEditing(!isEditing)}
                  className={`px-6 py-2.5 rounded-full font-bold text-xs uppercase tracking-widest transition-all cursor-pointer border ${isEditing ? 'bg-red-600 border-red-500 text-white' : 'border-white/20 text-gray-400 hover:text-white hover:border-white'}`}
                >
                  {isEditing ? 'Concluir Gerenciamento' : 'Gerenciar Telas'}
                </button>

                {isAdmin && onAdminClick && (
                  <button
                    onClick={onAdminClick}
                    className="flex items-center gap-1.5 px-6 py-2.5 rounded-full font-bold text-xs uppercase tracking-widest transition-all cursor-pointer bg-brand/10 border border-brand/35 text-brand hover:bg-brand/25 hover:text-white hover:scale-102"
                  >
                    <ShieldAlert size={14} />
                    <span>Acessar Painel Administrador</span>
                  </button>
                )}

                {maxScreens === 1 && (
                  <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
                    Seu Plano: Básico (1 Tela Simultânea)
                  </span>
                )}
                {maxScreens > 1 && (
                  <span className="text-[10px] text-brand uppercase font-black tracking-widest bg-brand/10 px-4 py-1.5 rounded-full border border-brand/20">
                    Seu Plano: Premium ({maxScreens} Telas Simultâneas)
                  </span>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="add-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-md w-full mx-auto"
            >
              <h2 className="text-3xl font-black uppercase tracking-tight mb-2 text-white">
                Adicionar Tela
              </h2>
              <p className="text-sm text-gray-400 mb-8">
                Adicione uma nova tela para um membro da família ou dispositivo.
              </p>

              <form onSubmit={handleCreateProfile} className="space-y-6 text-left">
                {/* Name Input */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">
                    Nome da Tela
                  </label>
                  <input
                    required
                    type="text"
                    maxLength={15}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ex: Robson, Família, Quarto..."
                    className="w-full bg-surface-800 border border-white/10 rounded-2xl px-4 py-4 text-white text-sm focus:outline-none focus:border-brand transition-colors font-semibold"
                  />
                </div>

                {/* Avatar select */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-3">
                    Selecione um Ícone
                  </label>
                  <div className="flex gap-4">
                    {AVATAR_COLORS.map((color, i) => (
                      <button
                        type="button"
                        key={i}
                        onClick={() => setSelectedAvatar(i)}
                        className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center relative cursor-pointer active:scale-95 transition-all`}
                      >
                        <User size={18} className="text-white fill-white/10" />
                        {selectedAvatar === i && (
                          <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
                            <Check size={18} className="text-white font-bold" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setNewName('');
                      setIsAdding(false);
                    }}
                    className="flex-1 py-4 bg-surface-800 hover:bg-surface-700 active:scale-[0.98] rounded-2xl font-bold text-xs uppercase tracking-wider text-gray-300 cursor-pointer transition-all border border-white/5"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !newName.trim()}
                    className="flex-1 py-4 bg-brand hover:bg-brand/90 active:scale-[0.98] disabled:opacity-50 rounded-2xl font-bold text-xs uppercase tracking-wider text-white cursor-pointer transition-all shadow-lg shadow-brand/10"
                  >
                    {loading ? 'Salvando...' : 'Adicionar'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
