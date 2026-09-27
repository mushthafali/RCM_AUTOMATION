import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface CustomNumberInputProps {
  value: number | string;
  onChange: (val: number) => void;
  step?: number;
  min?: number;
  max?: number;
  placeholder?: string;
  unit?: string;
  className?: string;
  showSteppers?: boolean;
}

export const CustomNumberInput: React.FC<CustomNumberInputProps> = ({
  value,
  onChange,
  step = 1,
  min,
  max,
  placeholder,
  unit,
  className = '',
  showSteppers = false
}) => {
  const numValue = typeof value === 'number' ? value : Number(value) || 0;

  const handleIncrement = () => {
    const next = Number((numValue + step).toFixed(4));
    if (max !== undefined && next > max) return;
    onChange(next);
  };

  const handleDecrement = () => {
    const next = Number((numValue - step).toFixed(4));
    if (min !== undefined && next < min) return;
    onChange(next);
  };

  return (
    <div className={`relative flex items-center rounded-full bg-white border border-sage-200/80 shadow-sm focus-within:border-gold-500 focus-within:ring-2 focus-within:ring-gold-500/20 transition duration-200 ${className}`}>
      <input
        type="number"
        step={step}
        min={min}
        max={max}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-transparent px-3.5 py-1.5 text-xs font-mono font-bold text-sage-900 placeholder:text-sage-400 focus:outline-none"
      />

      {unit && (
        <span className="pr-3 text-[11px] font-mono font-semibold text-sage-500 select-none">
          {unit}
        </span>
      )}

      {showSteppers && (
        <div className="flex flex-col border-l border-sage-200 pr-1">
          <button
            type="button"
            onClick={handleIncrement}
            className="px-1.5 py-0.5 text-sage-400 hover:text-gold-600 rounded transition"
          >
            <ChevronUp className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={handleDecrement}
            className="px-1.5 py-0.5 text-sage-400 hover:text-gold-600 rounded transition"
          >
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
};
