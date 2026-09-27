import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Pilih...',
  className = '',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className={`relative select-none ${className}`}>
      {/* Trigger Button - Soft Pill Control */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#F4F7F6] hover:bg-white text-xs font-semibold border transition-colors text-left ${
          isOpen ? 'border-[#357F6B] bg-white ring-2 ring-[#357F6B]/15' : 'border-[#E4EFEA]'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className={`truncate ${selectedOption ? 'text-[#192E27] font-bold' : 'text-[#769188]'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-[#769188] ml-2 transition-transform duration-150 shrink-0 ${
            isOpen ? 'rotate-180 text-[#357F6B]' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full min-w-[200px] rounded-2xl bg-white border border-[#E4EFEA] shadow-card py-1.5 max-h-60 overflow-y-auto animate-fade-in">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`px-3.5 py-2 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-[#E8F4F0] text-[#357F6B] font-bold'
                    : 'text-[#192E27] hover:bg-[#F4F7F6]'
                }`}
              >
                <div className="truncate pr-2">
                  <span className="block">{opt.label}</span>
                  {opt.sublabel && (
                    <span className="text-[10px] text-[#769188] block font-normal">{opt.sublabel}</span>
                  )}
                </div>
                {isSelected && <Check className="h-3.5 w-3.5 text-[#357F6B] shrink-0" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
