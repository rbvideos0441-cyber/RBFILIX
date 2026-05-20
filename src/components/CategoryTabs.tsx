import { CATEGORIES } from '../types';
import { motion } from 'motion/react';

interface CategoryTabsProps {
  activeCategory: string;
  onSelect: (id: string) => void;
}

export default function CategoryTabs({ activeCategory, onSelect }: CategoryTabsProps) {
  return (
    <div className="flex items-center gap-8 px-12 py-6 overflow-x-auto no-scrollbar bg-surface-900 border-b border-white/5">
      {CATEGORIES.map((cat) => (
        <button
          id={cat.id === 'all' ? 'tv-nav-start' : `tab-${cat.id}`}
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={`relative text-xs font-bold tracking-[0.2em] transition-all cursor-pointer whitespace-nowrap uppercase px-3 py-1.5 rounded-lg tv-focusable ${
            activeCategory === cat.id ? 'text-white bg-white/5' : 'text-gray-500 hover:text-white'
          }`}
        >
          {cat.name}
          
          {activeCategory === cat.id && (
            <motion.div
              layoutId="active-tab"
              className="absolute -bottom-1 left-3 right-3 h-[2px] bg-brand"
            />
          )}
        </button>
      ))}
    </div>
  );
}
