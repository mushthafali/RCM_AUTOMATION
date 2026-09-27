import React, { useState, useEffect, useMemo } from 'react';
import { Instrument } from '../types/schema';
import { CustomSelect, SelectOption } from './ui/CustomSelect';
import { useLanguage } from '../context/LanguageContext';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine 
} from 'recharts';
import { TrendingUp, Search, X } from 'lucide-react';

interface DriftAnalyticsViewProps {
  instruments: Instrument[];
  initialInstrumentId?: number | null;
  onSelectInstrument?: (id: number) => void;
}

export const DriftAnalyticsView: React.FC<DriftAnalyticsViewProps> = React.memo(({ 
  instruments,
  initialInstrumentId,
  onSelectInstrument
}) => {
  const { language, t } = useLanguage();
  const [selectedInstId, setSelectedInstId] = useState<number>(() => {
    if (initialInstrumentId && instruments.some(i => i.instrument_id === initialInstrumentId)) {
      return initialInstrumentId;
    }
    return instruments.length > 0 ? instruments[0].instrument_id : 1;
  });

  // Sync state whenever initialInstrumentId changes from outside (e.g. clicking from Dashboard card)
  useEffect(() => {
    if (initialInstrumentId && instruments.some(i => i.instrument_id === initialInstrumentId)) {
      setSelectedInstId(initialInstrumentId);
    }
  }, [initialInstrumentId, instruments]);

  // Search Query for Instruments
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Process Variable (Parameter) Filter
  const [selectedPV, setSelectedPV] = useState<string>('ALL');

  // Available Parameter Options
  const pvOptions: SelectOption[] = useMemo(() => {
    const uniquePVs = Array.from(new Set(instruments.map(i => i.process_variable))).sort();
    return [
      { value: 'ALL', label: `${t.driftAnalytics.allParameters} (${instruments.length})` },
      ...uniquePVs.map(pv => {
        const count = instruments.filter(i => i.process_variable === pv).length;
        return {
          value: pv,
          label: `${pv} (${count})`
        };
      })
    ];
  }, [instruments, t]);

  // Instruments filtered by selected Parameter AND searchQuery
  const filteredInstruments = useMemo(() => {
    return instruments.filter(i => {
      const matchesPV = selectedPV === 'ALL' || i.process_variable.toLowerCase() === selectedPV.toLowerCase();
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        i.tag_number.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.location.toLowerCase().includes(q);

      return matchesPV && matchesSearch;
    });
  }, [instruments, selectedPV, searchQuery]);

  // Switch Parameter filter and auto-select appropriate instrument
  const handlePVChange = (newPV: string) => {
    setSelectedPV(newPV);
    const subset = instruments.filter(i => {
      const matchesPV = newPV === 'ALL' || i.process_variable.toLowerCase() === newPV.toLowerCase();
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || i.tag_number.toLowerCase().includes(q) || i.description.toLowerCase().includes(q);
      return matchesPV && matchesSearch;
    });
    if (subset.length > 0 && !subset.some(i => i.instrument_id === selectedInstId)) {
      setSelectedInstId(subset[0].instrument_id);
      onSelectInstrument?.(subset[0].instrument_id);
    }
  };

  const selectedInst = instruments.find(i => i.instrument_id === selectedInstId) || instruments[0];

  const instrumentOptions: SelectOption[] = useMemo(() => {
    if (filteredInstruments.length === 0) {
      return [{
        value: '',
        label: t.driftAnalytics.noDataTitle,
        sublabel: t.driftAnalytics.noDataDesc
      }];
    }
    return filteredInstruments.map(inst => ({
      value: String(inst.instrument_id),
      label: `${inst.tag_number} - ${inst.description.slice(0, 25)}`,
      sublabel: `${inst.process_variable} (${inst.range_min}~${inst.range_max} ${inst.engineering_unit})`
    }));
  }, [filteredInstruments, t]);

  if (!selectedInst) {
    return (
      <div className="p-12 text-center ref-card text-[#769188] text-xs font-medium">
        Belum ada data instrumen untuk dianalisis.
      </div>
    );
  }

  const vendorTol = selectedInst.vendor_tolerance_percent;
  const history = selectedInst.calibration_history || [];

  const chartData = history.map((session, sIdx) => {
    const pt0 = session.data_points.find(p => Math.abs(p.percent_span - 0) < 1);
    const pt50 = session.data_points.find(p => Math.abs(p.percent_span - 50) < 1);
    const pt100 = session.data_points.find(p => Math.abs(p.percent_span - 100) < 1);

    return {
      sessionLabel: `${session.calibration_date} (#${sIdx + 1})`,
      date: session.calibration_date,
      action: session.decision_action,
      errorSpan0: pt0 ? pt0.as_found_error_percent : 0,
      errorSpan50: pt50 ? pt50.as_found_error_percent : 0,
      errorSpan100: pt100 ? pt100.as_found_error_percent : 0,
      upperLimit: vendorTol,
      lowerLimit: -vendorTol
    };
  });

  return (
    <div className="space-y-4 animate-fade-in w-full">
      {/* Header Bar */}
      <div className="ref-card p-4 space-y-3.5">
        {/* Row 1: Module Title & Active Instrument Context */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-[#F0F5F2]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E8F4F0] border border-[#D1E6DF] flex items-center justify-center text-[#357F6B] shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[#192E27] tracking-tight">
                  {t.driftAnalytics.title}
                </h2>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#EBF3F0] text-[#357F6B] border border-[#D5E6E0]">
                  {selectedInst.tag_number}
                </span>
              </div>
              <p className="text-[11px] text-[#5D7A70] font-medium mt-0.5 truncate max-w-md">
                {selectedInst.description} &bull; {selectedInst.process_variable}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#5D7A70] shrink-0 self-start sm:self-center">
            <span className="px-2.5 py-1 bg-[#F4F8F6] rounded-md border border-[#E0EBE6] text-[11px] font-medium text-[#357F6B]">
              {language === 'id' ? 'Toleransi Pabrikan:' : 'Vendor Tolerance:'} <strong className="text-[#192E27] font-mono">&plusmn;{vendorTol}%</strong>
            </span>
          </div>
        </div>

        {/* Row 2: Search & Filter Controls (Structured 12-Column Grid) */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
          {/* Search Bar Input */}
          <div className="sm:col-span-4 relative flex items-center">
            <Search className="w-3.5 h-3.5 text-[#769188] absolute left-3 pointer-events-none" />
            <input
              type="text"
              placeholder={t.driftAnalytics.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filteredInstruments.length > 0) {
                  const targetId = filteredInstruments[0].instrument_id;
                  setSelectedInstId(targetId);
                  onSelectInstrument?.(targetId);
                }
              }}
              className="input-pill input-pill-search !py-2 !text-xs w-full pr-8"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 text-[#769188] hover:text-[#192E27] p-0.5 rounded-full hover:bg-slate-200 cursor-pointer transition"
                title="Hapus pencarian"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Dropdown Filter Parameter */}
          <div className="sm:col-span-3">
            <CustomSelect
              value={selectedPV}
              onChange={(val) => handlePVChange(val)}
              options={pvOptions}
            />
          </div>

          {/* Dropdown Pilih Instrumen */}
          <div className="sm:col-span-5">
            <CustomSelect
              value={String(selectedInstId)}
              onChange={(val) => {
                if (val) {
                  const id = Number(val);
                  setSelectedInstId(id);
                  onSelectInstrument?.(id);
                }
              }}
              options={instrumentOptions}
            />
          </div>
        </div>
      </div>

      {/* Specs Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
        <div className="p-3.5 rounded-2xl bg-white border border-[#E4EFEA] shadow-soft space-y-0.5">
          <span className="text-[10px] text-[#769188] font-sans block uppercase font-bold tracking-wider">{language === 'id' ? 'Tag & Parameter' : 'Tag & Parameter'}</span>
          <div className="text-xs font-bold text-[#192E27]">{selectedInst.tag_number} ({selectedInst.process_variable})</div>
          <span className="text-[11px] text-[#769188] font-sans truncate block">{selectedInst.description}</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-[#E4EFEA] shadow-soft space-y-0.5">
          <span className="text-[10px] text-[#769188] font-sans block uppercase font-bold tracking-wider">{language === 'id' ? 'Batas Vendor' : 'Vendor Limit'}</span>
          <div className="text-xs font-bold text-[#357F6B]">&plusmn;{selectedInst.vendor_tolerance_percent}% Span</div>
          <span className="text-[11px] text-[#769188] font-sans">Span: {selectedInst.range_max - selectedInst.range_min} {selectedInst.engineering_unit}</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-[#E4EFEA] shadow-soft space-y-0.5">
          <span className="text-[10px] text-[#769188] font-sans block uppercase font-bold tracking-wider">{t.instrumentList.dueDate}</span>
          <div className="text-xs font-bold text-[#192E27]">{selectedInst.next_due_date}</div>
          <span className="text-[11px] text-[#769188] font-sans">Interval: {selectedInst.current_interval_months} {language === 'id' ? 'Bulan' : 'Months'}</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-[#E4EFEA] shadow-soft space-y-0.5">
          <span className="text-[10px] text-[#769188] font-sans block uppercase font-bold tracking-wider">{t.instrumentList.rcmClassification}</span>
          <div className="text-xs font-bold text-[#192E27]">{selectedInst.rcm_profile.final_classification}</div>
          <span className="text-[11px] text-[#769188] font-sans">{history.length} {language === 'id' ? 'Sesi Terdata' : 'Sessions Recorded'}</span>
        </div>
      </div>

      {/* Main Drift Chart inside Ref Card */}
      <div className="ref-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#E4EFEA] pb-3 text-xs">
          <span className="font-bold text-[#192E27] uppercase tracking-tight">Tren Error (% Span) Antar-Sesi</span>
          <div className="flex items-center gap-4 font-mono text-xs">
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-[#357F6B]" />
              <span className="text-[#192E27] text-[11px] font-semibold">0% Span</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-[#F6B738]" />
              <span className="text-[#192E27] text-[11px] font-semibold">50% Span</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-[#192E27]" />
              <span className="text-[#192E27] text-[11px] font-semibold">100% Span</span>
            </div>
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-[#769188] text-xs font-medium">
            Belum ada riwayat kalibrasi untuk instrumen ini.
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 15, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4EFEA" />
                <XAxis dataKey="sessionLabel" stroke="#769188" fontSize={10} fontWeight={500} />
                <YAxis 
                  stroke="#769188" 
                  fontSize={10}
                  fontWeight={500}
                  domain={[-vendorTol * 1.5, vendorTol * 1.5]}
                  tickFormatter={(val) => `${val}%`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#192E27', borderColor: '#357F6B', borderRadius: '12px', fontSize: '11px', color: '#FFFFFF', boxShadow: '0 8px 20px rgba(0,0,0,0.15)' }}
                />

                <ReferenceLine 
                  y={vendorTol} 
                  label={{ value: `+${vendorTol}% Max`, fill: '#E26D6D', fontSize: 10, position: 'top', fontWeight: 'bold' }} 
                  stroke="#E26D6D" 
                  strokeDasharray="3 3" 
                />
                <ReferenceLine 
                  y={-vendorTol} 
                  label={{ value: `-${vendorTol}% Min`, fill: '#E26D6D', fontSize: 10, position: 'bottom', fontWeight: 'bold' }} 
                  stroke="#E26D6D" 
                  strokeDasharray="3 3" 
                />
                <ReferenceLine y={0} stroke="#CDE0D9" />

                <Line 
                  type="monotone" 
                  dataKey="errorSpan0" 
                  name="0% Span" 
                  stroke="#357F6B" 
                  strokeWidth={2.5} 
                  dot={{ r: 4, fill: '#357F6B', strokeWidth: 2, stroke: '#FFFFFF' }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="errorSpan50" 
                  name="50% Span" 
                  stroke="#F6B738" 
                  strokeWidth={2.5} 
                  dot={{ r: 4, fill: '#F6B738', strokeWidth: 2, stroke: '#FFFFFF' }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="errorSpan100" 
                  name="100% Span" 
                  stroke="#192E27" 
                  strokeWidth={2.5} 
                  dot={{ r: 4, fill: '#192E27', strokeWidth: 2, stroke: '#FFFFFF' }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Historical Sessions Table */}
      <div className="ref-card overflow-hidden">
        <div className="p-4 border-b border-[#E4EFEA] text-xs font-bold text-[#192E27] uppercase tracking-tight flex items-center justify-between">
          <span>{language === 'id' ? `Riwayat Kalibrasi Terdata (${history.length} Sesi)` : `Recorded Calibration History (${history.length} Sessions)`}</span>
          <span className="text-[10px] font-mono text-[#769188] font-normal">{language === 'id' ? 'Audit Trail Terverifikasi' : 'Verified Audit Trail'}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#E8F4F0] text-[#192E27] uppercase font-bold text-[10px] border-b border-[#E4EFEA]">
              <tr>
                <th className="py-3 px-4">{language === 'id' ? 'Tanggal' : 'Date'}</th>
                <th className="py-3 px-4">{language === 'id' ? 'Teknisi & Standar' : 'Technician & Standard'}</th>
                <th className="py-3 px-4">As-Found</th>
                <th className="py-3 px-4">{language === 'id' ? 'Keputusan' : 'Decision'}</th>
                <th className="py-3 px-4">{language === 'id' ? 'Interval Baru' : 'New Interval'}</th>
                <th className="py-3 px-4">{language === 'id' ? 'Catatan' : 'Notes'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4EFEA] font-medium">
              {history.map(s => (
                <tr key={s.calibration_id} className="hover:bg-[#E8F4F0]/40 transition">
                  <td className="py-3 px-4 font-mono font-bold text-[#192E27]">{s.calibration_date}</td>
                  <td className="py-3 px-4 text-[#192E27]">
                    <div className="font-semibold">{s.technician_name}</div>
                    <div className="text-[10px] text-[#769188] font-mono">{s.calibrator_standard_id}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                      s.as_found_status === 'Pass' ? 'bg-[#E8F4F0] text-[#357F6B] border border-[#357F6B]/30' : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {s.as_found_status}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-[#192E27] font-mono">{s.decision_action}</td>
                  <td className="py-3 px-4 font-bold text-[#357F6B] font-mono">{s.recommended_interval_months} {language === 'id' ? 'Bulan' : 'Mo'}</td>
                  <td className="py-3 px-4 text-[#769188] max-w-xs truncate">{s.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});
