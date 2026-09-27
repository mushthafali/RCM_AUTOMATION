import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Instrument, IntermediateCheck } from '../types/schema';
import { exportSelectiveDatabaseToFile, ExportResult } from '../services/storageService';
import { PHYSICAL_QUANTITIES } from '../utils/physicalQuantities';
import { CustomSelect, SelectOption } from './ui/CustomSelect';
import { useLanguage } from '../context/LanguageContext';
import { 
  X, 
  FolderDown, 
  Search, 
  CheckSquare, 
  Square, 
  Loader2,
  FileCheck,
  Calendar,
  ClipboardCheck
} from 'lucide-react';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  instruments: Instrument[];
  intermediateChecks: IntermediateCheck[];
  onBackupSuccess: (result: ExportResult) => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  instruments,
  intermediateChecks,
  onBackupSuccess
}) => {
  const { language, t } = useLanguage();
  // Default to selecting all instruments
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    () => new Set(instruments.map(i => i.instrument_id))
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPVFilter, setSelectedPVFilter] = useState<string>('ALL');
  const [isExporting, setIsExporting] = useState(false);

  // Suggested filename with current date and time
  const [customFilename, setCustomFilename] = useState(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `rcm_calibration_backup_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.json`;
  });

  // Re-sync default selections when modal opens or instrument list changes
  React.useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set(instruments.map(i => i.instrument_id)));
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      setCustomFilename(`rcm_calibration_backup_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.json`);
    }
  }, [isOpen, instruments]);

  // Options for parameter filter dropdown
  const pvOptions: SelectOption[] = useMemo(() => {
    return [
      { value: 'ALL', label: `${t.backupModal.allParameters} (${instruments.length})` },
      ...PHYSICAL_QUANTITIES.map(cat => {
        const count = instruments.filter(i => i.process_variable.toLowerCase() === cat.id.toLowerCase()).length;
        const name = language === 'en' ? (cat.nameEn || cat.name) : cat.name;
        return {
          value: cat.id,
          label: count > 0 ? `${name} (${count})` : name
        };
      }).filter(opt => opt.value === 'ALL' || instruments.some(i => i.process_variable.toLowerCase() === opt.value.toLowerCase()))
    ];
  }, [instruments, language, t]);

  // Intermediate checks count per instrument lookup
  const checksCountMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const c of intermediateChecks) {
      map.set(c.instrument_id, (map.get(c.instrument_id) || 0) + 1);
    }
    return map;
  }, [intermediateChecks]);

  // Filter instruments based on search and physical quantity
  const filteredInstruments = useMemo(() => {
    return instruments.filter(inst => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        inst.tag_number.toLowerCase().includes(q) ||
        inst.description.toLowerCase().includes(q) ||
        inst.location.toLowerCase().includes(q) ||
        inst.process_variable.toLowerCase().includes(q);

      const matchesPV = selectedPVFilter === 'ALL' || inst.process_variable.toLowerCase() === selectedPVFilter.toLowerCase();

      return matchesSearch && matchesPV;
    });
  }, [instruments, searchQuery, selectedPVFilter]);

  // Toggle single instrument selection
  const handleToggle = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select all currently filtered instruments
  const handleSelectAllFiltered = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      filteredInstruments.forEach(i => next.add(i.instrument_id));
      return next;
    });
  };

  // Deselect all currently filtered instruments
  const handleDeselectAllFiltered = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      filteredInstruments.forEach(i => next.delete(i.instrument_id));
      return next;
    });
  };

  // Telemetry summary metrics of selected instruments
  const selectedInstruments = useMemo(() => {
    return instruments.filter(i => selectedIds.has(i.instrument_id));
  }, [instruments, selectedIds]);

  const totalSelectedSessions = useMemo(() => {
    return selectedInstruments.reduce(
      (sum, inst) => sum + (inst.calibration_history ? inst.calibration_history.length : 0),
      0
    );
  }, [selectedInstruments]);

  const totalSelectedChecks = useMemo(() => {
    return selectedInstruments.reduce(
      (sum, inst) => sum + (checksCountMap.get(inst.instrument_id) || 0),
      0
    );
  }, [selectedInstruments, checksCountMap]);

  const estimatedJsonBytes = useMemo(() => {
    // Approx 1.2KB per instrument + 2.5KB per session + 0.5KB per check
    const bytes = selectedInstruments.length * 1200 + totalSelectedSessions * 2500 + totalSelectedChecks * 500 + 400;
    return Math.max(0.5, Math.round(bytes / 1024 * 10) / 10);
  }, [selectedInstruments, totalSelectedSessions, totalSelectedChecks]);

  // Execute backup with OS location picker
  const handlePerformBackup = async () => {
    if (selectedIds.size === 0) {
      alert('Silakan pilih minimal 1 instrumen yang ingin dibackup.');
      return;
    }

    setIsExporting(true);
    try {
      const result = await exportSelectiveDatabaseToFile({
        selectedInstrumentIds: Array.from(selectedIds),
        customFilename
      });

      if (result.success) {
        onBackupSuccess(result);
        onClose();
      } else if (result.cancelled) {
        // User cancelled location picker dialog, do not close modal so user can retry
      } else {
        alert(result.message || 'Gagal melakukan ekspor backup.');
      }
    } catch (err) {
      alert(`Terjadi kesalahan: ${(err as Error).message}`);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  const isAllFilteredSelected = filteredInstruments.length > 0 && 
    filteredInstruments.every(i => selectedIds.has(i.instrument_id));

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-modal-backdrop">
      <div className="fixed inset-0 cursor-pointer" onClick={onClose} />
      
      <div className="relative rounded-2xl bg-white border border-zinc-200/90 w-full max-w-3xl shadow-2xl overflow-hidden my-auto animate-modal-pop z-10 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 bg-[#F9FBFA] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#E8F4F0] border border-[#D1E6DF] flex items-center justify-center text-[#357F6B] shadow-2xs">
              <FolderDown className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-[#192E27] tracking-tight uppercase">
                  {language === 'en' ? 'Backup & Export Calibration Database' : 'Backup & Ekspor Database Kalibrasi'}
                </h3>
                <span className="text-[9px] font-mono font-bold text-[#357F6B] bg-[#E8F4F0] px-2 py-0.5 rounded border border-[#D1E6DF]">
                  ISO/IEC 17025 Cl. 7.5
                </span>
              </div>
              <p className="text-[11px] text-[#769188] mt-0.5">
                {language === 'en' 
                  ? 'Select instruments to export along with complete calibration history, test points, and intermediate checks.'
                  : 'Pilih instrumen yang ingin diekspor beserta seluruh data riwayat kalibrasi, titik ukur, dan verifikasi antara.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 flex items-center justify-center transition cursor-pointer"
            title={language === 'en' ? 'Close dialog' : 'Tutup dialog'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-[#192E27]">
          {/* Data Completeness Notice Banner */}
          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/70 flex items-start gap-2.5 text-xs">
            <FileCheck className="w-4 h-4 text-[#357F6B] shrink-0 mt-0.5" />
            <div className="text-[11px] text-emerald-900 leading-relaxed">
              <span className="font-bold">{language === 'en' ? 'Guaranteed Data Integrity:' : 'Integritas Data Terjamin:'}</span>{' '}
              {language === 'en'
                ? 'Every selected instrument will include 100% complete data: metrological specifications, full calibration session history (test points, tolerances, as-found, as-left, expanded uncertainty U, drift), intermediate check logs, Neil Bloom RCM evaluation questionnaires, and technician remarks.'
                : 'Setiap instrumen yang dipilih akan menyertakan 100% data lengkap: spesifikasi metrologi, seluruh riwayat sesi kalibrasi (titik ukur, toleransi, as-found, as-left, ketidakpastian bentangan U, drift), log verifikasi antara, kuesioner evaluasi RCM Neil Bloom, dan catatan teknisi.'}
            </div>
          </div>

          {/* Filtering & Quick Selection Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* Search Bar */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#769188]" />
              <input
                type="text"
                placeholder={t.backupModal.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#F8FAFB] border border-[#E4EFEA] focus:border-[#357F6B] focus:bg-white rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-[#192E27] focus:outline-none transition shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-xs"
                >
                  ×
                </button>
              )}
            </div>

            {/* Dropdown Parameter Filter */}
            <div className="w-56 min-w-[180px]">
              <CustomSelect
                value={selectedPVFilter}
                onChange={setSelectedPVFilter}
                options={pvOptions}
              />
            </div>

            {/* Quick Select Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-[11px] font-bold text-zinc-700 transition cursor-pointer flex items-center gap-1.5"
                title={language === 'en' ? 'Select all displayed instruments' : 'Pilih seluruh instrumen yang tampil'}
              >
                <CheckSquare className="w-3.5 h-3.5 text-[#357F6B]" />
                <span>{t.backupModal.selectAll}</span>
              </button>
              <button
                type="button"
                onClick={handleDeselectAllFiltered}
                className="px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-[11px] font-bold text-zinc-700 transition cursor-pointer flex items-center gap-1.5"
                title={language === 'en' ? 'Clear all selected checks' : 'Kosongkan seluruh centang pilihan'}
              >
                <Square className="w-3.5 h-3.5 text-zinc-400" />
                <span>{t.backupModal.deselectAll}</span>
              </button>
            </div>
          </div>

          {/* Instrument Selection List */}
          <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-2xs">
            <div className="px-4 py-2 bg-[#F4F7F6] border-b border-zinc-200 flex items-center justify-between text-[10px] font-bold uppercase font-mono text-[#769188]">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isAllFilteredSelected}
                  onChange={(e) => {
                    if (e.target.checked) handleSelectAllFiltered();
                    else handleDeselectAllFiltered();
                  }}
                  className="rounded border-zinc-300 text-[#357F6B] focus:ring-[#357F6B] cursor-pointer"
                />
                <span>{language === 'en' ? `Instruments List (${filteredInstruments.length})` : `Daftar Instrumen (${filteredInstruments.length})`}</span>
              </div>
              <span>{language === 'en' ? 'Status & Full History' : 'Status & Riwayat Lengkap'}</span>
            </div>

            <div className="max-h-72 sm:max-h-80 overflow-y-auto divide-y divide-zinc-100">
              {filteredInstruments.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#769188]">
                  {t.backupModal.noMatch}
                </div>
              ) : (
                filteredInstruments.map(inst => {
                  const isSelected = selectedIds.has(inst.instrument_id);
                  const sessionCount = inst.calibration_history ? inst.calibration_history.length : 0;
                  const checkCount = checksCountMap.get(inst.instrument_id) || 0;
                  const isCritical = inst.rcm_profile.final_classification === 'Critical';

                  return (
                    <div
                      key={inst.instrument_id}
                      onClick={() => handleToggle(inst.instrument_id)}
                      className={`px-4 py-3 flex items-center justify-between gap-3 cursor-pointer transition ${
                        isSelected ? 'bg-emerald-50/40 hover:bg-emerald-50/70' : 'hover:bg-zinc-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // handled by row click
                          className="rounded border-zinc-300 text-[#357F6B] focus:ring-[#357F6B] cursor-pointer shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-[#192E27]">
                              {inst.tag_number}
                            </span>
                            <span className="text-[10px] font-semibold text-[#769188] bg-zinc-100 px-1.5 py-0.2 rounded">
                              {inst.process_variable} ({inst.engineering_unit})
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                              isCritical 
                                ? 'bg-red-50 text-red-700 border-red-200' 
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              {inst.rcm_profile.final_classification}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#769188] truncate max-w-sm mt-0.5">
                            {inst.description} • <span className="text-zinc-400">{inst.location}</span>
                          </div>
                        </div>
                      </div>

                      {/* Included Data Counters */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span 
                          className="text-[10px] font-mono text-zinc-600 bg-white border border-zinc-200 px-2 py-1 rounded-md flex items-center gap-1 shadow-2xs"
                          title={language === 'en' ? 'Total Full Calibration Sessions' : 'Jumlah Sesi Kalibrasi Lengkap'}
                        >
                          <Calendar className="w-3 h-3 text-[#357F6B]" />
                          <span>{sessionCount} {language === 'en' ? 'Sessions' : 'Sesi'}</span>
                        </span>
                        <span 
                          className="text-[10px] font-mono text-zinc-600 bg-white border border-zinc-200 px-2 py-1 rounded-md flex items-center gap-1 shadow-2xs"
                          title={language === 'en' ? 'Associated Intermediate Checks Count' : 'Jumlah Verifikasi Antara Terkait'}
                        >
                          <ClipboardCheck className="w-3 h-3 text-blue-600" />
                          <span>{checkCount} {language === 'en' ? 'Checks' : 'Cek'}</span>
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Telemetry Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="bg-zinc-50 border border-zinc-200 p-2.5 rounded-xl text-center">
              <div className="text-[10px] font-bold uppercase font-mono text-[#769188]">
                {language === 'en' ? 'Instruments' : 'Instrumen'}
              </div>
              <div className="text-base font-extrabold font-mono text-[#192E27]">
                {selectedInstruments.length} <span className="text-xs text-zinc-400 font-normal">/ {instruments.length}</span>
              </div>
            </div>
            <div className="bg-zinc-50 border border-zinc-200 p-2.5 rounded-xl text-center">
              <div className="text-[10px] font-bold uppercase font-mono text-[#769188]">
                {language === 'en' ? 'Calibration Sessions' : 'Sesi Kalibrasi'}
              </div>
              <div className="text-base font-extrabold font-mono text-[#357F6B]">
                {totalSelectedSessions} <span className="text-xs text-zinc-400 font-normal">{language === 'en' ? 'sessions' : 'sesi'}</span>
              </div>
            </div>
            <div className="bg-zinc-50 border border-zinc-200 p-2.5 rounded-xl text-center">
              <div className="text-[10px] font-bold uppercase font-mono text-[#769188]">
                {language === 'en' ? 'Intermediate Checks' : 'Verifikasi Antara'}
              </div>
              <div className="text-base font-extrabold font-mono text-blue-700">
                {totalSelectedChecks} <span className="text-xs text-zinc-400 font-normal">{language === 'en' ? 'checks' : 'catatan'}</span>
              </div>
            </div>
            <div className="bg-zinc-50 border border-zinc-200 p-2.5 rounded-xl text-center">
              <div className="text-[10px] font-bold uppercase font-mono text-[#769188]">
                {language === 'en' ? 'File Size' : 'Ukuran Berkas'}
              </div>
              <div className="text-base font-extrabold font-mono text-zinc-800">
                ~{estimatedJsonBytes} <span className="text-xs text-zinc-400 font-normal">KB</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-zinc-200 bg-[#F9FBFA] flex items-center justify-between shrink-0">
          <div className="text-xs text-[#769188] font-mono">
            {selectedIds.size > 0 ? (
              <span className="text-emerald-700 font-bold">
                ✓ {selectedIds.size} {language === 'en' ? 'instruments ready to backup' : 'instrumen siap dibackup'}
              </span>
            ) : (
              <span className="text-amber-600 font-bold">
                ⚠️ {language === 'en' ? 'No instruments selected yet' : 'Belum ada instrumen yang dipilih'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isExporting}
              className="px-4 py-2 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-100 text-xs font-bold text-zinc-700 transition cursor-pointer"
            >
              {t.common.cancel}
            </button>
            <button
              type="button"
              onClick={handlePerformBackup}
              disabled={selectedIds.size === 0 || isExporting}
              className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition cursor-pointer ${
                selectedIds.size === 0 || isExporting
                  ? 'bg-zinc-300 text-zinc-500 cursor-not-allowed'
                  : 'bg-[#357F6B] hover:bg-[#286353] text-white'
              }`}
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{language === 'en' ? 'Opening File Picker...' : 'Membuka File Picker...'}</span>
                </>
              ) : (
                <>
                  <FolderDown className="w-4 h-4" />
                  <span>{language === 'en' ? 'Save Backup (.json)' : 'Pilih Lokasi & Simpan Backup (.json)'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
