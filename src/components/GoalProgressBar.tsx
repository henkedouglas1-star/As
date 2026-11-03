import React from 'react';
import { Target, Sparkles } from 'lucide-react';
import { SupportGoal } from '../types';
import { calculateGoalProgress } from '../lib/rules';

interface GoalProgressBarProps {
  goal: SupportGoal;
}

export default function GoalProgressBar({ goal }: GoalProgressBarProps) {
  const percent = calculateGoalProgress(goal.currentAmountDollars, goal.targetAmountDollars);
  const isComplete = percent >= 100;

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-[#F5F3FF] border border-[#EDE9FE] shadow-xs text-left">
      <div className="flex items-center justify-between text-xs font-bold text-[#18181B] mb-1.5">
        <span className="flex items-center gap-1.5 font-bold text-[#18181B]">
          <Target className="w-4 h-4 text-[#7C3AED]" />
          <span>{goal.title}</span>
        </span>
        <span className="font-mono text-[#7C3AED] bg-white px-2.5 py-0.5 rounded-full border border-[#E4E4E7] font-bold">
          {percent}%
        </span>
      </div>

      {goal.description && (
        <p className="text-xs text-[#71717A] mb-2 leading-relaxed">{goal.description}</p>
      )}

      {/* Progress Track */}
      <div className="w-full h-3 bg-white rounded-full overflow-hidden relative border border-[#E4E4E7]">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            isComplete ? 'bg-[#5B21B6]' : 'bg-[#7C3AED]'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="mt-2.5 flex items-center justify-between text-[11px] text-[#71717A] font-medium">
        <span>
          <strong className="text-[#18181B] font-bold">${goal.currentAmountDollars.toFixed(0)}</strong> raised
        </span>
        <span>Goal: ${goal.targetAmountDollars.toFixed(0)}</span>
      </div>

      {isComplete && (
        <div className="mt-2 text-center text-xs font-bold text-[#7C3AED] flex items-center justify-center gap-1">
          <Sparkles className="w-3.5 h-3.5" /> Goal successfully reached! Thank you supporters!
        </div>
      )}
    </div>
  );
}
