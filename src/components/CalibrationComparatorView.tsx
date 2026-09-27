import React, { useState, useMemo } from 'react';
import { Instrument, CalibrationSession } from '../types/schema';
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
import { 
  GitCompare, 
  AlertTriangle, 
  ShieldCheck, 
  ArrowRight, 
  Info, 
  Sliders,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Check,
  Calendar,
  Search,
  X
} from 'lucide-react';

interface CalibrationComparatorViewProps {
  instruments: Instrument[];
  initialInstrumentId?: number | null;
  onSelectInstrument?: (id: number) => void;
  onOpenNewCalibration?: (inst: Instrument) => void;
}

// Cohesive high-contrast palette for multi-session lines
const SESSION_PALETTE = [
  { stroke: '#357F6B', bg: '#E8F4F0', text: '#215446', label: 'Teal' },
  { stroke: '#D97706', bg: '#FEF3C7', text: '#92400E', label: 'Amber' },
  { stroke: '#E11D48', bg: '#FFE4E6', text: '#9F1239', label: 'Rose' },
  { stroke: '#4F46E5', bg: '#EEF2FF', text: '#3730A3', label: 'Indigo' },
  { stroke: '#0284C7', bg: '#E0F2FE', text: '#0369A1', label: 'Sky' },
  { stroke: '#7C3AED', bg: '#F3E8FF', text: '#5B21B6', label: 'Violet' },
  { stroke: '#059669', bg: '#D1FAE5', text: '#065F46', label: 'Emerald' }
];

export const CalibrationComparatorView: React.FC<CalibrationComparatorViewProps> = React.memo(({
  instruments,
  initialInstrumentId,
  onSelectInstrument,
  onOpenNewCalibration
}) => {
  const { language, t } = useLanguage();
  const [selectedInstId, setSelectedInstId] = useState<number>(() => {
    if (initialInstrumentId && instruments.some(i => i.instrument_id === initialInstrumentId)) {
      return initialInstrumentId;
    }
    return instruments.length > 0 ? instruments[0].instrument_id : 1;
  });

  const selectedInst = instruments.find(i => i.instrument_id === selectedInstId) || instruments[0];
  const allSessions: CalibrationSession[] = selectedInst?.calibration_history || [];

  // Selected session IDs for comparison (default to all or last 3)
  const [selectedSessionIds, setSelectedSessionIds] = useState<number[]>(() => {
    if (allSessions.length <= 3) {
      return allSessions.map(s => s.calibration_id);
    }
    return allSessions.slice(-3).map(s => s.calibration_id);
  });

  // Search Query for Instruments
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Process Variable (Parameter) Filter
  const [selectedPV, setSelectedPV] = useState<string>('ALL');

  // Available Parameter Options
  const pvOptions: SelectOption[] = useMemo(() => {
    const uniquePVs = Array.from(new Set(instruments.map(i => i.process_variable))).sort();
    return [
      { value: 'ALL', label: `${t.comparator.allParameters} (${instruments.length})` },
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

  // Whenever selected instrument changes, refresh selected session IDs
  const handleInstrumentChange = (newId: number) => {
    setSelectedInstId(newId);
    onSelectInstrument?.(newId);
    const targetInst = instruments.find(i => i.instrument_id === newId);
    if (targetInst && targetInst.calibration_history) {
      const history = targetInst.calibration_history;
      setSelectedSessionIds(
        history.length <= 3 ? history.map(s => s.calibration_id) : history.slice(-3).map(s => s.calibration_id)
      );
    } else {
      setSelectedSessionIds([]);
    }
  };

  // Switch Parameter filter and auto-select appropriate instrument if current one is filtered out
  const handlePVChange = (newPV: string) => {
    setSelectedPV(newPV);
    const subset = instruments.filter(i => {
      const matchesPV = newPV === 'ALL' || i.process_variable.toLowerCase() === newPV.toLowerCase();
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || i.tag_number.toLowerCase().includes(q) || i.description.toLowerCase().includes(q);
      return matchesPV && matchesSearch;
    });
    if (subset.length > 0 && !subset.some(i => i.instrument_id === selectedInstId)) {
      handleInstrumentChange(subset[0].instrument_id);
    }
  };

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
      label: `${inst.tag_number} - ${inst.description.slice(0, 30)}`,
      sublabel: `${inst.process_variable} (${inst.range_min}~${inst.range_max} ${inst.engineering_unit}) • ${inst.calibration_history?.length || 0} ${language === 'id' ? 'Sesi' : 'Sessions'}`
    }));
  }, [filteredInstruments, t, language]);

  // Toggle session selection
  const toggleSession = (id: number) => {
    setSelectedSessionIds(prev => {
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev; // Keep at least one selected
        return prev.filter(x => x !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const selectAllSessions = () => {
    setSelectedSessionIds(allSessions.map(s => s.calibration_id));
  };

  const selectLastNSessions = (n: number) => {
    setSelectedSessionIds(allSessions.slice(-n).map(s => s.calibration_id));
  };

  // Filtered and sorted sessions
  const activeSessions = useMemo(() => {
    return allSessions
      .filter(s => selectedSessionIds.includes(s.calibration_id))
      .sort((a, b) => new Date(a.calibration_date).getTime() - new Date(b.calibration_date).getTime());
  }, [allSessions, selectedSessionIds]);

  // Unified span points across all active sessions
  const spanPoints = useMemo(() => {
    const set = new Set<number>();
    activeSessions.forEach(s => {
      s.data_points.forEach(p => set.add(Number(p.percent_span)));
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [activeSessions]);

  const vendorTol = selectedInst?.vendor_tolerance_percent || 0.25;
  const spanRange = selectedInst ? selectedInst.range_max - selectedInst.range_min : 100;

  // Chart dataset with series for each selected session
  const chartData = useMemo(() => {
    return spanPoints.map(pct => {
      const standardInput = selectedInst ? selectedInst.range_min + (spanRange * (pct / 100)) : pct;
      const row: any = {
        percent_span: pct,
        spanLabel: `${pct}%`,
        standard_input: Number(standardInput.toFixed(2)),
        upperTol: vendorTol,
        lowerTol: -vendorTol
      };

      activeSessions.forEach(session => {
        const pt = session.data_points.find(p => Math.abs(p.percent_span - pct) < 0.5);
        if (pt) {
          row[`error_${session.calibration_id}`] = Number(pt.as_found_error_percent.toFixed(3));
          row[`reading_${session.calibration_id}`] = Number(pt.as_found_reading.toFixed(3));
        } else {
          row[`error_${session.calibration_id}`] = null;
        }
      });

      return row;
    });
  }, [spanPoints, activeSessions, selectedInst, spanRange, vendorTol]);

  // ─── CLOSED-LOOP LEARNING ENGINE CALCULATIONS (OIML D 10 / RCM FEEDBACK) ───
  const learningAnalytics = useMemo(() => {
    if (activeSessions.length === 0) {
      return null;
    }

    // 1. Session Max Errors
    const sessionErrors = activeSessions.map(s => {
      const maxErr = s.data_points.reduce((max, p) => Math.max(max, Math.abs(p.as_found_error_percent)), 0);
      return {
        session: s,
        maxErrorPct: maxErr,
        ratioToVendorTol: vendorTol > 0 ? (maxErr / vendorTol) : 1,
        isOOT: maxErr > vendorTol,
        date: new Date(s.calibration_date)
      };
    });

    const latestAnalysis = sessionErrors[sessionErrors.length - 1];
    const earliestAnalysis = sessionErrors[0];

    // 2. Time elapsed in months between earliest & latest session
    let monthsElapsed = 1;
    if (sessionErrors.length >= 2) {
      const diffMs = Math.abs(latestAnalysis.date.getTime() - earliestAnalysis.date.getTime());
      monthsElapsed = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24 * 30.4375)));
    }

    // 3. Drift Velocity (% Span per Month)
    const errorDelta = Math.abs(latestAnalysis.maxErrorPct - earliestAnalysis.maxErrorPct);
    const driftVelocityPerMonth = sessionErrors.length >= 2 
      ? Number((errorDelta / monthsElapsed).toFixed(4))
      : 0;

    // 4. Shift Diagnosis: Zero Shift vs Span Tilt vs Non-Linearity
    let shiftDiagnosis = 'Data Tidak Cukup';
    let shiftType: 'zero' | 'span' | 'stable' | 'random' = 'stable';
    
    if (spanPoints.length >= 2 && activeSessions.length >= 2) {
      const firstSess = activeSessions[0];
      const lastSess = activeSessions[activeSessions.length - 1];

      const minPoint = spanPoints[0];
      const maxPoint = spanPoints[spanPoints.length - 1];

      const p0First = firstSess.data_points.find(p => Math.abs(p.percent_span - minPoint) < 0.5)?.as_found_error_percent || 0;
      const p0Last = lastSess.data_points.find(p => Math.abs(p.percent_span - minPoint) < 0.5)?.as_found_error_percent || 0;
      const zeroShiftDelta = Math.abs(p0Last - p0First);

      const p100First = firstSess.data_points.find(p => Math.abs(p.percent_span - maxPoint) < 0.5)?.as_found_error_percent || 0;
      const p100Last = lastSess.data_points.find(p => Math.abs(p.percent_span - maxPoint) < 0.5)?.as_found_error_percent || 0;
      const spanShiftDelta = Math.abs(p100Last - p100First);

      if (zeroShiftDelta < 0.25 * vendorTol && spanShiftDelta < 0.25 * vendorTol) {
        shiftDiagnosis = 'Penyimpangan alat sangat kecil di seluruh rentang uji.';
        shiftType = 'stable';
      } else if (Math.abs(zeroShiftDelta - spanShiftDelta) < 0.2 * vendorTol && zeroShiftDelta > 0.3 * vendorTol) {
        shiftDiagnosis = `Titik nol bergeser ±${zeroShiftDelta.toFixed(2)}%. Cukup atur ulang sekrup zero atau tare.`;
        shiftType = 'zero';
      } else if (spanShiftDelta > zeroShiftDelta * 1.5 && spanShiftDelta > 0.3 * vendorTol) {
        shiftDiagnosis = `Penyimpangan membesar di rentang atas (±${spanShiftDelta.toFixed(2)}%). Perlu penyetelan span.`;
        shiftType = 'span';
      } else {
        shiftDiagnosis = 'Penyimpangan tidak merata di beberapa titik beban.';
        shiftType = 'random';
      }
    }

    // 5. Health & Stability Index (0 - 100%)
    const avgRatio = sessionErrors.reduce((acc, s) => acc + s.ratioToVendorTol, 0) / sessionErrors.length;
    const failCount = sessionErrors.filter(s => s.isOOT || s.session.as_found_status === 'Fail').length;
    
    let rawHealth = 100 - (avgRatio * 50) - (failCount * 25) - (driftVelocityPerMonth * 100);
    const healthScore = Math.max(10, Math.min(100, Math.round(rawHealth)));

    // 6. OIML D 10 Adaptive Interval Learning Logic
    const currentInterval = selectedInst.current_interval_months || 12;
    let adaptiveInterval = currentInterval;
    let adaptiveAction: 'TIGHTEN_URGENT' | 'TIGHTEN_MODERATE' | 'MAINTAIN' | 'EXTEND_REWARD' = 'MAINTAIN';
    let adaptiveReason = '';
    let intervalMultiplier = 1.0;

    // Rule A: High Error / OOT -> Urgent Tightening (Pangkas 50%)
    if (latestAnalysis.isOOT || latestAnalysis.ratioToVendorTol >= 0.85 || failCount >= 1) {
      adaptiveAction = 'TIGHTEN_URGENT';
      intervalMultiplier = 0.5;
      adaptiveInterval = Math.max(3, Math.round(currentInterval * 0.5));
      adaptiveReason = `Deviasi ukur mendekati/melampaui toleransi (${(latestAnalysis.ratioToVendorTol * 100).toFixed(0)}%). Interval diperketat dari ${currentInterval} bulan menjadi ${adaptiveInterval} bulan guna mencegah out-of-spec.`;
    }
    // Rule B: Moderate Error (70% - 85% of vendor tol) -> Moderate Tightening (Pangkas 25%)
    else if (latestAnalysis.ratioToVendorTol >= 0.70 || driftVelocityPerMonth > 0.03) {
      adaptiveAction = 'TIGHTEN_MODERATE';
      intervalMultiplier = 0.75;
      adaptiveInterval = Math.max(3, Math.round(currentInterval * 0.75));
      adaptiveReason = `Laju drift terdeteksi (${driftVelocityPerMonth}%/bulan). Interval kalibrasi disesuaikan ke ${adaptiveInterval} bulan sebagai langkah preventif.`;
    }
    // Rule C: High Stability over multiple sessions -> Reward Extension (+50%)
    else if (
      sessionErrors.length >= 2 &&
      sessionErrors.every(s => s.ratioToVendorTol < 0.40) &&
      driftVelocityPerMonth < 0.015 &&
      healthScore >= 80
    ) {
      adaptiveAction = 'EXTEND_REWARD';
      intervalMultiplier = 1.5;
      adaptiveInterval = Math.min(36, Math.round(currentInterval * 1.5));
      if (adaptiveInterval > currentInterval) {
        adaptiveReason = `Stabilitas konsisten selama ${activeSessions.length} sesi (deviasi < 40% toleransi). Sesuai evaluasi OIML D 10, interval dapat diperpanjang dari ${currentInterval} bulan ke ${adaptiveInterval} bulan.`;
      } else {
        adaptiveReason = `Stabilitas konsisten selama ${activeSessions.length} sesi (deviasi < 40% toleransi). Interval saat ini (${currentInterval} bulan) sudah berada pada batas maksimum yang diizinkan.`;
      }
    }
    // Rule D: Normal Maintain
    else {
      adaptiveAction = 'MAINTAIN';
      intervalMultiplier = 1.0;
      adaptiveInterval = currentInterval;
      adaptiveReason = `Deviasi instrumen stabil dalam batas toleransi pabrikan (${(latestAnalysis.ratioToVendorTol * 100).toFixed(0)}%). Interval ${currentInterval} bulan dipertahankan.`;
    }

    return {
      sessionCount: activeSessions.length,
      healthScore,
      latestErrorPct: latestAnalysis.maxErrorPct,
      latestRatioPct: (latestAnalysis.ratioToVendorTol * 100).toFixed(1),
      driftVelocityPerMonth,
      shiftDiagnosis,
      shiftType,
      currentInterval,
      adaptiveInterval,
      adaptiveAction,
      adaptiveReason,
      intervalMultiplier
    };
  }, [activeSessions, vendorTol, spanPoints, selectedInst]);

  if (!selectedInst) {
    return (
      <div className="p-12 text-center ref-card text-[#769188] text-xs font-medium">
        Belum ada data instrumen untuk dianalisis.
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in w-full pb-8">
      {/* ─── TOP TOOLBAR CARD ─── */}
      <div className="ref-card p-4 space-y-3.5">
        {/* Row 1: Module Title & Active Instrument Identity */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-[#F0F5F2]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E8F4F0] border border-[#D1E6DF] flex items-center justify-center text-[#357F6B] shrink-0">
              <GitCompare className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[#192E27] tracking-tight">
                  Komparasi Kalibrasi
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
              Total: <strong className="text-[#192E27]">{allSessions.length} {language === 'id' ? 'Sesi Terdata' : 'Sessions'}</strong>
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
                  handleInstrumentChange(filteredInstruments[0].instrument_id);
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
                if (val) handleInstrumentChange(Number(val));
              }}
              options={instrumentOptions}
            />
          </div>
        </div>
      </div>

      {/* ─── MULTI-SESSION SELECTION BAR ─── */}
      <div className="ref-card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E4EFEA] pb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#192E27] uppercase tracking-tight flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#357F6B]" />
              <span>{language === 'id' ? 'Pilih Sesi Kalibrasi untuk Dikomparasikan' : 'Select Calibration Sessions to Compare'}</span>
            </span>
            <span className="text-[11px] font-mono font-semibold text-[#769188]">
              ({activeSessions.length} {language === 'id' ? 'dari' : 'of'} {allSessions.length} {language === 'id' ? 'Sesi Terpilih' : 'Sessions Selected'})
            </span>
          </div>

          {/* Quick select buttons */}
          <div className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={selectAllSessions}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
            >
              {language === 'id' ? 'Semua Sesi' : 'All Sessions'}
            </button>
            {allSessions.length >= 2 && (
              <button
                type="button"
                onClick={() => selectLastNSessions(2)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
              >
                {language === 'id' ? '2 Terakhir' : 'Last 2'}
              </button>
            )}
            {allSessions.length >= 3 && (
              <button
                type="button"
                onClick={() => selectLastNSessions(3)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
              >
                {language === 'id' ? '3 Terakhir' : 'Last 3'}
              </button>
            )}
          </div>
        </div>

        {allSessions.length === 0 ? (
          <div className="p-8 text-center text-[#769188] text-xs">
            {language === 'id' ? 'Instrumen ini belum memiliki riwayat sesi kalibrasi.' : 'This instrument has no recorded calibration history.'}
            {onOpenNewCalibration && (
              <button
                type="button"
                onClick={() => onOpenNewCalibration(selectedInst)}
                className="ml-2 text-[#357F6B] font-bold underline cursor-pointer"
              >
                {language === 'id' ? 'Input Sesi Kalibrasi Baru' : 'Input New Calibration Session'}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {allSessions.map((session, idx) => {
              const isChecked = selectedSessionIds.includes(session.calibration_id);
              const palette = SESSION_PALETTE[idx % SESSION_PALETTE.length];
              const maxErr = session.data_points.reduce((max, p) => Math.max(max, Math.abs(p.as_found_error_percent)), 0);

              return (
                <div
                  key={session.calibration_id}
                  onClick={() => toggleSession(session.calibration_id)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer select-none flex items-start gap-2.5 ${
                    isChecked
                      ? 'bg-white border-[#357F6B] shadow-xs ring-2 ring-[#357F6B]/20'
                      : 'bg-slate-50/70 border-slate-200 hover:border-slate-300 opacity-75'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 border transition ${
                      isChecked
                        ? 'bg-[#357F6B] border-[#357F6B] text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-xs font-bold text-slate-900 truncate">
                        {session.calibration_date}
                      </span>
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: palette.stroke }}
                        title={`Warna Garis: ${palette.label}`}
                      />
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      {session.technician_name} &bull; {session.data_points.length} Titik
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[10px]">
                      <span className={`font-bold px-1.5 py-0.2 rounded uppercase ${
                        session.as_found_status === 'Pass' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {session.as_found_status}
                      </span>
                      <span className="font-mono font-semibold text-slate-600">
                        Max: {maxErr.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── CLOSED-LOOP ADAPTIVE LEARNING SYSTEM (OIML D 10) ─── */}
      {learningAnalytics && (
        <div className="ref-card p-5 space-y-4 bg-gradient-to-br from-white to-[#F8FCFA] border-[#D1E6DF]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E4EFEA] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#357F6B] text-white flex items-center justify-center shadow-xs">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-[#192E27] uppercase tracking-tight flex items-center gap-2">
                  <span>Analisis Kestabilan & Jadwal Rekomendasi</span>
                  <span className="text-[10px] font-mono bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full border border-teal-300">
                    OIML D 10
                  </span>
                </h3>
                <p className="text-[11px] text-[#769188]">
                  Evaluasi interval kalibrasi adaptif berbasis laju pergeseran (drift) dan kepatuhan batas toleransi.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-medium">Indeks Stabilitas:</span>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-slate-200 shadow-2xs font-mono font-bold text-xs">
                <span className={
                  learningAnalytics.healthScore >= 80 ? 'text-emerald-600' :
                  learningAnalytics.healthScore >= 60 ? 'text-amber-600' : 'text-rose-600'
                }>
                  {learningAnalytics.healthScore}%
                </span>
                <span className="text-[10px] text-slate-500 font-sans font-normal">
                  ({learningAnalytics.healthScore >= 80 ? 'Stabil' : learningAnalytics.healthScore >= 60 ? 'Waspada' : 'Perlu Perhatian'})
                </span>
              </div>
            </div>
          </div>

          {/* 4 Analytics Indicator Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* 1. Laju Drift */}
            <div className="p-3.5 rounded-2xl bg-white border border-[#E4EFEA] shadow-soft space-y-1.5 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-[#769188] font-bold uppercase tracking-wider block">
                  Pergeseran Rata-Rata
                </span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm font-bold font-mono text-[#192E27]">
                    &plusmn;{learningAnalytics.driftVelocityPerMonth}% / Bulan
                  </span>
                  <Activity className="w-4 h-4 text-[#357F6B]" />
                </div>
              </div>
              <p className="text-[11px] text-[#769188] leading-snug">
                {learningAnalytics.driftVelocityPerMonth > 0.03
                  ? 'Pergeseran cukup cepat, perlu pengawasan lebih sering.'
                  : 'Pergeseran lambat dan berada dalam kondisi wajar.'}
              </p>
            </div>

            {/* 2. Diagnosis Pola Pergeseran */}
            <div className="p-3.5 rounded-2xl bg-white border border-[#E4EFEA] shadow-soft space-y-1.5 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-[#769188] font-bold uppercase tracking-wider block">
                  Karakter Pergeseran
                </span>
                <div className="text-xs font-bold text-[#192E27] flex items-center gap-1.5 mt-1">
                  <Sliders className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>
                    {learningAnalytics.shiftType === 'stable' ? 'Stabil Normal' :
                     learningAnalytics.shiftType === 'zero' ? 'Zero Shift (Titik Nol)' :
                     learningAnalytics.shiftType === 'span' ? 'Span Shift (Rentang Atas)' :
                     'Fluktuasi Titik Uji'}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-[#769188] leading-snug">
                {learningAnalytics.shiftDiagnosis}
              </p>
            </div>

            {/* 3. Error Terkini vs Toleransi */}
            <div className="p-3.5 rounded-2xl bg-white border border-[#E4EFEA] shadow-soft space-y-1.5 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-[#769188] font-bold uppercase tracking-wider block">
                  Tingkat Error vs Batas
                </span>
                <div className="flex items-center justify-between mt-1">
                  <span className={`text-sm font-bold font-mono ${
                    Number(learningAnalytics.latestRatioPct) > 80 ? 'text-rose-600' :
                    Number(learningAnalytics.latestRatioPct) > 60 ? 'text-amber-600' : 'text-[#357F6B]'
                  }`}>
                    {learningAnalytics.latestRatioPct}%
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    Batas: &plusmn;{vendorTol}%
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      Number(learningAnalytics.latestRatioPct) > 80 ? 'bg-rose-500' :
                      Number(learningAnalytics.latestRatioPct) > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, Number(learningAnalytics.latestRatioPct))}%` }}
                  />
                </div>
                <span className="text-[10px] text-[#769188] block">
                  {Number(learningAnalytics.latestRatioPct) > 80 ? 'Mendekati / melewati batas' : 'Masih dalam batas aman'}
                </span>
              </div>
            </div>

            {/* 4. Rekomendasi Interval Adaptif */}
            <div className={`p-3.5 rounded-2xl border shadow-soft space-y-1.5 flex flex-col justify-between ${
              learningAnalytics.adaptiveAction.startsWith('TIGHTEN')
                ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                : learningAnalytics.adaptiveAction === 'EXTEND_REWARD'
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                : 'bg-white border-[#E4EFEA] text-[#192E27]'
            }`}>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">
                  Rekomendasi Jadwal Baru
                </span>
                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center gap-1.5 font-mono text-sm font-extrabold">
                    <span>{learningAnalytics.currentInterval} Bln</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span className="underline decoration-2">
                      {learningAnalytics.adaptiveInterval} Bulan
                    </span>
                  </div>
                  {learningAnalytics.adaptiveAction.startsWith('TIGHTEN') ? (
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  )}
                </div>
              </div>
              <p className="text-[11px] leading-snug font-medium opacity-90">
                {learningAnalytics.adaptiveAction === 'TIGHTEN_URGENT' ? 'Jadwal dipercepat (Error Tinggi)' :
                 learningAnalytics.adaptiveAction === 'TIGHTEN_MODERATE' ? 'Jadwal dipercepat (Pencegahan)' :
                 learningAnalytics.adaptiveAction === 'EXTEND_REWARD' ? 'Jadwal diperpanjang (Sangat Stabil)' :
                 'Jadwal saat ini tetap dipertahankan'}
              </p>
            </div>
          </div>

          {/* Actionable Justification Banner */}
          <div className={`p-4 rounded-2xl border text-xs flex items-start gap-3 ${
            learningAnalytics.adaptiveAction.startsWith('TIGHTEN')
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : learningAnalytics.adaptiveAction === 'EXTEND_REWARD'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}>
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-current" />
            <div className="space-y-1">
              <div className="font-bold text-[11px] uppercase tracking-wide">
                Alasan Rekomendasi Jadwal:
              </div>
              <p className="text-xs leading-relaxed font-normal">
                {learningAnalytics.adaptiveReason}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── MULTI-SESSION OVERLAY LINE CHART ─── */}
      <div className="ref-card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E4EFEA] pb-3">
          <div>
            <h3 className="text-xs font-bold text-[#192E27] uppercase tracking-tight">
              Grafik Perbandingan Deviasi Titik Ukur
            </h3>
            <p className="text-[11px] text-[#769188]">
              Perbandingan kurva error (% Span) tiap sesi terhadap batas toleransi pabrikan (&plusmn;{vendorTol}%).
            </p>
          </div>

          {/* Legend indicator badges */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
            {activeSessions.map((session, idx) => {
              const pal = SESSION_PALETTE[idx % SESSION_PALETTE.length];
              return (
                <div key={session.calibration_id} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pal.stroke }} />
                  <span className="text-slate-800 font-semibold text-[11px]">
                    {session.calibration_date}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {activeSessions.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-[#769188] text-xs font-medium">
            Pilih minimal 1 sesi kalibrasi untuk menampilkan grafik komparasi.
          </div>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 20, right: 25, left: -15, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4EFEA" />
                <XAxis 
                  dataKey="spanLabel" 
                  stroke="#769188" 
                  fontSize={11} 
                  fontWeight={600}
                />
                <YAxis 
                  stroke="#769188" 
                  fontSize={10}
                  fontWeight={500}
                  domain={[-vendorTol * 1.5, vendorTol * 1.5]}
                  tickFormatter={(val) => `${val}%`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#192E27', 
                    borderColor: '#357F6B', 
                    borderRadius: '14px', 
                    fontSize: '11px', 
                    color: '#FFFFFF', 
                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)' 
                  }}
                  formatter={(val: any, name: any) => {
                    return [`${val}%`, name];
                  }}
                  labelFormatter={(lbl) => `Titik Span: ${lbl}`}
                />

                {/* Upper and Lower Vendor Tolerance Reference Lines */}
                <ReferenceLine 
                  y={vendorTol} 
                  label={{ value: `+${vendorTol}% Batas Vendor`, fill: '#E26D6D', fontSize: 10, position: 'top', fontWeight: 'bold' }} 
                  stroke="#E26D6D" 
                  strokeDasharray="4 4" 
                />
                <ReferenceLine 
                  y={-vendorTol} 
                  label={{ value: `-${vendorTol}% Batas Vendor`, fill: '#E26D6D', fontSize: 10, position: 'bottom', fontWeight: 'bold' }} 
                  stroke="#E26D6D" 
                  strokeDasharray="4 4" 
                />
                <ReferenceLine y={0} stroke="#CDE0D9" strokeWidth={1.5} />

                {/* Draw one Line for each active session */}
                {activeSessions.map((session, idx) => {
                  const pal = SESSION_PALETTE[idx % SESSION_PALETTE.length];
                  return (
                    <Line
                      key={session.calibration_id}
                      type="monotone"
                      dataKey={`error_${session.calibration_id}`}
                      name={`Sesi ${session.calibration_date}`}
                      stroke={pal.stroke}
                      strokeWidth={2.5}
                      dot={{ r: 4.5, fill: pal.stroke, strokeWidth: 2, stroke: '#FFFFFF' }}
                      activeDot={{ r: 6.5 }}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ─── SIDE-BY-SIDE DATA COMPARISON MATRIX TABLE ─── */}
      <div className="ref-card overflow-hidden">
        <div className="p-4 border-b border-[#E4EFEA] flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold text-[#192E27] uppercase tracking-tight">
              Matriks Data Komparasi Titik Span ({spanPoints.length} Titik Uji)
            </h3>
            <p className="text-[11px] text-[#769188]">
              Perbandingan berdampingan nilai pembacaan instrumen, error persentase, dan pergeseran kumulatif (&Delta; Drift).
            </p>
          </div>

          <span className="text-[10px] font-mono text-[#769188] bg-slate-100 px-2.5 py-1 rounded-lg">
            Rentang Span: {selectedInst.range_min} ~ {selectedInst.range_max} {selectedInst.engineering_unit}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#E8F4F0] text-[#192E27] uppercase font-bold text-[10px] border-b border-[#E4EFEA]">
              <tr>
                <th className="py-3 px-3.5 min-w-[90px]">% Span</th>
                <th className="py-3 px-3.5 min-w-[110px]">Nilai Standar</th>

                {/* One column pair per selected session */}
                {activeSessions.map((session, idx) => {
                  const pal = SESSION_PALETTE[idx % SESSION_PALETTE.length];
                  return (
                    <th key={session.calibration_id} className="py-3 px-3.5 border-l border-[#E4EFEA] min-w-[140px]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: pal.stroke }} />
                        <span className="font-bold">{session.calibration_date}</span>
                      </div>
                      <div className="text-[9px] text-[#769188] font-normal lowercase">
                        {session.technician_name}
                      </div>
                    </th>
                  );
                })}

                {/* Cumulative Drift column if 2+ sessions */}
                {activeSessions.length >= 2 && (
                  <th className="py-3 px-3.5 border-l border-[#E4EFEA] bg-[#DFEFE9] min-w-[120px] text-right font-extrabold text-[#192E27]">
                    &Delta; Drift Kumulatif
                  </th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E4EFEA] font-medium font-mono text-xs">
              {spanPoints.map((pct) => {
                const standardInput = selectedInst.range_min + (spanRange * (pct / 100));

                // Find errors for first and last session to compute delta
                const firstSession = activeSessions[0];
                const lastSession = activeSessions[activeSessions.length - 1];

                const firstPt = firstSession?.data_points.find(p => Math.abs(p.percent_span - pct) < 0.5);
                const lastPt = lastSession?.data_points.find(p => Math.abs(p.percent_span - pct) < 0.5);

                const cumDrift = (firstPt && lastPt)
                  ? Number((lastPt.as_found_error_percent - firstPt.as_found_error_percent).toFixed(3))
                  : null;

                return (
                  <tr key={pct} className="hover:bg-slate-50/80 transition">
                    {/* Span % */}
                    <td className="py-2.5 px-3.5 font-bold text-slate-900 bg-slate-50/50">
                      <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[11px]">
                        {pct}% Span
                      </span>
                    </td>

                    {/* Standard Input */}
                    <td className="py-2.5 px-3.5 text-slate-700">
                      {standardInput.toFixed(2)} {selectedInst.engineering_unit}
                    </td>

                    {/* Per-session readings & errors */}
                    {activeSessions.map((session) => {
                      const pt = session.data_points.find(p => Math.abs(p.percent_span - pct) < 0.5);
                      if (!pt) {
                        return (
                          <td key={session.calibration_id} className="py-2.5 px-3.5 border-l border-[#E4EFEA] text-slate-400">
                            -
                          </td>
                        );
                      }

                      const isOOT = Math.abs(pt.as_found_error_percent) > vendorTol;
                      const isHigh = Math.abs(pt.as_found_error_percent) > vendorTol * 0.7;

                      return (
                        <td key={session.calibration_id} className="py-2.5 px-3.5 border-l border-[#E4EFEA]">
                          <div className="text-slate-900 font-semibold">
                            {pt.as_found_reading.toFixed(2)} {selectedInst.engineering_unit}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                              isOOT ? 'bg-rose-100 text-rose-800' :
                              isHigh ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-700'
                            }`}>
                              {pt.as_found_error_percent >= 0 ? `+${pt.as_found_error_percent.toFixed(2)}%` : `${pt.as_found_error_percent.toFixed(2)}%`}
                            </span>
                            {isOOT && <span className="text-[9px] text-rose-600 font-bold">OOT</span>}
                          </div>
                        </td>
                      );
                    })}

                    {/* Cumulative Drift Column */}
                    {activeSessions.length >= 2 && (
                      <td className="py-2.5 px-3.5 border-l border-[#E4EFEA] bg-[#F7FBF9] text-right font-bold">
                        {cumDrift !== null ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] ${
                            Math.abs(cumDrift) > vendorTol * 0.8
                              ? 'bg-rose-100 text-rose-800'
                              : Math.abs(cumDrift) > vendorTol * 0.4
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {cumDrift > 0 ? (
                              <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                            ) : cumDrift < 0 ? (
                              <ArrowDownRight className="w-3.5 h-3.5 text-sky-600" />
                            ) : (
                              <Activity className="w-3 h-3 text-slate-400" />
                            )}
                            <span>{cumDrift > 0 ? `+${cumDrift.toFixed(3)}%` : `${cumDrift.toFixed(3)}%`}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});
