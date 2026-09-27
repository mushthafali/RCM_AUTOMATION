import React from 'react';

interface CustomToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  trueLabel?: string;
  falseLabel?: string;
  variant?: 'amber' | 'emerald' | 'rose' | 'gold' | 'blue' | 'cobalt' | 'teal';
  className?: string;
}

export const CustomToggle: React.FC<CustomToggleProps> = ({
  checked,
  onChange,
  trueLabel = 'YA',
  falseLabel = 'TIDAK',
  variant = 'blue',
  className = ''
}) => {
  const getActiveStyle = () => {
    switch (variant) {
      case 'amber':
      case 'gold':
        return 'bg-[#F6B738] text-[#192E27] shadow-xs';
      case 'rose':
        return 'bg-[#E26D6D] text-white shadow-xs';
      case 'teal':
      case 'emerald':
      case 'blue':
      case 'cobalt':
      default:
        return 'bg-[#357F6B] text-white shadow-xs';
    }
  };

  return (
    <div className={`inline-flex items-center p-1 rounded-full bg-[#E8F4F0] border border-[#D1E6DF] text-xs font-semibold select-none shrink-0 ${className}`}>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`w-1/2 flex-1 min-w-max px-3 py-1.5 rounded-full text-xs text-center transition-colors whitespace-nowrap ${
          !checked
            ? 'bg-white text-[#192E27] font-bold shadow-xs'
            : 'text-[#769188] hover:text-[#192E27]'
        }`}
      >
        {falseLabel}
      </button>

      <button
        type="button"
        onClick={() => onChange(true)}
        className={`w-1/2 flex-1 min-w-max px-3 py-1.5 rounded-full text-xs text-center transition-colors whitespace-nowrap ${
          checked
            ? `${getActiveStyle()} font-bold`
            : 'text-[#769188] hover:text-[#192E27]'
        }`}
      >
        {trueLabel}
      </button>
    </div>
  );
};
