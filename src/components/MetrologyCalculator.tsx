import React, { useState, useMemo } from 'react';
import { 
  calculateSpan, 
  calculateStandardInput, 
  calculateError, 
  calculateErrorPercent, 
  calculateDrift, 
  calculateDriftPercent 
} from '../utils/metrology';
import { PHYSICAL_QUANTITIES, getCategoryById } from '../utils/physicalQuantities';
import { CustomSelect, SelectOption } from './ui/CustomSelect';
import { useLanguage } from '../context/LanguageContext';
import { Calculator, RefreshCw } from 'lucide-react';

export const MetrologyCalculator: React.FC = () => {
  const { language, t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string>('Pressure');
  const [rangeMin, setRangeMin] = useState<number>(0);
  const [rangeMax, setRangeMax] = useState<number>(50);
  const [unit, setUnit] = useState<string>('psig');
  const [vendorTolerancePct, setVendorTolerancePct] = useState<number>(0.25);
  const [pointCount, setPointCount] = useState<3 | 5>(5);

  const activeCategory = getCategoryById(selectedCategory);
  const availableUnits = activeCategory.units;

  const categoryOptions: SelectOption[] = useMemo(() => PHYSICAL_QUANTITIES.map(c => ({
    value: c.id,
    label: language === 'en' ? (c.nameEn || c.name) : c.name
  })), [language]);

  const unitOptions: SelectOption[] = availableUnits.map(u => ({
    value: u,
    label: u
  }));

  const pointOptions: SelectOption[] = [
    { value: '3', label: language === 'id' ? '3 Titik (0%, 50%, 100%)' : '3 Points (0%, 50%, 100%)' },
    { value: '5', label: language === 'id' ? '5 Titik (0, 25, 50, 75, 100%)' : '5 Points (0, 25, 50, 75, 100%)' }
  ];

  const span = calculateSpan(rangeMin, rangeMax);
  const percentages = pointCount === 3 ? [0, 50, 100] : [0, 25, 50, 75, 100];

  const [readings, setReadings] = useState<{ [pct: number]: number }>({
    0: 0.02,
    25: 12.53,
    50: 25.05,
    75: 37.56,
    100: 50.08
  });

  const [previousErrors, setPreviousErrors] = useState<{ [pct: number]: number }>({
    0: 0.0,
    25: 0.0,
    50: 0.0,
    75: 0.0,
    100: 0.0
  });

  const handleCategoryChange = (newCatId: string) => {
    setSelectedCategory(newCatId);
    const cat = getCategoryById(newCatId);
    setUnit(cat.defaultUnit);
  };

  const handleReadingChange = (pct: number, val: number) => {
    setReadings(prev => ({ ...prev, [pct]: val }));
  };

  const handlePrevErrorChange = (pct: number, val: number) => {
    setPreviousErrors(prev => ({ ...prev, [pct]: val }));
  };

  const handleResetToIdeal = () => {
    const ideal: { [pct: number]: number } = {};
    percentages.forEach(pct => {
      ideal[pct] = calculateStandardInput(rangeMin, rangeMax, pct);
    });
    setReadings(ideal);
  };

  return (
    <div className="space-y-4 animate-fade-in w-full">
      {/* Header Bar */}
      <div className="ref-card p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#E8F4F0] flex items-center justify-center text-[#357F6B] shrink-0">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#192E27] uppercase tracking-wide">
              {t.metrology.title}
            </h2>
            <p className="text-xs text-[#769188] font-normal">
              {t.metrology.subtitle}
            </p>
          </div>
        </div>

        <button
          onClick={handleResetToIdeal}
          className="btn-mint px-4 py-2 rounded-2xl text-xs font-semibold flex items-center gap-2 transition"
        >
          <RefreshCw className="h-4 w-4 text-[#357F6B]" />
          <span>{t.metrology.resetIdeal}</span>
        </button>
      </div>

      {/* Configuration Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <div className="p-3.5 rounded-2xl bg-white border border-[#E4EFEA] shadow-soft space-y-1.5 sm:col-span-2 lg:col-span-2">
          <label className="text-[10px] font-bold uppercase font-mono text-[#769188] block">{t.metrology.parameter}</label>
          <CustomSelect
            value={selectedCategory}
            onChange={handleCategoryChange}
            options={categoryOptions}
          />
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-[#E4EFEA] shadow-soft space-y-1.5">
          <label className="text-[10px] font-bold uppercase font-mono text-[#769188] block">{t.metrology.unit} ({selectedCategory})</label>
          <CustomSelect
            value={unit}
            onChange={setUnit}
            options={unitOptions}
          />
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-[#E4EFEA] shadow-soft space-y-1.5">
          <label className="text-[10px] font-bold uppercase font-mono text-[#769188] block">Range Min</label>
          <input
            type="number"
            value={rangeMin}
            onChange={(e) => setRangeMin(Number(e.target.value))}
            className="w-full bg-[#F4F7F6] border border-[#E4EFEA] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#192E27] focus:outline-none focus:border-[#357F6B] focus:bg-white transition"
          />
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-[#E4EFEA] shadow-soft space-y-1.5">
          <label className="text-[10px] font-bold uppercase font-mono text-[#769188] block">Range Max</label>
          <input
            type="number"
            value={rangeMax}
            onChange={(e) => setRangeMax(Number(e.target.value))}
            className="w-full bg-[#F4F7F6] border border-[#E4EFEA] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#192E27] focus:outline-none focus:border-[#357F6B] focus:bg-white transition"
          />
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-[#E4EFEA] shadow-soft space-y-1.5">
          <label className="text-[10px] font-bold uppercase font-mono text-[#769188] block">Toleransi (%)</label>
          <input
            type="number"
            step="0.05"
            value={vendorTolerancePct}
            onChange={(e) => setVendorTolerancePct(Number(e.target.value))}
            className="w-full bg-[#F4F7F6] border border-[#E4EFEA] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#192E27] focus:outline-none focus:border-[#357F6B] focus:bg-white transition"
          />
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-[#E4EFEA] shadow-soft space-y-1.5">
          <label className="text-[10px] font-bold uppercase font-mono text-[#769188] block">Titik Uji</label>
          <CustomSelect
            value={String(pointCount)}
            onChange={(val) => setPointCount(Number(val) as 3 | 5)}
            options={pointOptions}
          />
        </div>
      </div>

      {/* Table in Ref Card */}
      <div className="ref-card overflow-hidden">
        <div className="p-4 px-5 border-b border-[#E4EFEA] flex items-center justify-between text-xs">
          <span className="font-bold text-[#192E27] uppercase tracking-wide">
            Tabel Titik Ukur Metrologi ({activeCategory.name} - {unit})
          </span>
          <span className="font-mono font-bold text-[#357F6B] bg-[#E8F4F0] px-3 py-1 rounded-full border border-[#357F6B]/20 text-xs">
            Span: {span} {unit} &bull; Batas: &plusmn;{((vendorTolerancePct / 100) * span).toFixed(3)} {unit}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#E8F4F0] text-[#192E27] uppercase tracking-wider font-bold text-[10px] border-b border-[#E4EFEA]">
              <tr>
                <th className="py-3 px-4">% Span</th>
                <th className="py-3 px-4">Standard Input ({unit})</th>
                <th className="py-3 px-4">As-Found Reading ({unit})</th>
                <th className="py-3 px-4">As-Found Error ({unit})</th>
                <th className="py-3 px-4">Error (% Span)</th>
                <th className="py-3 px-4">Error Sesi Lalu ({unit})</th>
                <th className="py-3 px-4">Drift ({unit})</th>
                <th className="py-3 px-4">Drift (% Span)</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4EFEA] font-mono text-xs">
              {percentages.map(pct => {
                const stdInput = calculateStandardInput(rangeMin, rangeMax, pct);
                const reading = readings[pct] !== undefined ? readings[pct] : stdInput;
                const prevErr = previousErrors[pct] !== undefined ? previousErrors[pct] : 0;
                
                const err = calculateError(reading, stdInput);
                const errPct = calculateErrorPercent(err, span);
                const drift = calculateDrift(err, prevErr);
                const driftPct = calculateDriftPercent(drift, span);

                const isPass = Math.abs(errPct) <= vendorTolerancePct;

                return (
                  <tr key={pct} className="hover:bg-[#E8F4F0]/40 transition">
                    <td className="py-3 px-4 font-bold text-[#192E27]">{pct}%</td>
                    <td className="py-3 px-4 text-[#769188]">{stdInput}</td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        step="0.01"
                        value={reading}
                        onChange={(e) => handleReadingChange(pct, Number(e.target.value))}
                        className="w-24 bg-[#F4F7F6] border border-[#E4EFEA] rounded-xl px-2.5 py-1 text-xs text-[#192E27] font-bold font-mono focus:border-[#357F6B] focus:bg-white focus:outline-none"
                      />
                    </td>
                    <td className={`py-3 px-4 font-semibold ${err >= 0 ? 'text-[#192E27]' : 'text-rose-600'}`}>
                      {err > 0 ? `+${err}` : err}
                    </td>
                    <td className={`py-3 px-4 font-bold ${isPass ? 'text-[#357F6B]' : 'text-rose-600'}`}>
                      {errPct > 0 ? `+${errPct}` : errPct}%
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        step="0.01"
                        value={prevErr}
                        onChange={(e) => handlePrevErrorChange(pct, Number(e.target.value))}
                        className="w-20 bg-[#F4F7F6] border border-[#E4EFEA] rounded-xl px-2.5 py-1 text-xs text-[#769188] font-mono focus:border-[#357F6B] focus:bg-white focus:outline-none"
                      />
                    </td>
                    <td className="py-3 px-4 text-[#192E27] font-medium">
                      {drift > 0 ? `+${drift}` : drift}
                    </td>
                    <td className="py-3 px-4 text-[#357F6B] font-bold">
                      {driftPct > 0 ? `+${driftPct}` : driftPct}%
                    </td>
                    <td className="py-3 px-4 text-center font-sans">
                      {isPass ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F4F0] text-[#357F6B] border border-[#357F6B]/30 uppercase">
                          PASS
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 uppercase">
                          FAIL
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
