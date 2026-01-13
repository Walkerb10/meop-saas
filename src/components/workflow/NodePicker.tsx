import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, Webhook, Mic, Search, MessageSquare, Mail, Hash, Timer, 
  GitBranch, Sparkles, X, ChevronRight, Play
} from 'lucide-react';
import { WorkflowNodeType, NODE_CATEGORIES, NODE_STYLES } from '@/types/workflow';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface NodePickerProps {
  position: { x: number; y: number };
  onSelect: (type: WorkflowNodeType) => void;
  onClose: () => void;
  showTriggersFirst?: boolean;
}

const ICONS: Record<WorkflowNodeType, React.ReactNode> = {
  trigger_schedule: <Clock className="w-4 h-4" />,
  trigger_webhook: <Webhook className="w-4 h-4" />,
  trigger_voice: <Mic className="w-4 h-4" />,
  trigger_manual: <Play className="w-4 h-4" />,
  action_research: <Search className="w-4 h-4" />,
  action_text: <MessageSquare className="w-4 h-4" />,
  action_email: <Mail className="w-4 h-4" />,
  action_slack: <Hash className="w-4 h-4" />,
  action_discord: <Hash className="w-4 h-4" />,
  action_delay: <Timer className="w-4 h-4" />,
  condition: <GitBranch className="w-4 h-4" />,
  transform: <Sparkles className="w-4 h-4" />,
};

type CategoryKey = 'triggers' | 'actions' | 'logic';

export function NodePicker({ position, onSelect, onClose, showTriggersFirst = false }: NodePickerProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryKey | null>(
    showTriggersFirst ? 'triggers' : null
  );

  const categories: { key: CategoryKey; label: string; icon: React.ReactNode }[] = [
    { key: 'triggers', label: 'Triggers', icon: <Clock className="w-4 h-4" /> },
    { key: 'actions', label: 'Actions', icon: <Sparkles className="w-4 h-4" /> },
    { key: 'logic', label: 'Logic', icon: <GitBranch className="w-4 h-4" /> },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.15 }}
      className="fixed z-50 bg-card border border-border rounded-xl shadow-xl overflow-hidden min-w-[280px]"
      style={{ 
        left: Math.min(position.x, window.innerWidth - 300),
        top: Math.min(position.y, window.innerHeight - 400),
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-2">
          {activeCategory && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 -ml-1"
              onClick={() => setActiveCategory(null)}
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
            </Button>
          )}
          <span className="font-medium text-sm">
            {activeCategory ? categories.find(c => c.key === activeCategory)?.label : 'Add Node'}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="max-h-[320px] overflow-y-auto">
        <AnimatePresence mode="wait">
          {!activeCategory ? (
            <motion.div
              key="categories"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-2"
            >
              {categories.map((category) => (
                <button
                  key={category.key}
                  onClick={() => setActiveCategory(category.key)}
                  className={cn(
                    "w-full flex items-center justify-between gap-3 p-3 rounded-lg",
                    "hover:bg-accent/50 transition-colors text-left"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-secondary">
                      {category.icon}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{category.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {NODE_CATEGORIES[category.key].length} options
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-2 space-y-1"
            >
              {NODE_CATEGORIES[activeCategory].map((node) => {
                const style = NODE_STYLES[node.type];
                return (
                  <button
                    key={node.type}
                    onClick={() => {
                      onSelect(node.type);
                      onClose();
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg",
                      "hover:bg-accent/50 transition-colors text-left",
                      style.bgColor
                    )}
                  >
                    <div className={cn('p-2 rounded-lg', style.bgColor, style.color)}>
                      {ICONS[node.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{node.label}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {node.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
