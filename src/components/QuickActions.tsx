import { Filter, Star, Ticket, LayoutGrid } from 'lucide-react';
import { motion } from 'motion/react';

export default function QuickActions() {
  const actions = [
    { id: 'genre', label: 'Gênero', icon: <Filter size={20} />, color: 'bg-pink-500' },
    { id: '2026', label: '2026', icon: <Star size={20} />, color: 'bg-blue-400', secondary: 'NEW' },
    { id: 'cinema', label: 'No Cinema', icon: <Ticket size={20} />, color: 'bg-green-500' },
    { id: 'all', label: 'Todos', icon: <LayoutGrid size={20} />, color: 'bg-yellow-400', secondary: 'ALL' },
  ];

  return (
    <div className="grid grid-cols-4 gap-4 px-8 py-4">
      {actions.map((action) => (
        <motion.button
          key={action.id}
          whileHover={{ scale: 1.05, filter: 'brightness(1.1)' }}
          whileTap={{ scale: 0.95 }}
          tabIndex={0}
          className={`flex flex-col items-center justify-center gap-2 p-6 rounded-lg ${action.color} text-white font-medium cursor-pointer relative overflow-hidden group tv-focusable`}
        >
          <div className="p-3 bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
             {action.icon}
          </div>
          <span className="text-sm font-bold tracking-tight">{action.label}</span>
          
          {action.secondary && (
             <span className="absolute top-2 right-2 text-[8px] font-black opacity-40">
                {action.secondary}
             </span>
          )}
        </motion.button>
      ))}
    </div>
  );
}
