import React, { useState, useMemo, useCallback } from 'react';
import { 
  Instrument, 
  IntermediateCheck 
} from '../types/schema';
import { 
  Search, 
  Plus, 
  ChevronUp, 
  ChevronDown, 
  ArrowUpRight, 
  ShieldCheck, 
  Clock, 
  SlidersHorizontal, 
  Zap, 
  Gauge, 
  Scale, 
  Thermometer, 
  ArrowRight, 
  FileCheck2, 
  FileText, 
  Droplets, 
  FlaskConical, 
  Ruler, 
  Waves, 
  FileEdit 
} from 'lucide-react';
import { getPVMetadata } from '../utils/physicalQuantities';
import { CalibrationDatePicker } from './ui/CalibrationDatePicker';
import { CustomSelect } from './ui/CustomSelect';
import { useLanguage } from '../context/LanguageContext';

interface DashboardProps {
  instruments: Instrument[];
  intermediateChecks?: IntermediateCheck[];
  onNavigateToInstruments: () => void;
  onNavigateToNewCalibration: (instrumentId?: number) => void;
  onNavigateToAnalytics: (instrumentId?: number) => void;
  onNavigateToIntermediateChecks?: () => void;
  onNavigateToRcmSimulator?: () => void;
  onSelectInstrument: (inst: Instrument) => void;
}

export const Dashboard: React.FC<DashboardProps> = React.memo(({
  instruments,
  intermediateChecks: _intermediateChecks,
  onNavigateToInstruments,
  onNavigateToNewCalibration,
  onNavigateToAnalytics,
  onNavigateToIntermediateChecks: _onNavigateToIntermediateChecks,
  onNavigateToRcmSimulator,
  onSelectInstrument
}) => {
  const { language, t } = useLanguage();
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'Critical' | 'Non-Critical' | 'Run-To-Failure'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [profitTimeframe, setProfitTimeframe] = useState<'1B' | '6B' | '1T'>('6B');

  const totalInstruments = instruments.length;
  const criticalCount = instruments.filter(i => i.rcm_profile.final_classification === 'Critical').length;

  const today = useMemo(() => new Date(), []);
  const getDaysUntilDue = useCallback((dueDateStr: string) => {
    const due = new Date(dueDateStr);
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [today]);

  const processedInstruments = useMemo(() => instruments.map(inst => ({
    ...inst,
    daysLeft: getDaysUntilDue(inst.next_due_date)
  })).sort((a, b) => a.daysLeft - b.daysLeft), [instruments, getDaysUntilDue]);

  const filteredList = useMemo(() => processedInstruments.filter(inst => {
    const matchesFilter = activeFilter === 'ALL' || inst.rcm_profile.final_classification === activeFilter;
    const matchesSearch = inst.tag_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          inst.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          inst.process_variable.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  }), [processedInstruments, activeFilter, searchQuery]);

  // Max 15 instruments displayed in dashboard queue inventory
  const displayedList = useMemo(() => filteredList.slice(0, 15), [filteredList]);

  // State for Master Kalibrasi Category & Search Filter
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [cardSearchQuery, setCardSearchQuery] = useState<string>('');

  // Available unique categories derived from registered instruments
  const availableCategories = useMemo(() => {
    return Array.from(new Set(instruments.map(i => i.process_variable))).sort();
  }, [instruments]);

  const categoryOptions = useMemo(() => [
    { value: 'ALL', label: `${t.dashboard.allCategories} (${instruments.length})` },
    ...availableCategories.map(cat => {
      const count = instruments.filter(i => i.process_variable === cat).length;
      return {
        value: cat,
        label: `${cat} (${count})`
      };
    })
  ], [availableCategories, instruments, t.dashboard.allCategories]);

  // Filtered instruments for the Master Kalibrasi card
  const filteredCategoryInstruments = useMemo(() => {
    return instruments.filter(inst => {
      const matchesCat = selectedCategory === 'ALL' || inst.process_variable === selectedCategory;
      const matchesSearch = !cardSearchQuery.trim() ||
        inst.tag_number.toLowerCase().includes(cardSearchQuery.toLowerCase()) ||
        inst.description.toLowerCase().includes(cardSearchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [instruments, selectedCategory, cardSearchQuery]);

  const activeList = filteredCategoryInstruments;

  // Active card index for rotating through instruments
  const [activeCardIndex, setActiveCardIndex] = useState<number>(0);

  const safeCardIndex = activeList.length > 0 
    ? ((activeCardIndex % activeList.length) + activeList.length) % activeList.length 
    : 0;

  // Featured Instrument dynamically selected
  const featuredInst = activeList[safeCardIndex] || instruments[0] || {
    instrument_id: 1,
    tag_number: 'PT-303',
    description: 'Reactor Vessel Pressure Transmitter',
    range_min: 0,
    range_max: 50,
    engineering_unit: 'psig',
    vendor_tolerance_percent: 0.25,
    next_due_date: '2027-08-15',
    current_interval_months: 18,
    process_variable: 'Pressure',
    rcm_profile: {
      final_classification: 'Critical'
    },
    calibration_history: []
  };

  const nextInst = activeList.length > 1 ? activeList[(safeCardIndex + 1) % activeList.length] : null;

  // Instrument dropdown options based on current category
  const instrumentSelectOptions = useMemo(() => {
    return activeList.map(inst => ({
      value: inst.tag_number,
      label: `${inst.tag_number} - ${inst.description}`,
      sublabel: `${inst.process_variable} • ${inst.rcm_profile?.final_classification || 'ISO 17025'}`
    }));
  }, [activeList]);

  // Selected calibration session for the currently active instrument
  const [selectedSessionIndex, setSelectedSessionIndex] = useState<number | null>(null);

  const handlePrevCard = () => {
    if (activeList.length <= 1) return;
    setSelectedSessionIndex(null);
    setActiveCardIndex(prev => (prev - 1 + activeList.length) % activeList.length);
  };

  const handleNextCard = () => {
    if (activeList.length <= 1) return;
    setSelectedSessionIndex(null);
    setActiveCardIndex(prev => (prev + 1) % activeList.length);
  };


  const handleCategoryChange = (newCat: string) => {
    setSelectedCategory(newCat);
    setSelectedSessionIndex(null);
    setActiveCardIndex(0);
  };

  const handleSearchChange = (query: string) => {
    setCardSearchQuery(query);
    setSelectedSessionIndex(null);
    setActiveCardIndex(0);
  };

  const handleSelectInstrumentOption = (tag: string) => {
    const idx = activeList.findIndex(i => i.tag_number === tag);
    if (idx !== -1) {
      setSelectedSessionIndex(null);
      setActiveCardIndex(idx);
    }
  };

  // Smooth swipe/drag gesture handling for zero-flicker native feel
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragDeltaY, setDragDeltaY] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (activeList.length <= 1) return;
    setIsDragging(true);
    setDragStartY(e.touches[0].clientY);
    setDragDeltaY(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || activeList.length <= 1) return;
    const currentY = e.touches[0].clientY;
    const delta = currentY - dragStartY;
    if ((safeCardIndex === 0 && delta > 0) || (safeCardIndex === activeList.length - 1 && delta < 0)) {
      setDragDeltaY(delta * 0.25);
    } else {
      setDragDeltaY(delta);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging || activeList.length <= 1) return;
    setIsDragging(false);
    if (dragDeltaY < -35) {
      handleNextCard();
    } else if (dragDeltaY > 35) {
      handlePrevCard();
    }
    setDragDeltaY(0);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeList.length <= 1 || (e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
    setIsDragging(true);
    setDragStartY(e.clientY);
    setDragDeltaY(0);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || activeList.length <= 1) return;
    const delta = e.clientY - dragStartY;
    if ((safeCardIndex === 0 && delta > 0) || (safeCardIndex === activeList.length - 1 && delta < 0)) {
      setDragDeltaY(delta * 0.25);
    } else {
      setDragDeltaY(delta);
    }
  };

  const handleMouseUp = () => {
    if (!isDragging || activeList.length <= 1) return;
    setIsDragging(false);
    if (dragDeltaY < -35) {
      handleNextCard();
    } else if (dragDeltaY > 35) {
      handlePrevCard();
    }
    setDragDeltaY(0);
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      setDragDeltaY(0);
    }
  };

  const getInstrumentIcon = (pv: string, className = "w-3.5 h-3.5") => {
    const meta = getPVMetadata(pv);
    switch (meta.iconName) {
      case 'Gauge': return <Gauge className={className} />;
      case 'Thermometer': return <Thermometer className={className} />;
      case 'Scale': return <Scale className={className} />;
      case 'Droplets': return <Droplets className={className} />;
      case 'Waves': return <Waves className={className} />;
      case 'Zap': return <Zap className={className} />;
      case 'FlaskConical': return <FlaskConical className={className} />;
      case 'Ruler': return <Ruler className={className} />;
      case 'SlidersHorizontal': return <SlidersHorizontal className={className} />;
      default: return <SlidersHorizontal className={className} />;
    }
  };

  // Active instrument's calibration history and currently selected session
  const currentInstHistory = featuredInst.calibration_history || [];
  const activeSessionIdx = (selectedSessionIndex !== null && selectedSessionIndex < currentInstHistory.length)
    ? selectedSessionIndex
    : Math.max(0, currentInstHistory.length - 1);
  const activeSession = currentInstHistory[activeSessionIdx];

  const isSessionPass = activeSession ? activeSession.as_found_status === 'Pass' : true;
  const accuracyDisplay = isSessionPass ? '99.85%' : '94.20%';

  // Highest deviation error among points in the selected session
  const maxErrorPoint = activeSession?.data_points?.reduce((max, pt) => {
    return Math.abs(pt.as_found_error_percent) > Math.abs(max) ? pt.as_found_error_percent : max;
  }, 0) ?? 0;

  // Maximum calculated drift in the selected session
  const maxDriftPoint = activeSession?.data_points?.reduce((max, pt) => {
    if (pt.calculated_drift_percent === null || pt.calculated_drift_percent === undefined) return max;
    return Math.abs(pt.calculated_drift_percent) > Math.abs(max) ? pt.calculated_drift_percent : max;
  }, 0) ?? 0;

  // Dynamically map recent calibration sessions across all instruments
  const dynamicActivities = useMemo(() => instruments.flatMap(inst => {
    const meta = getPVMetadata(inst.process_variable);
    return (inst.calibration_history || []).map(sess => ({
      id: `${inst.tag_number}-${sess.calibration_id || sess.calibration_date}`,
      tag: inst.tag_number,
      desc: inst.description,
      type: inst.process_variable,
      date: sess.calibration_date,
      technician: sess.technician_name,
      drift: sess.data_points && sess.data_points.length > 0 
        ? `${sess.data_points[sess.data_points.length - 1].as_found_error_percent > 0 ? '+' : ''}${sess.data_points[sess.data_points.length - 1].as_found_error_percent}%`
        : '+0.00%',
      status: sess.as_found_status === 'Pass' ? 'In-Tolerance' : 'Out-Of-Tolerance',
      color: meta.color,
      bg: meta.bg,
      isFeatured: inst.tag_number === featuredInst.tag_number
    }));
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [instruments, featuredInst.tag_number]);

  return (
    <div className="space-y-6 animate-fade-in w-full pb-8">
      {/* ── TOP SECTION: MY CARDS (HERO) & QUICK ACTIONS & PROFIT CURVE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Hero: "My Cards" (8 cols) */}
        <div className="lg:col-span-8 ref-card p-6 bg-white">
          <div className="flex flex-col gap-3.5 mb-5">
            {/* Header Title & Stepper Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-[#192E27] tracking-tight">{t.dashboard.masterCalibration}</h2>
                <button 
                  onClick={onNavigateToInstruments}
                  className="text-xs font-bold text-[#357F6B] hover:text-[#276353] flex items-center gap-1 transition ml-1"
                >
                  <span>{t.dashboard.viewAll}</span>
                  <span className="w-4 h-4 rounded-full bg-[#E8F4F0] flex items-center justify-center text-[11px] font-bold">+</span>
                </button>
              </div>
              
              {/* Header Up & Down Stepper Controls */}
              <div className="flex items-center gap-1 bg-[#F4F7F6] border border-[#E4EFEA] p-1 rounded-2xl">
                <button
                  type="button"
                  onClick={handlePrevCard}
                  disabled={activeList.length <= 1}
                  title={`${t.dashboard.prevTool} (Up)`}
                  aria-label={t.dashboard.prevTool}
                  className="w-7 h-7 rounded-xl bg-white hover:bg-[#357F6B] text-[#192E27] hover:text-white flex items-center justify-center shadow-xs transition active:scale-90 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-[#192E27]"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextCard}
                  disabled={activeList.length <= 1}
                  title={`${t.dashboard.nextTool} (Down)`}
                  aria-label={t.dashboard.nextTool}
                  className="w-7 h-7 rounded-xl bg-white hover:bg-[#357F6B] text-[#192E27] hover:text-white flex items-center justify-center shadow-xs transition active:scale-90 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-[#192E27]"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Filter & Selector Toolbar: Category Dropdown + Instrument Dropdown + Search Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1 border-t border-[#F0F5F2]">
              {/* Dropdown 1: Kategori (Sm: 4 cols) */}
              <div className="sm:col-span-4">
                <CustomSelect
                  value={selectedCategory}
                  onChange={handleCategoryChange}
                  options={categoryOptions}
                  placeholder={t.dashboard.allCategories}
                />
              </div>

              {/* Dropdown 2: Pilih Alat sesuai Kategori (Sm: 5 cols) */}
              <div className="sm:col-span-5">
                <CustomSelect
                  value={featuredInst?.tag_number || ''}
                  onChange={handleSelectInstrumentOption}
                  options={instrumentSelectOptions}
                  placeholder={t.dashboard.selectTool}
                  disabled={instrumentSelectOptions.length === 0}
                />
              </div>

              {/* Search Bar: Input pencarian langsung (Sm: 3 cols) */}
              <div className="sm:col-span-3 relative flex items-center">
                <Search className="w-3.5 h-3.5 text-[#769188] absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  value={cardSearchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder={t.dashboard.searchTag}
                  className="input-pill input-pill-search !pr-7 !py-2 text-xs w-full bg-[#F4F7F6] border-[#E4EFEA] focus:border-[#357F6B] focus:bg-white transition-colors"
                />
                {cardSearchQuery && (
                  <button
                    type="button"
                    onClick={() => handleSearchChange('')}
                    className="absolute right-2 text-[#769188] hover:text-[#192E27] text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center hover:bg-slate-200 cursor-pointer"
                    title="Hapus pencarian"
                  >
                    &times;
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
            {/* Digital Instrument Card Stack */}
            <div className="sm:col-span-6 relative flex flex-col justify-center">
              {activeList.length === 0 ? (
                <div className="h-[188px] rounded-3xl border border-dashed border-[#D1E6DF] bg-[#F4F7F6] flex flex-col items-center justify-center p-6 text-center">
                  <span className="text-sm font-bold text-[#192E27]">{t.dashboard.noMatchingTool}</span>
                  <p className="text-xs text-[#769188] mt-1 max-w-[220px]">
                    {t.dashboard.noMatchingToolDesc}
                  </p>
                  <button
                    type="button"
                    onClick={() => { setSelectedCategory('ALL'); setCardSearchQuery(''); }}
                    className="mt-3 text-xs font-bold text-[#357F6B] hover:underline cursor-pointer"
                  >
                    {t.dashboard.resetFilter}
                  </button>
                </div>
              ) : (
                <div className="relative w-full">
                  {/* The Card Stack Container */}
                  <div className="relative">
                    {/* Layer 3: Deepest card peek */}
                    {activeList.length > 2 && (
                      <div 
                        className="absolute inset-x-7 top-4 -bottom-5 rounded-3xl z-0 bg-[#E89595]/85 border border-white/30 shadow-xs transition-all duration-300 ease-out"
                      />
                    )}

                    {/* Layer 2: Middle card peek */}
                    {activeList.length > 1 && (
                      <div 
                        className="absolute inset-x-3.5 top-2 -bottom-2.5 rounded-3xl z-10 bg-gradient-to-r from-[#F6B738] to-[#EAA62A] border border-white/40 shadow-xs transition-all duration-300 ease-out cursor-pointer hover:brightness-105 active:scale-[0.99]"
                        onClick={handleNextCard}
                        title={`Klik untuk beralih ke alat berikutnya (${nextInst?.tag_number})`}
                      />
                    )}

                    {/* Main Front Instrument Card Viewport */}
                    <div 
                      className="relative z-20 rounded-3xl bg-gradient-to-br from-[#357F6B] via-[#2F7360] to-[#205345] text-white shadow-[0_12px_28px_-6px_rgba(25,46,39,0.32)] border border-white/25 overflow-hidden h-[188px] select-none cursor-grab active:cursor-grabbing"
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseLeave}
                    >
                      {/* Continuous Vertical Sliding Track */}
                      <div 
                        className="w-full h-full flex flex-col will-change-transform"
                        style={{
                          transform: `translateY(calc(-${safeCardIndex * 188}px + ${dragDeltaY}px))`,
                          transition: isDragging ? 'none' : 'transform 0.42s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                      >
                        {activeList.map((inst, idx) => (
                          <div 
                            key={inst.instrument_id || inst.tag_number || idx}
                            className="w-full h-[188px] p-5 shrink-0 flex flex-col justify-between relative overflow-hidden"
                          >
                            {/* Subtle Wavy Texture Overlay */}
                            <div className="absolute inset-0 opacity-15 pointer-events-none">
                              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                <path d="M0,30 Q25,5 50,30 T100,30 L100,100 L0,100 Z" fill="currentColor" />
                                <path d="M0,60 Q25,35 50,60 T100,60 L100,100 L0,100 Z" fill="currentColor" />
                              </svg>
                            </div>

                            {/* Card Top Row */}
                            <div className="relative z-10 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5 text-teal-100/90 font-medium">
                                {getInstrumentIcon(inst.process_variable)}
                                <span className="whitespace-nowrap">{inst.process_variable}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold tracking-wider font-mono text-white text-[10px] bg-white/20 px-2.5 py-0.5 rounded-full backdrop-blur-xs whitespace-nowrap shrink-0">
                                  {inst.rcm_profile?.final_classification || 'ISO 17025'}
                                </span>
                                {/* Compact Up & Down Stepper directly on Card */}
                                <div className="flex items-center bg-black/25 backdrop-blur-xs rounded-full p-0.5 border border-white/20 shadow-xs shrink-0">
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handlePrevCard(); }}
                                    title={`${t.dashboard.prevTool} (Up)`}
                                    aria-label={t.dashboard.prevTool}
                                    className="w-5 h-5 rounded-full flex items-center justify-center text-white hover:bg-white hover:text-[#357F6B] transition active:scale-90"
                                  >
                                    <ChevronUp className="w-3 h-3" />
                                  </button>
                                  <span className="text-[10px] font-mono font-bold px-1.5 text-white/90 whitespace-nowrap">
                                    {idx + 1}/{activeList.length}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleNextCard(); }}
                                    title={`${t.dashboard.nextTool} (Down)`}
                                    aria-label={t.dashboard.nextTool}
                                    className="w-5 h-5 rounded-full flex items-center justify-center text-white hover:bg-white hover:text-[#357F6B] transition active:scale-90"
                                  >
                                    <ChevronDown className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Big Tag Number & Description */}
                            <div className="relative z-10 my-auto py-1">
                              <span className="block font-mono text-2xl font-black tracking-wider text-white leading-tight">
                                {inst.tag_number}
                              </span>
                              <span className="block text-[11px] text-teal-100/80 truncate font-medium mt-0.5">
                                {inst.description}
                              </span>
                            </div>

                            {/* Card Specs Footer */}
                            <div className="relative z-10 flex items-center justify-between text-[11px] font-mono pt-2.5 border-t border-white/15 text-teal-100/90">
                              <div>
                                <span className="text-[9px] text-teal-200/70 block uppercase font-bold">{t.dashboard.spanRange}</span>
                                <span className="font-bold text-white whitespace-nowrap">{inst.range_min}~{inst.range_max} {inst.engineering_unit}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-[9px] text-teal-200/70 block uppercase font-bold">{t.dashboard.dueDate}</span>
                                <span className="font-bold text-white whitespace-nowrap">{inst.next_due_date}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}


            </div>

            {/* Right Side: Clean Focused Actions & Metrology Overview (Verifikasi Antara & Simulasi RCM removed) */}
            <div className="sm:col-span-6 flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-end pb-1 border-b border-[#F0F5F2]">
                <button 
                  onClick={() => onSelectInstrument(featuredInst as Instrument)}
                  className="text-xs font-bold text-[#357F6B] hover:text-[#205345] hover:underline flex items-center gap-1 cursor-pointer transition"
                >
                  <span>{t.dashboard.fullDetails}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Primary Action Button: Sesi Kalibrasi Baru */}
              <button
                onClick={() => onNavigateToNewCalibration(featuredInst.instrument_id)}
                className="w-full p-4 rounded-2xl bg-gradient-to-br from-[#E8F4F0] to-[#DDF0E9] hover:from-[#DDF0E9] hover:to-[#CFE7DF] border border-[#C6E2D8] flex items-center gap-3.5 transition-all group cursor-pointer shadow-xs text-left"
                title={`${t.dashboard.logNewCalibration} (${featuredInst.tag_number})`}
              >
                <div className="w-11 h-11 rounded-2xl bg-white text-[#357F6B] flex items-center justify-center shadow-xs group-hover:scale-105 group-hover:bg-[#357F6B] group-hover:text-white transition-all shrink-0">
                  <FileEdit className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-extrabold text-[#192E27] block group-hover:text-[#357F6B] transition-colors">
                    {t.dashboard.logNewCalibration}
                  </span>
                  <span className="text-[11px] text-[#769188] block truncate mt-0.5 font-medium">
                    {t.dashboard.logNewCalibrationDesc} {featuredInst.tag_number}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-[#357F6B] shrink-0 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Quick Metrology Specs (2 compact informative cards) */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-[#F4F7F6] border border-[#E4EFEA]">
                  <span className="text-[10px] text-[#769188] uppercase font-bold tracking-wider block">{t.dashboard.calInterval}</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="font-mono text-sm font-extrabold text-[#192E27]">
                      {featuredInst.current_interval_months || 12}
                    </span>
                    <span className="text-[11px] text-[#769188] font-medium">{t.dashboard.monthUnit}</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#357F6B] font-bold block truncate mt-0.5">
                    {t.dashboard.statusLabel}: {featuredInst.rcm_profile?.final_classification || 'Normal'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#F4F7F6] border border-[#E4EFEA]">
                  <span className="text-[10px] text-[#769188] uppercase font-bold tracking-wider block">{t.dashboard.processTolerance}</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="font-mono text-sm font-extrabold text-[#192E27]">
                      &plusmn;{featuredInst.vendor_tolerance_percent}%
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#769188] block truncate mt-0.5">
                    {t.dashboard.spanLabel}: {featuredInst.range_min}~{featuredInst.range_max} {featuredInst.engineering_unit}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Card: "Stabilitas Drift" (Reference: "Profit") (4 cols) */}
        <div className="lg:col-span-4 ref-card p-6 bg-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-extrabold text-[#192E27] tracking-tight">{t.dashboard.driftStability}</h2>
                <span className="text-[11px] font-mono font-bold text-[#357F6B] bg-[#E8F4F0] px-2 py-0.5 rounded-full">
                  {featuredInst.tag_number} ({featuredInst.process_variable})
                </span>
              </div>
              <button 
                onClick={() => onNavigateToAnalytics(featuredInst.instrument_id)}
                className="text-xs font-bold text-[#357F6B] hover:underline flex items-center gap-1 cursor-pointer"
                title={`Buka analisis tren drift untuk ${featuredInst.tag_number}`}
              >
                <span>{t.dashboard.viewTrend}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Segmented Pills (Week / Month / Year) */}
            <div className="inline-flex p-1 rounded-full bg-[#F4F7F6] border border-[#E4EFEA] text-xs font-semibold">
              <button 
                onClick={() => setProfitTimeframe('1B')}
                className={`px-3 py-1 rounded-full transition ${profitTimeframe === '1B' ? 'bg-[#357F6B] text-white shadow-xs' : 'text-[#769188] hover:text-[#192E27]'}`}
              >
                {t.dashboard.timeframe1M}
              </button>
              <button 
                onClick={() => setProfitTimeframe('6B')}
                className={`px-3 py-1 rounded-full transition ${profitTimeframe === '6B' ? 'bg-[#357F6B] text-white shadow-xs' : 'text-[#769188] hover:text-[#192E27]'}`}
              >
                {t.dashboard.timeframe6M}
              </button>
              <button 
                onClick={() => setProfitTimeframe('1T')}
                className={`px-3 py-1 rounded-full transition ${profitTimeframe === '1T' ? 'bg-[#357F6B] text-white shadow-xs' : 'text-[#769188] hover:text-[#192E27]'}`}
              >
                {t.dashboard.timeframe1Y}
              </button>
            </div>
          </div>

          {/* Smooth Wavy Sparkline */}
          <div className="py-4">
            <svg className="w-full h-24 overflow-visible" viewBox="0 0 300 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="profitGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#357F6B" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#357F6B" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d="M 0,65 Q 40,85 80,50 T 160,55 T 240,30 T 300,15 L 300,100 L 0,100 Z"
                fill="url(#profitGrad)"
              />
              <path
                d="M 0,65 Q 40,85 80,50 T 160,55 T 240,30 T 300,15"
                fill="none"
                stroke="#357F6B"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
            <div className="flex justify-between text-[10px] font-mono text-[#769188] pt-2">
              <span>{t.dashboard.monthPrefix} 1</span>
              <span>{t.dashboard.monthPrefix} 2</span>
              <span>{t.dashboard.monthPrefix} 3</span>
              <span>{t.dashboard.monthPrefix} 4</span>
              <span>{t.dashboard.monthPrefix} 5</span>
              <span>{t.dashboard.monthPrefix} 6</span>
            </div>
          </div>

          <div 
            onClick={() => onNavigateToAnalytics(featuredInst.instrument_id)}
            className="text-[11px] text-[#769188] pt-2 border-t border-[#E4EFEA] flex items-center justify-between cursor-pointer hover:bg-[#F4F7F6] -mx-2 px-2 py-1 rounded-lg transition"
            title={`Buka analisis tren drift untuk ${featuredInst.tag_number}`}
          >
            <span>{t.dashboard.cumulativeDev} ({activeSession?.calibration_date || (language === 'id' ? 'Terkini' : 'Latest')}):</span>
            <span className="font-bold text-[#357F6B] flex items-center gap-1">
              {maxDriftPoint !== 0 ? `${maxDriftPoint > 0 ? '+' : ''}${maxDriftPoint}% Span` : `< 0.1% Span (${t.dashboard.stable})`}
              <ArrowUpRight className="w-3 h-3 text-[#357F6B]" />
            </span>
          </div>
        </div>
      </div>

      {/* ── DETAIL PROSES & HASIL KALIBRASI INSTRUMEN AKTIF ({featuredInst.tag_number}) ── */}
      <div className="ref-card p-6 bg-white space-y-5 animate-fade-in shadow-sm">
        {/* Section Header with Dynamic Date / Session Picker */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E4EFEA]">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#E8F4F0] text-[#357F6B] flex items-center justify-center font-bold shadow-2xs">
              {getInstrumentIcon(featuredInst.process_variable)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-extrabold text-[#192E27] tracking-tight">
                  {t.dashboard.calData}: {featuredInst.tag_number}
                </h3>
                <span className="text-[11px] font-mono font-bold bg-[#E8F4F0] text-[#357F6B] px-2.5 py-0.5 rounded-full">
                  {currentInstHistory.length} {t.dashboard.recordedSessions}
                </span>
                <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full ${
                  featuredInst.rcm_profile.final_classification === 'Critical'
                    ? 'bg-[#FEF1F1] text-[#E26D6D] border border-[#FCD7D7]'
                    : 'bg-[#F4F7F6] text-[#769188] border border-[#E4EFEA]'
                }`}>
                  {featuredInst.rcm_profile.final_classification}
                </span>
              </div>
              <p className="text-xs text-[#769188] mt-0.5 font-medium">
                {featuredInst.description} &bull; {t.dashboard.spanRange}: {featuredInst.range_min}~{featuredInst.range_max} {featuredInst.engineering_unit} &bull; {t.dashboard.vendorTolerance}: &plusmn;{featuredInst.vendor_tolerance_percent}%
              </p>
            </div>
          </div>

          {/* Date / Session Picker for Multi-Session Calibration (Date button with marked calendar) */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {currentInstHistory.length > 0 && (
              <CalibrationDatePicker
                sessions={currentInstHistory}
                selectedSessionIndex={activeSessionIdx}
                onSelectSession={(idx) => setSelectedSessionIndex(idx)}
              />
            )}

            <button
              onClick={() => onSelectInstrument(featuredInst as Instrument)}
              className="btn-amber text-xs py-2 px-4 shadow-xs"
              title="Buka sertifikat resmi untuk dicetak"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{t.dashboard.officialCert}</span>
            </button>
          </div>
        </div>

        {/* Calibration Content Body */}
        {activeSession ? (
          <div className="space-y-4">
            {/* 5 Key Metrology Insight Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
              {/* Metric 1: Indeks Akurasi */}
              <div className="p-3.5 rounded-2xl bg-[#E8F4F0] border border-[#D1E6DF] space-y-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#357F6B] uppercase font-bold tracking-wider">{t.dashboard.accuracyLevel}</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#357F6B]" />
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-xl font-black font-mono text-[#192E27]">
                      {accuracyDisplay}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] text-[#769188] font-mono block">
                  {t.dashboard.processTolerance}: &plusmn;{featuredInst.vendor_tolerance_percent}%
                </span>
              </div>

              {/* Metric 2: Status As-Found */}
              <div className="p-3.5 rounded-2xl bg-[#F4F7F6] border border-[#E4EFEA] space-y-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#769188] uppercase font-bold tracking-wider">{t.dashboard.calVerdict}</span>
                    <span className={`w-2.5 h-2.5 rounded-full ${activeSession.as_found_status === 'Pass' ? 'bg-[#357F6B]' : 'bg-rose-500'}`} />
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className={`text-xl font-black font-mono ${activeSession.as_found_status === 'Pass' ? 'text-[#357F6B]' : 'text-rose-600'}`}>
                      {activeSession.as_found_status === 'Pass' ? t.dashboard.passed : t.dashboard.failed}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] text-[#769188] block">
                  {t.dashboard.maxError}: <strong className="font-mono text-[#192E27]">{maxErrorPoint > 0 ? `+${maxErrorPoint}` : maxErrorPoint}%</strong>
                </span>
              </div>

              {/* Metric 3: Rekomendasi Jadwal RCM */}
              <div className="p-3.5 rounded-2xl bg-[#F4F7F6] border border-[#E4EFEA] space-y-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#769188] uppercase font-bold tracking-wider">{t.dashboard.recommendedSchedule}</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-[#F6B738]" />
                  </div>
                  <div className="text-xl font-black font-mono text-[#192E27] mt-1">
                    {activeSession.recommended_interval_months} {t.dashboard.monthUnit}
                  </div>
                </div>
                <span className="text-[11px] text-[#769188] block">
                  {t.dashboard.prevInterval}: <strong className="font-mono text-[#357F6B]">{activeSession.previous_interval_months} {t.dashboard.monthShort}</strong> ({activeSession.decision_action === 'EXTEND' ? t.dashboard.extended : activeSession.decision_action === 'SHORTEN' ? t.dashboard.shortened : activeSession.decision_action === 'RUN-TO-FAILURE' ? t.dashboard.conditional : t.dashboard.maintained})
                </span>
              </div>

              {/* Metric 4: Teknisi & Standar */}
              <div className="p-3.5 rounded-2xl bg-[#F4F7F6] border border-[#E4EFEA] space-y-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#769188] uppercase font-bold tracking-wider">{t.dashboard.technician}</span>
                    <FileCheck2 className="w-3.5 h-3.5 text-[#357F6B]" />
                  </div>
                  <div className="text-sm font-extrabold text-[#192E27] mt-1 break-words">
                    {activeSession.technician_name}
                  </div>
                </div>
                <span className="text-[11px] text-[#769188] font-mono block break-words" title={activeSession.calibrator_standard_id}>
                  {t.dashboard.standardTool}: {activeSession.calibrator_standard_id}
                </span>
              </div>

              {/* Metric 5: Kondisi Lingkungan */}
              <div className="p-3.5 rounded-2xl bg-[#F4F7F6] border border-[#E4EFEA] space-y-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#769188] uppercase font-bold tracking-wider">{t.dashboard.timeAndAmbient}</span>
                    <Clock className="w-3.5 h-3.5 text-[#769188]" />
                  </div>
                  <div className="text-sm font-mono font-bold text-[#192E27] mt-1">
                    {activeSession.calibration_date}
                  </div>
                </div>
                <span className="text-[11px] text-[#769188] block">
                  {activeSession.environment_temperature}°C &bull; {activeSession.environment_humidity}% RH
                </span>
              </div>
            </div>

            {/* Test Points Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#192E27] uppercase tracking-tight">
                  {t.dashboard.testPointsTableTitle} &bull; {language === 'id' ? 'Sesi' : 'Session'} {activeSession.calibration_date}
                </span>
                <span className="text-[11px] text-[#769188] font-mono">
                  {t.dashboard.toleranceLimit}: &plusmn;{featuredInst.vendor_tolerance_percent}%
                </span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-[#E4EFEA]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#E8F4F0] text-[#192E27] uppercase font-bold text-[10px] border-b border-[#E4EFEA]">
                    <tr>
                      <th className="py-2.5 px-3.5">% Span</th>
                      <th className="py-2.5 px-3.5">{t.dashboard.inputStandard}</th>
                      <th className="py-2.5 px-3.5">{t.dashboard.asFoundReading}</th>
                      <th className="py-2.5 px-3.5">{t.dashboard.deviationError}</th>
                      <th className="py-2.5 px-3.5">Error (% Span)</th>
                      <th className="py-2.5 px-3.5">Drift (% Span)</th>
                      <th className="py-2.5 px-3.5 text-center">{t.dashboard.pointStatus}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4EFEA] font-mono text-[11px]">
                    {activeSession.data_points.map((pt, ptIdx) => {
                      const isPtPass = Math.abs(pt.as_found_error_percent) <= featuredInst.vendor_tolerance_percent;
                      return (
                        <tr key={ptIdx} className="hover:bg-[#F4F7F6] transition">
                          <td className="py-2 px-3.5 font-bold">{pt.percent_span}%</td>
                          <td className="py-2 px-3.5">{pt.standard_input} {featuredInst.engineering_unit}</td>
                          <td className="py-2 px-3.5 font-bold text-[#192E27]">{pt.as_found_reading} {featuredInst.engineering_unit}</td>
                          <td className="py-2 px-3.5">{pt.as_found_error > 0 ? `+${pt.as_found_error}` : pt.as_found_error}</td>
                          <td className="py-2 px-3.5 font-bold text-[#357F6B]">{pt.as_found_error_percent}%</td>
                          <td className="py-2 px-3.5">{pt.calculated_drift_percent !== null ? `${pt.calculated_drift_percent}%` : '-'}</td>
                          <td className="py-2 px-3.5 text-center font-sans">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isPtPass ? 'bg-[#E8F4F0] text-[#357F6B] border border-[#357F6B]/30' : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {isPtPass ? 'PASS' : 'FAIL'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes / RCM Justification Banner */}
            {activeSession.notes && (
              <div className="p-3.5 rounded-2xl bg-[#F4F7F6] border border-[#E4EFEA] text-xs text-[#192E27] flex items-start gap-2.5">
                <span className="text-[#F6B738] text-base leading-none mt-0.5 font-serif font-black">&ldquo;</span>
                <p className="italic text-[#192E27]/90 leading-relaxed">
                  {activeSession.notes}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-[#F4F7F6] text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-white text-[#769188] flex items-center justify-center mx-auto shadow-xs">
              <Gauge className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#192E27]">{t.dashboard.noCalRecords}</h4>
              <p className="text-xs text-[#769188] max-w-md mx-auto mt-1">
                {language === 'id' 
                  ? `Instrumen ${featuredInst.tag_number} ${t.dashboard.noCalRecordsDesc}`
                  : `Instrument ${featuredInst.tag_number} ${t.dashboard.noCalRecordsDesc}`}
              </p>
            </div>
            <button
              onClick={() => onNavigateToNewCalibration(featuredInst.instrument_id)}
              className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.dashboard.startCalNow}</span>
            </button>
          </div>
        )}
      </div>

      {/* ── BOTTOM SECTION: PLANNING PROGRESS & LATEST SESSIONS & RCM GUIDE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Card 1: "Target Siklus Kalibrasi" (Reference: "Planning") (4 cols) */}
        <div className="lg:col-span-4 ref-card p-5 bg-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-extrabold text-[#192E27] tracking-tight">{t.dashboard.scheduleTargetRcm}</h3>
              <button 
                onClick={onNavigateToInstruments}
                className="text-xs font-bold text-[#357F6B] hover:underline flex items-center gap-1"
              >
                <span>{t.dashboard.manage}</span>
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3.5">
              {/* Progress Item 1 */}
              <div className="p-3.5 rounded-2xl bg-[#F4F7F6] border border-[#E4EFEA] space-y-2">
                <div className="flex justify-between text-xs font-bold text-[#192E27]">
                  <span>PT-303 (Pressure)</span>
                  <span className="font-mono text-[#357F6B]">10 / 18 {t.dashboard.monthUnit}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#E8F4F0] overflow-hidden">
                  <div className="h-full rounded-full bg-[#F6B738]" style={{ width: '55%' }} />
                </div>
              </div>

              {/* Progress Item 2 */}
              <div className="p-3.5 rounded-2xl bg-[#F4F7F6] border border-[#E4EFEA] space-y-2">
                <div className="flex justify-between text-xs font-bold text-[#192E27]">
                  <span>WT-102 (Weight)</span>
                  <span className="font-mono text-[#F6B738]">5 / 6 {t.dashboard.monthUnit}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#E8F4F0] overflow-hidden">
                  <div className="h-full rounded-full bg-[#F6B738]" style={{ width: '83%' }} />
                </div>
              </div>

              {/* Progress Item 3 */}
              <div className="p-3.5 rounded-2xl bg-[#F4F7F6] border border-[#E4EFEA] space-y-2">
                <div className="flex justify-between text-xs font-bold text-[#192E27]">
                  <span>TT-205 (Temp)</span>
                  <span className="font-mono text-[#357F6B]">24 / 36 {t.dashboard.monthUnit}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#E8F4F0] overflow-hidden">
                  <div className="h-full rounded-full bg-[#357F6B]" style={{ width: '66%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-[#769188] pt-3 border-t border-[#E4EFEA] flex justify-between items-center">
            <span>{t.dashboard.avgEfficiency}:</span>
            <span className="font-bold text-[#357F6B]">+6 {t.dashboard.monthUnit} {t.dashboard.perInstrument}</span>
          </div>
        </div>

        {/* Card 2: "Log Kalibrasi Terbaru" (Reference: "Latest transactions") (5 cols) */}
        <div className="lg:col-span-5 ref-card p-5 bg-white flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-[#192E27] tracking-tight">{t.dashboard.recentCalHistory}</h3>
              <span className="text-[10px] font-mono font-bold bg-[#E8F4F0] text-[#357F6B] px-2 py-0.5 rounded-full border border-[#357F6B]/20">
                {dynamicActivities.length} {language === 'id' ? 'Sesi' : 'Sessions'}
              </span>
            </div>
            <span className="text-xs text-[#769188] font-semibold">{t.dashboard.confirmed}</span>
          </div>

          <div className="max-h-[340px] overflow-y-auto pr-1.5 space-y-2.5">
            {dynamicActivities.length === 0 ? (
              <div className="py-10 text-center text-xs text-[#769188]">
                {t.dashboard.noConfirmedCal}
              </div>
            ) : (
              dynamicActivities.map((act) => (
                <div 
                  key={act.id} 
                  className={`p-3 rounded-2xl border transition flex items-center justify-between gap-3 ${
                    act.isFeatured 
                      ? 'bg-[#E8F4F0]/70 border-[#357F6B]/35 shadow-2xs ring-1 ring-[#357F6B]/20' 
                      : 'bg-[#F4F7F6] border-[#E4EFEA] hover:bg-white hover:border-[#D1E6DF]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div 
                      className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs transition"
                      style={{ backgroundColor: act.bg, color: act.color }}
                      title={`Parameter: ${act.type}`}
                    >
                      {getInstrumentIcon(act.type, "w-4 h-4")}
                    </div>
                    <div className="truncate">
                      <span className="block text-xs font-bold text-[#192E27] truncate">
                        {act.tag} - {act.desc}
                      </span>
                      <span className="block text-[10px] text-[#769188]">{act.date} &bull; {act.technician}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="block text-xs font-mono font-bold text-[#357F6B]">{act.drift}</span>
                    <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      act.status === 'In-Tolerance'
                        ? 'bg-[#E8F4F0] text-[#357F6B] border border-[#357F6B]/20'
                        : 'bg-[#FEF1F1] text-[#E26D6D] border border-[#FCD7D7]'
                    }`}>
                      {act.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Card 3: "Simulasi Metode RCM" */}
        <div className="lg:col-span-3 ref-card p-5 bg-gradient-to-br from-[#E8F4F0] to-[#DDF0E9] border border-[#D1E6DF] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#357F6B]">{t.dashboard.rcmMethod}</span>
              <div className="w-7 h-7 rounded-full bg-[#357F6B] text-white flex items-center justify-center">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
            </div>

            <h3 className="text-base font-extrabold text-[#192E27] tracking-tight mb-1">
              {t.dashboard.rcmSimulation}
            </h3>
            <p className="text-xs text-[#769188] leading-relaxed">
              {t.dashboard.rcmMethodDesc}
            </p>
          </div>

          <div className="pt-4">
            <button
              onClick={() => onNavigateToRcmSimulator?.()}
              className="w-full btn-teal py-2.5 text-xs shadow-dock cursor-pointer"
            >
              <span>{t.dashboard.openRcmSim}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── WORKLIST & SEARCH INVENTORY TABLE ── */}
      <div className="ref-card p-6 bg-white space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-extrabold text-[#192E27] tracking-tight uppercase">
              {t.dashboard.queueInventory}
            </h3>
            <p className="text-xs text-[#769188]">
              {totalInstruments} {t.dashboard.registeredTools} &bull; {criticalCount} {t.dashboard.criticalProtectionLoops}
            </p>
          </div>

          {/* Search Pill Input & Filter Pills */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-[#769188] absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                placeholder={t.dashboard.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-pill !pl-10 text-xs w-56 sm:w-64"
              />
            </div>

            {/* Filter Pills */}
            <div className="inline-flex p-1 rounded-full bg-[#F4F7F6] border border-[#E4EFEA] text-xs font-semibold">
              <button
                onClick={() => setActiveFilter('ALL')}
                className={`px-3 py-1 rounded-full transition ${activeFilter === 'ALL' ? 'bg-[#357F6B] text-white shadow-xs' : 'text-[#769188] hover:text-[#192E27]'}`}
              >
                {t.dashboard.filterAll}
              </button>
              <button
                onClick={() => setActiveFilter('Critical')}
                className={`px-3 py-1 rounded-full transition ${activeFilter === 'Critical' ? 'bg-[#357F6B] text-white shadow-xs' : 'text-[#769188] hover:text-[#192E27]'}`}
              >
                {t.dashboard.filterCritical}
              </button>
              <button
                onClick={() => setActiveFilter('Non-Critical')}
                className={`px-3 py-1 rounded-full transition ${activeFilter === 'Non-Critical' ? 'bg-[#357F6B] text-white shadow-xs' : 'text-[#769188] hover:text-[#192E27]'}`}
              >
                {t.dashboard.filterNonCritical}
              </button>
              <button
                onClick={() => setActiveFilter('Run-To-Failure')}
                className={`px-3 py-1 rounded-full transition ${activeFilter === 'Run-To-Failure' ? 'bg-[#357F6B] text-white shadow-xs' : 'text-[#769188] hover:text-[#192E27]'}`}
              >
                {t.dashboard.filterRTF}
              </button>
            </div>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto rounded-2xl border border-[#E4EFEA]">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#F4F7F6] text-[#769188] uppercase tracking-wider font-bold text-[10px] border-b border-[#E4EFEA]">
              <tr>
                <th className="py-3 px-4">{t.dashboard.tagAndDesc}</th>
                <th className="py-3 px-4">{t.dashboard.paramAndLoc}</th>
                <th className="py-3 px-4">{t.instrumentList.span}</th>
                <th className="py-3 px-4">{t.instrumentList.rcmClassification}</th>
                <th className="py-3 px-4">{t.instrumentList.dueDate}</th>
                <th className="py-3 px-4 text-center">{t.instrumentList.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4EFEA] font-medium text-xs">
              {displayedList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-[#769188]">
                    {t.instrumentList.noData}
                  </td>
                </tr>
              ) : (
                displayedList.map((inst) => {
                  const isCritical = inst.rcm_profile.final_classification === 'Critical';

                  return (
                    <tr key={inst.instrument_id} className="table-row-hover">
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-[#192E27] text-xs">{inst.tag_number}</div>
                        <div className="text-[11px] text-[#769188] truncate max-w-xs">{inst.description}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#192E27]">{inst.process_variable}</div>
                        <div className="text-[10px] text-[#769188]">{inst.location}</div>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <span className="font-bold text-[#192E27]">{inst.range_min}~{inst.range_max} {inst.engineering_unit}</span>
                        <span className="text-[10px] text-[#769188] block">&plusmn;{inst.vendor_tolerance_percent}% tol</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isCritical 
                            ? 'bg-[#FEF1F1] text-[#E26D6D] border border-[#FCD7D7]' 
                            : 'bg-[#E8F4F0] text-[#357F6B] border border-[#D1E6DF]'
                        }`}>
                          {inst.rcm_profile.final_classification}
                        </span>
                        <span className="text-[10px] font-mono text-[#769188] block mt-0.5">
                          Interval: {inst.current_interval_months} {t.dashboard.monthShort}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <span className="font-bold text-[#192E27]">{inst.next_due_date}</span>
                        <span className={`text-[10px] block font-semibold ${
                          inst.daysLeft < 30 ? 'text-[#F6B738]' : 'text-[#357F6B]'
                        }`}>
                          {inst.daysLeft} {t.dashboard.daysLeft}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => onNavigateToNewCalibration(inst.instrument_id)}
                          className="btn-teal py-1 px-3 text-xs"
                        >
                          <span>{t.dashboard.calibrateBtn}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info & View All button if list exceeds 15 */}
        {filteredList.length > 15 && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-[#769188] border-t border-[#F0F5F2]">
            <span>
              {language === 'id' 
                ? `Menampilkan 15 dari ${filteredList.length} antrean instrumen (jatuh tempo terdekat)` 
                : `Showing 15 of ${filteredList.length} queued instruments (earliest due dates)`}
            </span>
            <button
              onClick={onNavigateToInstruments}
              className="text-xs font-bold text-[#357F6B] hover:text-[#276353] hover:underline flex items-center gap-1 transition cursor-pointer"
            >
              <span>{language === 'id' ? `Lihat Seluruh ${filteredList.length} Instrumen` : `View All ${filteredList.length} Instruments`}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
