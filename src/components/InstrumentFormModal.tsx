import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Instrument, ProcessVariableType, RcmProfile } from '../types/schema';
import { determineRcmClassification } from '../utils/rcmEngine';
import { PHYSICAL_QUANTITIES, getCategoryById } from '../utils/physicalQuantities';
import { CustomSelect, SelectOption } from './ui/CustomSelect';
import { CustomToggle } from './ui/CustomToggle';
import { useLanguage } from '../context/LanguageContext';
import { 
  X, 
  Save, 
  ShieldCheck, 
  Layers,
  Clock,
  Trash2
} from 'lucide-react';

interface InstrumentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (instrument: Instrument) => void;
  onDelete?: (instrumentId: number) => void;
  initialData?: Instrument | null;
  defaultProcessVariable?: string;
}

export const InstrumentFormModal: React.FC<InstrumentFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialData,
  defaultProcessVariable
}) => {
  const { language } = useLanguage();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [tagNumber, setTagNumber] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [processVariable, setProcessVariable] = useState<ProcessVariableType>('Pressure');
  const [liveSystemTime, setLiveSystemTime] = useState<Date>(new Date());

  useEffect(() => {
    if (isOpen) {
      setLiveSystemTime(new Date());
      const timer = setInterval(() => setLiveSystemTime(new Date()), 1000);
      return () => clearInterval(timer);
    }
  }, [isOpen]);

  const pad = (n: number) => String(n).padStart(2, '0');

  const formatLiveDate = (d: Date) => {
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  };

  const formatLiveTime = (d: Date) => {
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const formatOriginalTimestamp = (rawStr?: string) => {
    if (!rawStr) return '-';
    const [dPart, tPart] = rawStr.includes('T') ? rawStr.split('T') : rawStr.split(' ');
    if (!tPart) return dPart;
    return `${dPart} ${tPart.slice(0, 8)}`;
  };
  const [rangeMin, setRangeMin] = useState<number | string>(0);
  const [rangeMax, setRangeMax] = useState<number | string>(100);
  const [engineeringUnit, setEngineeringUnit] = useState('psig');
  const [isCustomUnit, setIsCustomUnit] = useState(false);
  const [customUnitText, setCustomUnitText] = useState('');
  const [processTolerance, setProcessTolerance] = useState<number | string>(0.5);
  const [vendorTolerancePercent, setVendorTolerancePercent] = useState<number | string>(0.25);
  const [currentIntervalMonths, setCurrentIntervalMonths] = useState<number | string>(12);
  const [nextDueDate, setNextDueDate] = useState<string>('');

  const handleNumericInput = (
    setter: React.Dispatch<React.SetStateAction<number | string>>,
    rawVal: string
  ) => {
    if (rawVal === '') {
      setter('');
      return;
    }
    // Prevent "050" when typing after 0, but retain "0." for decimals
    let cleaned = rawVal;
    if (/^0[0-9]+/.test(rawVal)) {
      cleaned = rawVal.replace(/^0+/, '');
      if (cleaned === '') cleaned = '0';
    }
    setter(cleaned);
  };

  const [isFunctional, setIsFunctional] = useState(false);
  const [triggersOperatorAction, setTriggersOperatorAction] = useState(true);
  const [isRedundant, setIsRedundant] = useState(false);
  const [indicationComparisonPossible, setIndicationComparisonPossible] = useState(false);
  const [acceptableDriftConsequence, setAcceptableDriftConsequence] = useState(false);
  const [customNotes, setCustomNotes] = useState('');

  const activeCategory = getCategoryById(processVariable);
  const availableUnits = activeCategory.units;

  const categoryOptions: SelectOption[] = PHYSICAL_QUANTITIES.map(cat => ({
    value: cat.id,
    label: language === 'en' ? (cat.nameEn || cat.name) : cat.name,
    sublabel: cat.description
  }));

  const unitOptions: SelectOption[] = [
    ...availableUnits.map(u => ({ value: u, label: u })),
    { 
      value: 'custom', 
      label: language === 'en' ? '+ Custom Unit...' : '+ Satuan Kustom...', 
      sublabel: language === 'en' ? 'Manual unit input' : 'Input satuan manual' 
    }
  ];

  useEffect(() => {
    if (initialData) {
      setTagNumber(initialData.tag_number);
      setDescription(initialData.description);
      setLocation(initialData.location);
      setProcessVariable(initialData.process_variable);
      setRangeMin(initialData.range_min);
      setRangeMax(initialData.range_max);
      
      const cat = getCategoryById(initialData.process_variable);
      if (cat.units.includes(initialData.engineering_unit)) {
        setEngineeringUnit(initialData.engineering_unit);
        setIsCustomUnit(false);
      } else {
        setEngineeringUnit('custom');
        setIsCustomUnit(true);
        setCustomUnitText(initialData.engineering_unit);
      }

      setProcessTolerance(initialData.process_tolerance);
      setVendorTolerancePercent(initialData.vendor_tolerance_percent);
      setCurrentIntervalMonths(initialData.current_interval_months);
      setNextDueDate(initialData.next_due_date);

      setIsFunctional(initialData.rcm_profile.is_functional);
      setTriggersOperatorAction(initialData.rcm_profile.triggers_operator_action);
      setIsRedundant(initialData.rcm_profile.is_redundant);
      setIndicationComparisonPossible(initialData.rcm_profile.indication_comparison_possible);
      setAcceptableDriftConsequence(initialData.rcm_profile.acceptable_drift_consequence);
      setCustomNotes(initialData.rcm_profile.custom_notes || '');
    } else {
      setTagNumber('');
      setDescription('');
      setLocation('Area Produksi');
      const targetPV = (defaultProcessVariable && defaultProcessVariable !== 'ALL') ? defaultProcessVariable : 'Pressure';
      const cat = getCategoryById(targetPV);
      setProcessVariable(cat.id);
      setRangeMin(0);
      setRangeMax(100);
      setEngineeringUnit(cat.defaultUnit);
      setIsCustomUnit(false);
      setCustomUnitText('');
      setProcessTolerance(0.5);
      setVendorTolerancePercent(0.25);
      setCurrentIntervalMonths(12);

      const nextD = new Date();
      nextD.setMonth(nextD.getMonth() + 12);
      setNextDueDate(nextD.toISOString().split('T')[0]);

      setIsFunctional(false);
      setTriggersOperatorAction(true);
      setIsRedundant(false);
      setIndicationComparisonPossible(false);
      setAcceptableDriftConsequence(false);
      setCustomNotes('');
    }
  }, [initialData, isOpen, defaultProcessVariable]);

  const handleCategoryChange = (newCatId: string) => {
    setProcessVariable(newCatId);
    const cat = getCategoryById(newCatId);
    setEngineeringUnit(cat.defaultUnit);
    setIsCustomUnit(false);
    setCustomUnitText('');
  };

  const handleUnitSelect = (selectedUnit: string) => {
    if (selectedUnit === 'custom') {
      setIsCustomUnit(true);
      setEngineeringUnit('custom');
    } else {
      setIsCustomUnit(false);
      setEngineeringUnit(selectedUnit);
    }
  };

  const finalUnit = isCustomUnit ? (customUnitText.trim() || 'unit') : engineeringUnit;

  const { classification, reasoning } = determineRcmClassification(
    isFunctional,
    triggersOperatorAction,
    isRedundant,
    indicationComparisonPossible,
    acceptableDriftConsequence
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagNumber.trim()) {
      alert('Tag Number wajib diisi!');
      return;
    }

    if (
      rangeMin === '' ||
      rangeMax === '' ||
      processTolerance === '' ||
      vendorTolerancePercent === '' ||
      currentIntervalMonths === ''
    ) {
      alert('Semua spesifikasi rentang ukur, toleransi, dan interval kalibrasi wajib diisi (tidak boleh kosong)!');
      return;
    }

    const rcmProfile: RcmProfile = {
      is_functional: isFunctional,
      triggers_operator_action: triggersOperatorAction,
      is_redundant: isRedundant,
      indication_comparison_possible: indicationComparisonPossible,
      acceptable_drift_consequence: acceptableDriftConsequence,
      final_classification: classification,
      custom_notes: customNotes
    };

    // Automatic Contemporaneous System Timestamp upon Save Click (ISO/IEC 17025 Cl. 7.5 & ALCOA+)
    const now = new Date();
    const systemClickTimestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    const newOrUpdatedInstrument: Instrument = {
      instrument_id: initialData?.instrument_id || 0,
      tag_number: tagNumber.toUpperCase().trim(),
      description: description.trim(),
      location: location.trim(),
      process_variable: processVariable,
      range_min: Number(rangeMin),
      range_max: Number(rangeMax),
      engineering_unit: finalUnit,
      process_tolerance: Number(processTolerance),
      vendor_tolerance_percent: Number(vendorTolerancePercent),
      current_interval_months: Number(currentIntervalMonths),
      next_due_date: nextDueDate,
      created_at: initialData?.created_at || systemClickTimestamp,
      rcm_profile: rcmProfile,
      calibration_history: initialData?.calibration_history || []
    };

    onSave(newOrUpdatedInstrument);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-modal-backdrop">
      <div className="fixed inset-0 cursor-pointer" onClick={onClose} />
      <div className="relative rounded-2xl bg-white border border-zinc-200/90 w-full max-w-4xl shadow-2xl overflow-hidden my-auto animate-modal-pop z-10 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 bg-[#F9FBFA] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#E8F4F0] border border-[#D1E6DF] flex items-center justify-center text-[#357F6B] shadow-2xs">
              <Layers className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-[#192E27] tracking-tight uppercase">
                  {initialData 
                    ? (language === 'en' ? `Edit Master Instrument (${initialData.tag_number})` : `Edit Master Instrumen (${initialData.tag_number})`)
                    : (language === 'en' ? 'Add New Master Instrument' : 'Tambah Master Instrumen Baru')}
                </h3>
                <span className="text-[10px] font-mono font-bold text-[#357F6B] bg-[#E8F4F0] px-2 py-0.5 rounded-full border border-[#D1E6DF]">
                  ISO/IEC 17025
                </span>
              </div>
              <p className="text-xs text-[#769188] font-normal">
                {language === 'en'
                  ? 'Configure metrology parameters, span specifications, vendor/process tolerances, and Neil Bloom RCM evaluation.'
                  : 'Konfigurasi parameter metrologi, spesifikasi rentang span, toleransi vendor/proses, dan evaluasi RCM Neil Bloom.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 flex items-center justify-center transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Section 1: Identifikasi & Kategori Parameter */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-zinc-400 font-mono tracking-wider">01</span>
                <h4 className="text-xs font-bold text-[#192E27] uppercase tracking-wider">
                  {language === 'en' ? 'Asset Identification & Placement' : 'Identifikasi & Penempatan Aset'}
                </h4>
              </div>
              <span className="text-[10px] font-mono text-[#769188]">Metadata Tagging</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="text-[10px] font-bold text-[#769188] uppercase font-mono block mb-1">
                  {language === 'en' ? 'Tag Number *' : 'Tag Number *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PT-303, TT-101"
                  value={tagNumber}
                  onChange={(e) => setTagNumber(e.target.value)}
                  className="w-full bg-[#F8FAFB] border border-[#E4EFEA] focus:border-[#357F6B] focus:bg-white rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-[#192E27] focus:outline-none transition shadow-2xs"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-[#769188] uppercase font-mono block mb-1">
                  {language === 'en' ? 'Instrument Description' : 'Deskripsi Instrumen'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Reactor Vessel Pressure Transmitter"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#F8FAFB] border border-[#E4EFEA] focus:border-[#357F6B] focus:bg-white rounded-xl px-3 py-2.5 text-xs font-medium text-[#192E27] focus:outline-none transition shadow-2xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#769188] uppercase font-mono block mb-1">
                  {language === 'en' ? 'Parameter Category' : 'Kategori Parameter'}
                </label>
                <CustomSelect
                  value={processVariable}
                  onChange={handleCategoryChange}
                  options={categoryOptions}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-[#769188] uppercase font-mono block mb-1">
                  {language === 'en' ? 'Plant Location' : 'Lokasi Pemasangan'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Production Area Bay 2"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-[#F8FAFB] border border-[#E4EFEA] focus:border-[#357F6B] focus:bg-white rounded-xl px-3 py-2.5 text-xs font-medium text-[#192E27] focus:outline-none transition shadow-2xs"
                />
              </div>

              {/* Automatic System Registration Audit Trail */}
              <div className="sm:col-span-3 p-3.5 rounded-xl bg-zinc-50/80 border border-zinc-200/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white border border-zinc-200 text-[#357F6B] flex items-center justify-center shadow-2xs shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-[#192E27] uppercase font-mono">
                        {initialData ? 'Waktu Registrasi Aset (Audit Trail)' : 'Waktu Registrasi Sistem (Otomatis)'}
                      </span>
                      <span className="text-[9px] font-mono text-[#357F6B] font-bold bg-[#E8F4F0] px-1.5 py-0.2 rounded border border-[#D1E6DF]">
                        {initialData ? 'Terkunci (Immutable)' : 'Live Audit Trail'}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#769188]">
                      {initialData 
                        ? 'Timestamp registrasi awal aset di database bersifat permanen demi integritas data ISO/IEC 17025'
                        : 'Tanggal dan jam registrasi direkam otomatis oleh sistem saat tombol Simpan Master Instrumen diklik'}
                    </span>
                  </div>
                </div>

                {initialData ? (
                  <div className="flex items-center gap-2">
                    <div className="bg-white border border-zinc-200 px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-2xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className="font-mono text-xs font-bold text-[#192E27]">
                        {formatOriginalTimestamp(initialData.created_at)} WIB
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500 bg-zinc-100 px-2 py-1 rounded-md border border-zinc-200">
                      Permanent Record
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="bg-white border border-zinc-200 px-3 py-1.5 rounded-lg flex items-center gap-2.5 shadow-2xs" title="Jam sistem berjalan secara realtime">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-[#192E27]">
                        <span className="text-zinc-600">{formatLiveDate(liveSystemTime)}</span>
                        <span className="text-zinc-300">|</span>
                        <span className="text-[#357F6B]">{formatLiveTime(liveSystemTime)}</span>
                        <span className="text-[9px] text-zinc-400 font-normal">WIB</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-[#357F6B] font-bold bg-[#E8F4F0] px-2 py-1 rounded-md border border-[#D1E6DF]">
                      Auto-Recorded on Click
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Spesifikasi Metrologi & Satuan */}
          <div className="space-y-3.5 pt-2">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-zinc-400 font-mono tracking-wider">02</span>
                <h4 className="text-xs font-bold text-[#192E27] uppercase tracking-wider">Rentang Ukur, Span & Batas Toleransi</h4>
              </div>
              <span className="text-[10px] font-mono text-[#357F6B] font-bold bg-[#E8F4F0] px-2.5 py-0.5 rounded-full border border-[#357F6B]/20">
                Span: {Math.abs(Number(rangeMax || 0) - Number(rangeMin || 0))} {finalUnit}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div>
                <label className="text-[10px] font-bold text-[#769188] uppercase font-mono block mb-1">Range Min (Zero) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={rangeMin}
                  onChange={(e) => handleNumericInput(setRangeMin, e.target.value)}
                  className="w-full bg-[#F8FAFB] border border-[#E4EFEA] focus:border-[#357F6B] focus:bg-white rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-[#192E27] focus:outline-none transition shadow-2xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#769188] uppercase font-mono block mb-1">Range Max (Span) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={rangeMax}
                  onChange={(e) => handleNumericInput(setRangeMax, e.target.value)}
                  className="w-full bg-[#F8FAFB] border border-[#E4EFEA] focus:border-[#357F6B] focus:bg-white rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-[#192E27] focus:outline-none transition shadow-2xs"
                />
              </div>

              {/* Fluid Unit Selector */}
              <div>
                <label className="text-[10px] font-bold text-[#769188] uppercase font-mono block mb-1">Satuan ({processVariable})</label>
                <CustomSelect
                  value={isCustomUnit ? 'custom' : engineeringUnit}
                  onChange={handleUnitSelect}
                  options={unitOptions}
                />
              </div>

              {/* If custom unit is selected */}
              {isCustomUnit ? (
                <div>
                  <label className="text-[10px] font-bold text-[#357F6B] uppercase font-mono block mb-1">Ketik Satuan *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. °F, gpm, mm"
                    value={customUnitText}
                    onChange={(e) => setCustomUnitText(e.target.value)}
                    className="w-full bg-[#E8F4F0] border border-[#357F6B]/40 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-[#192E27] focus:outline-none transition shadow-2xs"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-[10px] font-bold text-[#769188] uppercase font-mono block mb-1">Toleransi Vendor (%) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={vendorTolerancePercent}
                    onChange={(e) => handleNumericInput(setVendorTolerancePercent, e.target.value)}
                    className="w-full bg-[#F8FAFB] border border-[#E4EFEA] focus:border-[#357F6B] focus:bg-white rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-[#192E27] focus:outline-none transition shadow-2xs"
                  />
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-[#769188] uppercase font-mono block mb-1">Toleransi Proses ({finalUnit}) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={processTolerance}
                  onChange={(e) => handleNumericInput(setProcessTolerance, e.target.value)}
                  className="w-full bg-[#F8FAFB] border border-[#E4EFEA] focus:border-[#357F6B] focus:bg-white rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-[#192E27] focus:outline-none transition shadow-2xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#769188] uppercase font-mono block mb-1">Interval (Bulan) *</label>
                <input
                  type="number"
                  min={1}
                  max={36}
                  required
                  value={currentIntervalMonths}
                  onChange={(e) => handleNumericInput(setCurrentIntervalMonths, e.target.value)}
                  className="w-full bg-[#F8FAFB] border border-[#E4EFEA] focus:border-[#357F6B] focus:bg-white rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-[#192E27] focus:outline-none transition shadow-2xs"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-[#769188] uppercase font-mono block mb-1">Jatuh Tempo Kalibrasi Berikutnya</label>
                <input
                  type="date"
                  value={nextDueDate}
                  onChange={(e) => setNextDueDate(e.target.value)}
                  className="w-full bg-[#F8FAFB] border border-[#E4EFEA] focus:border-[#357F6B] focus:bg-white rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-[#192E27] focus:outline-none transition shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Kuisioner Profil RCM (Neil Bloom) */}
          <div className="space-y-3.5 pt-2">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-zinc-400 font-mono tracking-wider">03</span>
                <h4 className="text-xs font-bold text-[#192E27] uppercase tracking-wider">Kuisioner Evaluasi Profil RCM</h4>
              </div>
              <span className="text-[10px] font-mono text-[#357F6B] font-bold bg-[#E8F4F0] px-2.5 py-0.5 rounded-full border border-[#D1E6DF]">
                Neil Bloom Metrology Logic
              </span>
            </div>

            <div className="space-y-2.5">
              {/* Q1 */}
              <div className="p-3.5 rounded-xl bg-zinc-50/70 border border-zinc-200/80 flex items-center justify-between gap-4 hover:bg-zinc-50 transition-colors">
                <div>
                  <span className="text-xs text-[#192E27] font-semibold block">1. Fungsi Loop Proteksi / Interlock</span>
                  <span className="text-[11px] text-[#769188]">Apakah instrumen aktif memicu trip keselamatan atau interlock otomatis?</span>
                </div>
                <CustomToggle
                  checked={isFunctional}
                  onChange={setIsFunctional}
                  trueLabel="YA (Proteksi)"
                  falseLabel="TIDAK (Indikasi)"
                  variant="teal"
                  className="w-64 sm:w-72 shrink-0"
                />
              </div>

              {/* Q2 */}
              <div className="p-3.5 rounded-xl bg-zinc-50/70 border border-zinc-200/80 flex items-center justify-between gap-4 hover:bg-zinc-50 transition-colors">
                <div>
                  <span className="text-xs text-[#192E27] font-semibold block">2. Pemicu Tindakan Operator</span>
                  <span className="text-[11px] text-[#769188]">Apakah penyimpangan pembacaan memicu tindakan manual operator yang keliru?</span>
                </div>
                <CustomToggle
                  checked={triggersOperatorAction}
                  onChange={setTriggersOperatorAction}
                  trueLabel="YA (Memicu)"
                  falseLabel="TIDAK"
                  variant="teal"
                  className="w-64 sm:w-72 shrink-0"
                />
              </div>

              {/* Q3 */}
              <div className="p-3.5 rounded-xl bg-zinc-50/70 border border-zinc-200/80 flex items-center justify-between gap-4 hover:bg-zinc-50 transition-colors">
                <div>
                  <span className="text-xs text-[#192E27] font-semibold block">3. Redundansi Sensor</span>
                  <span className="text-[11px] text-[#769188]">Apakah terdapat sensor pendamping redundan (backup) terpasang?</span>
                </div>
                <CustomToggle
                  checked={isRedundant}
                  onChange={setIsRedundant}
                  trueLabel="ADA"
                  falseLabel="TIDAK ADA"
                  variant="amber"
                  className="w-64 sm:w-72 shrink-0"
                />
              </div>

              {/* Q4 */}
              <div className="p-3.5 rounded-xl bg-zinc-50/70 border border-zinc-200/80 flex items-center justify-between gap-4 hover:bg-zinc-50 transition-colors">
                <div>
                  <span className="text-xs text-[#192E27] font-semibold block">4. Perbandingan Indikasi Proses</span>
                  <span className="text-[11px] text-[#769188]">Dapatkah operator membandingkan nilai ini dengan parameter proses lain secara rutin?</span>
                </div>
                <CustomToggle
                  checked={indicationComparisonPossible}
                  onChange={setIndicationComparisonPossible}
                  trueLabel="BISA"
                  falseLabel="TIDAK"
                  variant="amber"
                  className="w-64 sm:w-72 shrink-0"
                />
              </div>

              {/* Q5 */}
              <div className="p-3.5 rounded-xl bg-zinc-50/70 border border-zinc-200/80 flex items-center justify-between gap-4 hover:bg-zinc-50 transition-colors">
                <div>
                  <span className="text-xs text-[#192E27] font-semibold block">5. Toleransi Konsekuensi Drift</span>
                  <span className="text-[11px] text-[#769188]">Apakah konsekuensi pergeseran nilai ukur dapat diterima oleh keselamatan & mutu?</span>
                </div>
                <CustomToggle
                  checked={acceptableDriftConsequence}
                  onChange={setAcceptableDriftConsequence}
                  trueLabel="DITERIMA"
                  falseLabel="TIDAK DITERIMA"
                  variant={acceptableDriftConsequence ? 'teal' : 'rose'}
                  className="w-64 sm:w-72 shrink-0"
                />
              </div>
            </div>

            {/* Classification Summary Box */}
            <div className="p-4 rounded-xl bg-[#192E27] text-white flex items-center justify-between gap-4 border border-[#357F6B]/30 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#769188] uppercase font-mono font-bold">Hasil Klasifikasi RCM:</span>
                  <span
                    className={`text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-full font-mono ${
                      classification === 'Critical'
                        ? 'bg-[#F6B738] text-[#192E27]'
                        : classification === 'Run-To-Failure'
                        ? 'bg-[#357F6B] text-white'
                        : 'bg-zinc-700 text-white'
                    }`}
                  >
                    {classification}
                  </span>
                </div>
                <p className="text-xs text-white/80 leading-relaxed max-w-2xl">{reasoning}</p>
              </div>

              <div className="p-2.5 rounded-xl bg-white/10 text-[#F6B738] shrink-0 border border-white/10 shadow-2xs">
                <ShieldCheck className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-zinc-200/80 flex items-center justify-between gap-3">
            {initialData && onDelete ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3.5 py-2 rounded-xl bg-[#FEF1F1] hover:bg-[#FCD7D7] text-[#E26D6D] text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Hapus Master</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="btn-teal px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Save className="h-4 w-4" />
                <span>Simpan Master Instrumen</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Premium & Simple Alert Konfirmasi Hapus Master Instrumen dari Modal Edit */}
      {showDeleteConfirm && initialData && onDelete && createPortal(
        <div 
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-md animate-fade-in"
          onClick={() => !isDeleting && setShowDeleteConfirm(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.2),0_0_0_1px_rgba(0,0,0,0.06)] max-w-[380px] w-full p-6 space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar: Micro Icon + Tag Badge */}
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-rose-50 to-rose-100/70 border border-rose-200/80 text-rose-600 flex items-center justify-center shadow-xs">
                <Trash2 className="h-4.5 w-4.5 stroke-[2.2]" />
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 font-mono text-[11px] font-bold text-slate-800 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                {initialData.tag_number}
              </span>
            </div>

            {/* Typography & Context */}
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold tracking-tight text-slate-900">
                Hapus Master Instrumen?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Tindakan ini permanen. Seluruh spesifikasi dan riwayat kalibrasi terkait akan dihapus dari basis data.
              </p>
            </div>

            {/* Mini Context Card */}
            {initialData.description && (
              <div className="px-3 py-2.5 rounded-xl bg-slate-50/90 border border-slate-200/70 flex items-center justify-between text-[11px]">
                <span className="text-slate-700 font-medium truncate max-w-[210px]" title={initialData.description}>
                  {initialData.description}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 shrink-0 ml-2">
                  {initialData.process_variable}
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100/90 hover:bg-slate-200/80 active:bg-slate-200 border border-slate-200/70 transition-all duration-150 cursor-pointer text-center shadow-2xs"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    await onDelete(initialData.instrument_id);
                    setShowDeleteConfirm(false);
                    onClose();
                  } catch (err) {
                    console.error('Failed to delete instrument:', err);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-b from-[#E04545] to-[#CE2B2B] hover:from-[#CE2B2B] hover:to-[#BD2121] active:to-[#A81B1B] shadow-[0_1px_2px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.18)] transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>{isDeleting ? 'Menghapus...' : 'Hapus'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>,
    document.body
  );
};
