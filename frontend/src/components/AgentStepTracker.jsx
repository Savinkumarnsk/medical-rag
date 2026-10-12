import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

const STEPS = [
  { id: 'routing',     label: 'Router' },
  { id: 'rewriting',   label: 'Rewriter' },
  { id: 'retrieving',  label: 'Retriever' },
  { id: 'grading',     label: 'Grader' },
  { id: 'generating',  label: 'Generator' },
  { id: 'verifying',   label: 'Verifier' },
];

export default function AgentStepTracker({ currentStep }) {
  const currentIndex = STEPS.findIndex(s => s.id === currentStep);

  return (
    <div className="flex items-center gap-1.5 flex-wrap py-1">
      {STEPS.map((step, idx) => {
        const isDone = idx < currentIndex;
        const isActive = idx === currentIndex;
        const isPending = idx > currentIndex;

        return (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.04 }}
            className={`step-badge-liquid ${
              isDone
                ? 'bg-purple-950/70 text-purple-200 border border-purple-400/40 shadow-sm shadow-purple-900/30'
                : isActive
                ? 'bg-gradient-to-r from-violet-600/40 to-fuchsia-600/40 text-white border border-fuchsia-400/70 shadow-lg shadow-purple-500/30 ring-1 ring-fuchsia-400/50'
                : 'bg-purple-950/20 text-purple-400/40 border border-purple-500/10'
            }`}
          >
            {isDone ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-fuchsia-400" />
            ) : isActive ? (
              <Loader2 className="w-3.5 h-3.5 text-purple-200 animate-spin" />
            ) : (
              <Circle className="w-2.5 h-2.5 text-purple-400/30" />
            )}
            <span className={isActive ? 'font-bold text-white' : ''}>
              {step.label}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
