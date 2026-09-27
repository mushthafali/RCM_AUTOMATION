import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Instrument } from '../types/schema';
import { PHYSICAL_QUANTITIES, getCategoryById } from '../utils/physicalQuantities';
import { CustomSelect, SelectOption } from './ui/CustomSelect';
import { useLanguage } from '../context/LanguageContext';
import { 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  PlusCircle,
  FileText,
  Layers,
  Clock
} from 'lucide-react';

interface InstrumentListProps {
  instruments: Instrument[];
  onSelectInstrument: (inst: Instrument) => void;
  onAddNewInstrument: (defaultPV?: string) => void;
  onEditInstrument: (inst: Instrument) => void;
  onDeleteInstrument: (instrumentId: number) => void;
  onNewCalibration: (inst: Instrument) => void;
  onViewReport: (inst: Instrument) => void;
  selectedPV?: string;
  onSelectPV?: (pv: string) => void;
}

export const InstrumentList: React.FC<InstrumentListProps> = React.memo(({
  instruments,
  onSelectInstrument: _onSelectInstrument,
  onAddNewInstrument,
  onEditInstrument,
  onDeleteInstrument,
  onNewCalibration,
  onViewReport,
  selectedPV: propSelectedPV,
  onSelectPV
}) => {
  const { language, t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [internalSelectedPV, setInternalSelectedPV] = useState<string>('ALL');
  const [selectedUnit, setSelectedUnit] = useState<string>('ALL');
  const [selectedRCM, setSelectedRCM] = useState<string>('ALL');

  // Deletion confirmation alert modal state
  const [instrumentToDelete, setInstrumentToDelete] = useState<Instrument | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const selectedPV = propSelectedPV !== undefined ? propSelectedPV : internalSelectedPV;

  const handleDeleteClick = (e: React.MouseEvent, inst: Instrument) => {
    e.stopPropagation();
    setInstrumentToDelete(inst);
  };

  const handleConfirmDelete = async () => {
    if (!instrumentToDelete) return;
    setIsDeleting(true);
    try {
      await onDeleteInstrument(instrumentToDelete.instrument_id);
      setInstrumentToDelete(null);
    } catch (err) {
      console.error('Error deleting instrument:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Compute available units based on currently selected physical quantity
  const availableUnits: string[] = useMemo(() => {
    if (selectedPV !== 'ALL') {
      const cat = getCategoryById(selectedPV);
      const catUnits = cat ? cat.units : [];
      const instUnits = instruments
        .filter(i => i.process_variable.toLowerCase() === selectedPV.toLowerCase())
        .map(i => i.engineering_unit);
      return Array.from(new Set([...catUnits, ...instUnits])).filter(Boolean);
    } else {
      const allCatUnits = PHYSICAL_QUANTITIES.flatMap(c => c.units);
      const allInstUnits = instruments.map(i => i.engineering_unit);
      const existingSet = new Set(allInstUnits);
      const sortedExisting = Array.from(existingSet).filter(Boolean).sort();
      const otherUnits = Array.from(new Set(allCatUnits)).filter(u => !existingSet.has(u)).sort();
      return [...sortedExisting, ...otherUnits];
    }
  }, [selectedPV, instruments]);

  // Options for unit filter dropdown with asset count indicator
  const unitOptions: SelectOption[] = useMemo(() => {
    const allUnitsLabel = language === 'id' ? 'Semua Satuan' : 'All Units';
    return [
      { value: 'ALL', label: selectedPV === 'ALL' ? allUnitsLabel : `${allUnitsLabel} (${selectedPV})` },
      ...availableUnits.map(u => {
        const count = instruments.filter(i => {
          const matchPV = selectedPV === 'ALL' || i.process_variable.toLowerCase() === selectedPV.toLowerCase();
          return matchPV && i.engineering_unit.toLowerCase() === u.toLowerCase();
        }).length;
        return {
          value: u,
          label: count > 0 ? `${u} (${count})` : u
        };
      })
    ];
  }, [language, selectedPV, availableUnits, instruments]);

  // Automatically reset unit filter if current selectedUnit is not in availableUnits for the selected PV
  useEffect(() => {
    if (selectedUnit !== 'ALL' && !availableUnits.map(u => u.toLowerCase()).includes(selectedUnit.toLowerCase())) {
      setSelectedUnit('ALL');
    }
  }, [selectedPV, availableUnits, selectedUnit]);

  const handlePVChange = (newVal: string) => {
    setInternalSelectedPV(newVal);
    if (newVal !== 'ALL') {
      const cat = getCategoryById(newVal);
      if (selectedUnit !== 'ALL' && !cat.units.map(u => u.toLowerCase()).includes(selectedUnit.toLowerCase())) {
        setSelectedUnit('ALL');
      }
    }
    if (onSelectPV) {
      onSelectPV(newVal);
    }
  };

  const filteredInstruments = instruments.filter(inst => {
    const matchesSearch = 
      inst.tag_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.location.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPV = selectedPV === 'ALL' || inst.process_variable.toLowerCase() === selectedPV.toLowerCase();
    const matchesUnit = selectedUnit === 'ALL' || inst.engineering_unit.toLowerCase() === selectedUnit.toLowerCase();
    const matchesRCM = selectedRCM === 'ALL' || inst.rcm_profile.final_classification === selectedRCM;

    return matchesSearch && matchesPV && matchesUnit && matchesRCM;
  });

  const pvOptions: SelectOption[] = useMemo(() => [
    { value: 'ALL', label: t.instrumentList.allParameters },
    ...PHYSICAL_QUANTITIES.map(cat => ({ 
      value: cat.id, 
      label: language === 'en' ? (cat.nameEn || cat.name) : cat.name 
    }))
  ], [t, language]);

  const rcmOptions: SelectOption[] = useMemo(() => [
    { value: 'ALL', label: t.instrumentList.allRCM },
    { value: 'Critical', label: 'Critical' },
    { value: 'Non-Critical', label: 'Non-Critical' },
    { value: 'Run-To-Failure', label: 'Run-To-Failure' }
  ], [t]);

  return (
    <div className="space-y-4 animate-fade-in w-full pb-6">
      {/* Header Toolbar Card */}
      <div className="ref-card p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#E8F4F0] border border-[#D1E6DF] flex items-center justify-center text-[#357F6B] shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold text-[#192E27] tracking-tight uppercase">
                {t.instrumentList.title}
              </h2>
              <span className="text-[10px] font-mono font-bold text-[#357F6B] bg-[#E8F4F0] px-2 py-0.5 rounded-full border border-[#D1E6DF]">
                {instruments.length} {t.instrumentList.managedUnits}
              </span>
            </div>
            <p className="text-xs text-[#769188] font-normal">
              {t.instrumentList.subtitle}
            </p>
          </div>
        </div>

        <button
          onClick={() => onAddNewInstrument(selectedPV !== 'ALL' ? selectedPV : undefined)}
          className="btn-teal flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>{t.instrumentList.addNew}</span>
        </button>
      </div>

      {/* Filter Bar with Pill Search and Dropdowns */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex-1 min-w-[220px] relative flex items-center">
          <Search className="h-4 w-4 text-[#769188] absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            placeholder={t.instrumentList.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-pill !pl-10 w-full"
          />
        </div>

        {/* Dropdown Parameter */}
        <div className="w-52 min-w-[180px]">
          <CustomSelect
            value={selectedPV}
            onChange={handlePVChange}
            options={pvOptions}
          />
        </div>

        {/* Dropdown Satuan Rekayasa (Engineering Unit) */}
        <div className="w-48 min-w-[160px]">
          <CustomSelect
            value={selectedUnit}
            onChange={setSelectedUnit}
            options={unitOptions}
          />
        </div>

        {/* Dropdown Klasifikasi RCM */}
        <div className="w-48 min-w-[160px]">
          <CustomSelect
            value={selectedRCM}
            onChange={setSelectedRCM}
            options={rcmOptions}
          />
        </div>
      </div>

      {/* Data Table inside Ref Card */}
      <div className="ref-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#F4F7F6] text-[#769188] uppercase font-bold text-[10px] border-b border-[#E4EFEA] select-none cursor-default">
              <tr>
                <th className="py-3 px-4">{language === 'id' ? 'Tag & Deskripsi' : 'Tag & Description'}</th>
                <th className="py-3 px-4">{t.instrumentList.parameter}</th>
                <th className="py-3 px-4">{t.instrumentList.span}</th>
                <th className="py-3 px-4">{t.instrumentList.tolerance}</th>
                <th className="py-3 px-4">{t.instrumentList.rcmClassification}</th>
                <th className="py-3 px-4">{t.instrumentList.dueDate}</th>
                <th className="py-3 px-4 text-right">{t.instrumentList.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4EFEA]">
              {filteredInstruments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#769188] text-xs">
                    {t.instrumentList.noData}
                  </td>
                </tr>
              ) : (
                filteredInstruments.map(inst => {
                  const isCritical = inst.rcm_profile.final_classification === 'Critical';
                  const isRTF = inst.rcm_profile.final_classification === 'Run-To-Failure';
                  const span = Math.abs(inst.range_max - inst.range_min);

                  const formatDateTime = (dateStr?: string) => {
                    if (!dateStr) return '-';
                    const [dPart, tPart] = dateStr.includes('T') ? dateStr.split('T') : dateStr.split(' ');
                    if (!tPart) return dPart;
                    const timeSub = tPart.substring(0, 5);
                    return `${dPart} ${timeSub}`;
                  };

                  const latestSession = inst.calibration_history && inst.calibration_history.length > 0
                    ? inst.calibration_history[inst.calibration_history.length - 1]
                    : null;

                  return (
                    <tr key={inst.instrument_id} className="table-row-hover">
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#192E27] font-mono text-xs">{inst.tag_number}</div>
                        <div className="text-[11px] text-[#769188] truncate max-w-xs">{inst.description}</div>
                        {inst.created_at && (
                          <div className="text-[9px] text-[#769188] font-mono flex items-center gap-1 mt-0.5" title={`Waktu Registrasi: ${inst.created_at}`}>
                            <Clock className="w-2.5 h-2.5 text-[#357F6B] shrink-0" />
                            <span>Reg: {formatDateTime(inst.created_at)}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-[#192E27] font-semibold text-xs uppercase">
                          {inst.process_variable}
                        </span>
                        <div className="text-[10px] text-[#769188] truncate max-w-[140px]">{inst.location}</div>
                      </td>

                      <td className="py-3 px-4 font-mono">
                        <div className="text-[#192E27] font-bold">{inst.range_min} ~ {inst.range_max} {inst.engineering_unit}</div>
                        <div className="text-[10px] text-[#769188]">Span: {span} {inst.engineering_unit}</div>
                      </td>

                      <td className="py-3 px-4 font-mono">
                        <div className="text-[#357F6B] font-bold">&plusmn;{inst.vendor_tolerance_percent}% (Vendor)</div>
                        <div className="text-[#769188] text-[10px]">&plusmn;{inst.process_tolerance} {inst.engineering_unit} (Proses)</div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                            isCritical
                              ? 'bg-[#FEF1F1] text-[#E26D6D] border border-[#FCD7D7]'
                              : isRTF
                              ? 'bg-[#E8F4F0] text-[#357F6B] border border-[#D1E6DF]'
                              : 'bg-[#F4F7F6] text-[#769188] border border-[#E4EFEA]'
                          }`}
                        >
                          {inst.rcm_profile.final_classification}
                        </span>
                        <div className="text-[10px] text-[#769188] font-mono mt-0.5">
                          Interval: {inst.current_interval_months} Bln
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono">
                        <div className="text-[#192E27] font-bold">
                          {inst.next_due_date}
                        </div>
                        <div className="text-[10px] text-[#769188]">
                          {latestSession ? (
                            <span title={`Kalibrasi Terakhir: ${latestSession.calibration_date}`}>
                              Sesi: {formatDateTime(latestSession.calibration_date)}
                            </span>
                          ) : (
                            <span>0 Sesi Terdata</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onNewCalibration(inst)}
                            className="p-1.5 rounded-xl hover:bg-[#E8F4F0] text-[#357F6B] transition"
                            title="Input Kalibrasi Baru"
                          >
                            <PlusCircle className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => onViewReport(inst)}
                            className="p-1.5 rounded-xl hover:bg-[#F4F7F6] text-[#769188] transition"
                            title="Lihat Laporan"
                          >
                            <FileText className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => onEditInstrument(inst)}
                            className="p-1.5 rounded-xl hover:bg-[#F4F7F6] text-[#769188] transition"
                            title="Edit Master"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleDeleteClick(e, inst)}
                            className="p-1.5 rounded-xl hover:bg-[#FEF1F1] text-[#E26D6D] transition cursor-pointer"
                            title={`Hapus ${inst.tag_number}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Premium & Simple Confirmation Alert Modal for Master Instrument Deletion */}
      {instrumentToDelete && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-md animate-fade-in"
          onClick={() => !isDeleting && setInstrumentToDelete(null)}
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
                {instrumentToDelete.tag_number}
              </span>
            </div>

            {/* Typography & Context */}
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold tracking-tight text-slate-900">
                {language === 'id' ? 'Hapus Master Instrumen?' : 'Delete Instrument Master?'}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {language === 'id' 
                  ? 'Tindakan ini permanen. Seluruh spesifikasi dan riwayat kalibrasi terkait akan dihapus dari basis data.' 
                  : 'This action is permanent. All specifications and associated calibration history will be removed from the database.'}
              </p>
            </div>

            {/* Mini Context Card */}
            {instrumentToDelete.description && (
              <div className="px-3 py-2.5 rounded-xl bg-slate-50/90 border border-slate-200/70 flex items-center justify-between text-[11px]">
                <span className="text-slate-700 font-medium truncate max-w-[210px]" title={instrumentToDelete.description}>
                  {instrumentToDelete.description}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 shrink-0 ml-2">
                  {instrumentToDelete.process_variable}
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setInstrumentToDelete(null)}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100/90 hover:bg-slate-200/80 active:bg-slate-200 border border-slate-200/70 transition-all duration-150 cursor-pointer text-center shadow-2xs"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-b from-[#E04545] to-[#CE2B2B] hover:from-[#CE2B2B] hover:to-[#BD2121] active:to-[#A81B1B] shadow-[0_1px_2px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.18)] transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>{isDeleting ? (language === 'id' ? 'Menghapus...' : 'Deleting...') : (language === 'id' ? 'Hapus' : 'Delete')}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
});
