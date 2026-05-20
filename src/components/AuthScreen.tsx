import { useState } from 'react';
import { auth, db } from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Mail, Lock, User, ShieldAlert, ArrowRight, Eye, EyeOff } from 'lucide-react';
import firebaseConfig from '../../firebase-applet-config.json';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<React.ReactNode | null>(null);
  const [loading, setLoading] = useState(false);

  const getFirebaseErrorMessage = (errCode: string): React.ReactNode => {
    const projId = firebaseConfig?.projectId || 'rbflix-dfb92';
    const currentDomain = window.location.hostname;

    const codeLower = (errCode || '').toLowerCase();
    if (codeLower.includes('offline') || codeLower.includes('failed to get document') || codeLower.includes('unavailable')) {
      return (
        <div>
          <p className="font-bold">O Firebase detectou que o cliente está offline.</p>
          <p className="text-gray-300 mt-1 text-[11px] leading-relaxed">
            Como você está em um ambiente de visualização do AI Studio, os dados offline e o perfil local foram ativados. O sistema continuará funcionando normalmente com recursos locais e simulação de plano ativo mesmo sem conexão direta com o banco de dados.
          </p>
        </div>
      );
    }

    switch (errCode) {
      case 'auth/invalid-email':
        return 'E-mail inválido. Verifique o formato.';
      case 'auth/user-disabled':
        return 'Esta conta foi desativada.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'E-mail ou senha incorretos, ou a conta ainda não foi criada neste novo projeto Firebase.';
      case 'auth/email-already-in-use':
        return 'Este e-mail já está cadastrado.';
      case 'auth/weak-password':
        return 'A senha deve ter pelo menos 6 caracteres.';
      case 'auth/operation-not-allowed':
        return (
          <div>
            O cadastro com e-mail/senha ou Google não está ativo no seu projeto Firebase ({projId}).{' '}
            <a 
              href={`https://console.firebase.google.com/project/${projId}/authentication/providers`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline text-red-500 font-bold hover:text-red-400 block mt-2"
            >
              Clique aqui para ativar o provedor de E-mail/Senha e Google no Console do seu Firebase
            </a>
          </div>
        );
      case 'auth/unauthorized-domain':
        return (
          <div>
            Este domínio (<span className="font-mono bg-black/30 px-1.5 py-0.5 rounded text-white">{currentDomain}</span>) não está autorizado para autenticação no seu projeto Firebase ({projId}).
            <br /><br />
            Para resolver:
            <ol className="list-decimal pl-4 mt-2 space-y-1 text-[11px] text-gray-300">
              <li>Acesse o <a href={`https://console.firebase.google.com/project/${projId}/authentication/settings`} target="_blank" rel="noopener noreferrer" className="underline text-red-400 font-bold hover:text-red-300">Console do seu Firebase</a></li>
              <li>Vá na aba <span className="font-bold text-white">Configurações</span> (Settings) &gt; <span className="font-bold text-white">Domínios Autorizados</span> (Authorized Domains)</li>
              <li>Adicione o domínio: <span className="font-mono bg-black/30 px-1 px-1.5 py-0.5 rounded text-[11px] text-brand select-all">{currentDomain}</span></li>
            </ol>
          </div>
        );
      default:
        return (
          <div>
            <p className="font-bold">Ocorreu um erro ao autenticar:</p>
            <p className="bg-black/40 p-2.5 rounded border border-white/5 font-mono text-[11px] mt-2 select-text text-red-400 break-all">{errCode}</p>
            <div className="mt-3 text-[11px] text-gray-400 space-y-2">
              <p>Por favor, certifique-se de que no Console do seu projeto Firebase (<span className="font-bold text-white">{projId}</span>):</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Ativou os métodos <span className="font-bold text-white">E-mail/Senha</span> e <span className="font-bold text-white">Google</span> em <span className="italic text-gray-300">Authentication &gt; Sign-in method</span>.</li>
                <li>Criou a base do <span className="font-bold text-white">Firestore Database</span> em modo de teste ou configurou as regras.</li>
                <li>Adicionou os domínios autorizados necessários.</li>
              </ul>
            </div>
          </div>
        );
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Safe Firestore Operation (Failure does not abort successful OAuth authentication)
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          await setDoc(userDocRef, {
            id: user.uid,
            name: user.displayName || 'Usuário',
            email: user.email || '',
            subscriptionStatus: 'inactive',
            subscriptionActiveUntil: 0,
            createdAt: new Date().toISOString()
          });
        }
      } catch (firestoreErr) {
        console.warn('Silent Firestore check/write failure during Google login, proceeding:', firestoreErr);
      }
    } catch (err: any) {
      console.error('Google Auth Error:', err);
      const errStr = (err?.message || err?.toString() || '').toLowerCase();
      const isOfflineError = errStr.includes('offline') || errStr.includes('failed to get document') || errStr.includes('unavailable');

      if (isOfflineError && auth.currentUser) {
        console.warn('Ignoring offline Firestore error during Google Sign-In as auth is already complete. App will rely on local simulation.');
        return;
      }

      // Ignore closed popup error (auth/popup-closed-by-user)
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(getFirebaseErrorMessage(err.code || err.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (!isLogin && !name)) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        // Sign In
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // Sign Up
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Save display name
        try {
          await updateProfile(user, { displayName: name });
        } catch (profileErr) {
          console.warn('Could not update profile display name, proceeding:', profileErr);
        }

        // Create user document in Firestore to persist plan info
        try {
          await setDoc(doc(db, 'users', user.uid), {
            id: user.uid,
            name: name,
            email: email,
            subscriptionStatus: 'inactive',
            subscriptionActiveUntil: 0,
            createdAt: new Date().toISOString()
          });
        } catch (firestoreErr) {
          console.warn('Silent Firestore write failure during registration, proceeding:', firestoreErr);
        }
      }
    } catch (err: any) {
      console.error('Auth Error:', err);
      setError(getFirebaseErrorMessage(err.code || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-surface-800 border border-white/5 rounded-3xl shadow-2xl p-8 relative z-10"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-red-600 to-red-400 mb-2">
            RBFLIX
          </h1>
          <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">
            {isLogin ? 'Faça login para continuar' : 'Crie sua conta grátis'}
          </p>
        </div>

        {/* Google Sign-In Button (highlighted as primary) */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full bg-gradient-to-r from-white to-gray-100 hover:from-gray-50 hover:to-gray-100 active:scale-[0.98] text-gray-900 py-3.5 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-3 shadow-xl hover:shadow-white/10 text-xs uppercase tracking-wider disabled:opacity-55 disabled:pointer-events-none cursor-pointer border border-white/20"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Entrar com Conta Google</span>
        </button>

        <div className="mt-4 p-3 bg-brand/10 border border-brand/20 rounded-xl text-[11px] text-center text-gray-300">
          💡 <span className="font-bold text-white">Método Seguro:</span> Use o botão do Google acima para fazer login e criar contas instantaneamente sem precisar de senha!
        </div>

        <div className="flex items-center gap-3 my-5">
          <div className="h-[1px] bg-white/5 flex-grow"></div>
          <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest leading-none">E-mail (Se ativo)</span>
          <div className="h-[1px] bg-white/5 flex-grow"></div>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-start gap-3 p-4 bg-red-950/40 border border-red-500/20 text-red-300 rounded-xl mb-6 text-xs"
          >
            <ShieldAlert size={18} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-bold uppercase tracking-wider text-[10px]">Verifique os campos</p>
              <div className="mt-1 opacity-90 leading-relaxed">{error}</div>
            </div>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Nome Completo</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                  <User size={18} />
                </div>
                <input 
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full bg-black/40 border border-white/5 focus:border-brand/40 text-sm text-white pl-11 pr-4 py-3 rounded-xl outline-none transition-all placeholder:text-gray-600"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">E-mail</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                <Mail size={18} />
              </div>
              <input 
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplo@gmail.com"
                className="w-full bg-black/40 border border-white/5 focus:border-brand/40 text-sm text-white pl-11 pr-4 py-3 rounded-xl outline-none transition-all placeholder:text-gray-600"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Senha</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                <Lock size={18} />
              </div>
              <input 
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="******"
                className="w-full bg-black/40 border border-white/5 focus:border-brand/40 text-sm text-white pl-11 pr-12 py-3 rounded-xl outline-none transition-all placeholder:text-gray-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand hover:bg-brand-600 active:scale-[0.98] text-white py-3.5 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand/15 text-xs uppercase tracking-wider disabled:opacity-55 disabled:pointer-events-none mt-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                {isLogin ? 'Entrar' : 'Cadastrar'} <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-white/5 pt-6">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            className="text-xs text-gray-400 hover:text-white font-medium transition-colors cursor-pointer"
          >
            {isLogin ? (
              <>Não tem uma conta? <span className="text-brand font-bold underline">Criar Conta</span></>
            ) : (
              <>Já tem uma conta? <span className="text-brand font-bold underline">Fazer Login</span></>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
