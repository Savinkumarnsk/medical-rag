import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Circle, Loader2, AlertCircle } from 'lucide-react';

const STEPS = [
  { id: 'routing',     label: 'Router' },
  { id: 'rewriting',   label: 'Rewrite' },
  { id: 'retrieving',  label: 'Retrieve' },
  { id: 'grading',     label: 'Grade' },
  { id: 'generating',  label: 'Generate' },
  { id: 'verifying',   label: 'Verify' },
];

const STEP_COLORS = {
  routing:    'text-violet-500 bg-violet-50 dark:bg-violet-950 border-violet-200 dark:border-violet-800',
  rewriting:  'text-blue-500 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800',
  retrieving: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950 border-cyan-200 dark:border-cyan-800',
  grading:    'text-amber-500 bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800',
  generating: 'text-teal-500 bg-teal-50 dark:bg-teal-950 border-teal-200 dark:border-teal-800',
  verifying:  'text-emerald-500 bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800',
};

export default function AgentStepTracker({ currentStep }) {
  const currentIndex = STEPS.findIndex(s => s.id === currentStep);

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {STEPS.map((step, idx) => {
        const status = idx < currentIndex ? 'done' : idx === currentIndex ? 'active' : 'pending';
        const colorClass = STEP_COLORS[step.id] || '';

        return (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            className={`step-badge border ${
              status === 'done'
                ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                : status === 'active'
                ? `${colorClass} border`
                : 'bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800'
            }`}
          >
            {status === 'done' ? (
              <CheckCircle className="w-3 h-3" />
            ) : status === 'active' ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Circle className="w-3 h-3" />
            )}
            {step.label}
          </motion.div>
        );
      })}
    </div>
  );
}
