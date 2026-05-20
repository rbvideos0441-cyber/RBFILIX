import { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, CheckCircle, Smartphone, Send, QrCode } from 'lucide-react';

export default function PlansScreen() {
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'premium'>('basic');
  const [whatsapp, setWhatsapp] = useState('5511999999999'); 
  const [showQR, setShowQR] = useState(false);
  const [checkingInfo, setCheckingInfo] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const docRef = doc(db, 'app_config', 'settings');
        const snap = await getDoc(docRef);
        if (snap.exists() && snap.data().whatsappNumber) {
          // Remove any non-numeric formatting from whatsapp
          const rawNum = snap.data().whatsappNumber.replace(/\D/g, '');
          if (rawNum) setWhatsapp(rawNum);
        }
      } catch (err) {
        console.error('Error fetching whatsapp config:', err);
      } finally {
        setCheckingInfo(false);
      }
    };
    fetchConfig();
  }, []);

  const userEmail = auth.currentUser?.email || '';
  const userName = auth.currentUser?.displayName || 'Cliente';

  const plans = [
    {
      id: 'basic',
      name: 'Plano Plus Mensal',
      price: '15,00',
      period: 'mês',
      screens: '1 Tela simultânea',
      quality: 'Ultra HD 4K',
      description: 'Acesso completo a todos os filmes, séries e animes sem anúncios por 30 dias.',
      recommended: true,
    }
  ];

  const getWhatsAppLink = (planName: string) => {
    const text = `Olá! Gostaria de ativar meu plano ${planName} no RBFLIX.\n\nNome: ${userName}\nEmail cadastrado: ${userEmail}`;
    return `https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`;
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  return (
    <div className="min-h-screen bg-surface-900 text-white flex flex-col justify-between py-12 px-4 relative overflow-hidden">
      {/* Background blurs */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-violet-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="max-w-6xl mx-auto w-full flex justify-between items-center z-10">
        <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-red-600 to-red-400">
          RBFLIX
        </h1>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl border border-white/5"
        >
          <LogOut size={14} /> Sair da Conta
        </button>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto w-full flex flex-col items-center justify-center my-auto z-10 mt-8">
        <div className="text-center max-w-xl mb-10">
          <span className="bg-brand/10 border border-brand/20 text-brand font-bold text-[10px] tracking-widest px-3 py-1 rounded-full uppercase">
            Acesso Restrito
          </span>
          <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight mt-3 mb-4">
            Escolha seu Plano de Acesso
          </h2>
          <p className="text-sm text-gray-400 leading-relaxed">
            Seja bem-vindo, <strong className="text-white">{userName}</strong>! Para liberar todo o catálogo de canais, filmes e séries, escolha seu plano abaixo. O pagamento é simples e seguro no WhatsApp.
          </p>
        </div>

        {/* Plan Grid */}
        <div className="w-full max-w-md flex flex-col gap-6">
          {plans.map((plan) => (
            <motion.div
              key={plan.id}
              whileHover={{ y: -4 }}
              className="relative bg-surface-800 border-2 border-brand rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col justify-between"
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand text-white font-black text-[9px] tracking-widest uppercase px-3 py-1 rounded-full shadow-lg">
                RECOMENDADO
              </div>

              <div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold tracking-tight">{plan.name}</h3>
                    <p className="text-xs text-brand mt-1 font-medium">{plan.screens}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-black tracking-tighter">R$ {plan.price}</span>
                    <span className="text-xs text-gray-500 block">/ {plan.period}</span>
                  </div>
                </div>

                <p className="text-xs text-gray-400 leading-relaxed mb-6 border-b border-white/5 pb-4">
                  {plan.description}
                </p>

                <ul className="space-y-3.5 mb-8">
                  {[
                    `Telas: ${plan.screens}`,
                    `Resolução: ${plan.quality} (Máxima Qualidade)`,
                    'Sem anúncios ou interrupções',
                    'Uso ilimitado de canais, filmes, séries e animes',
                    'Ativação imediata em minutos'
                  ].map((benefit, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-xs text-gray-300 font-medium">
                      <CheckCircle size={15} className="text-emerald-500 fill-emerald-950/40 shrink-0" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => setShowQR(true)}
                  className="w-full bg-brand hover:bg-brand-600 active:scale-[0.98] text-white py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider shadow-lg shadow-brand/15 cursor-pointer"
                >
                  <Send size={15} /> Ativar com WhatsApp / PIX
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Quick Help */}
        <p className="text-[10px] text-gray-500 uppercase tracking-widest text-center mt-12">
          Após a confirmação da transferência, sua conta é ativada por 30 dias automaticamente.
        </p>
      </main>

      {/* Spacing footer */}
      <footer className="h-6" />

      {/* Payment QR Modal */}
      <AnimatePresence>
        {showQR && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 text-white"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-surface-805 border border-white/5 w-full max-w-sm rounded-[32px] overflow-hidden p-6 md:p-8 flex flex-col items-center text-center shadow-2xl relative"
            >
              <button
                onClick={() => setShowQR(false)}
                className="absolute top-6 right-6 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all text-xs"
              >
                ✕
              </button>

              <div className="w-12 h-12 bg-brand/15 text-brand rounded-full flex items-center justify-center mb-4 border border-brand/10">
                <QrCode size={24} />
              </div>

              <h3 className="text-xl font-bold mb-2">Escaneie o QR Code</h3>
              <p className="text-xs text-gray-400 leading-relaxed mb-6 max-w-xs">
                Aponte a câmera do seu celular para abrir o nosso WhatsApp e concluir o pagamento via PIX, ou clique no botão direto abaixo.
              </p>

              {/* QR Image fetching scannable WhatsApp URL */}
              <div className="bg-white p-4 rounded-3xl shadow-inner mb-6 border border-white/10">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(getWhatsAppLink('Plano Mensal'))}`}
                  alt="Conversa de pagamento"
                  className="w-48 h-48 block rounded-xl"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="space-y-3 w-full">
                <a
                  href={getWhatsAppLink('Plano Mensal')}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/15"
                >
                  <Smartphone size={16} /> Ir Para o WhatsApp
                </a>
                <button
                  onClick={() => setShowQR(false)}
                  className="w-full py-3.5 border border-white/5 hover:bg-white/5 rounded-2xl font-bold text-xs hover:text-white text-gray-400 transition-all uppercase tracking-wider"
                >
                  Voltar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
