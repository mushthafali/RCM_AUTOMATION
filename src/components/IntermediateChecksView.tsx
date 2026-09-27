import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Instrument, IntermediateCheck } from '../types/schema';
import { CustomSelect, SelectOption } from './ui/CustomSelect';
import { useLanguage } from '../context/LanguageContext';
import { 
  Plus, 
  Save, 
  X, 
  ClipboardCheck, 
  Search, 
  Info,
  Activity
} from 'lucide-react';

interface IntermediateChecksViewProps {
  instruments: Instrument[];
  checks: IntermediateCheck[];
  onSaveCheck: (check: IntermediateCheck) => void;
}

export const IntermediateChecksView: React.FC<IntermediateChecksViewProps> = React.memo(({
  instruments,
  checks,
  onSaveCheck
}) => {
  const { language, t } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedInstId, setSelectedInstId] = useState<number>(
    instruments.length > 0 ? instruments[0].instrument_id : 1
  );
  const [checkDate, setCheckDate] = useState(new Date().toISOString().split('T')[0]);
  const [inspectorName, setInspectorName] = useState(language === 'en' ? 'Field Inspector' : 'Inspektur Lapangan');
  const [refValue, setRefValue] = useState<number | string>(25.0);
  const [observedValue, setObservedValue] = useState<number | string>(25.05);
  const [notes, setNotes] = useState('');

  const handleNumericInput = (
    setter: React.Dispatch<React.SetStateAction<number | string>>,
    rawVal: string
  ) => {
    if (rawVal === '') {
      setter('');
      return;
    }
    let cleaned = rawVal;
    if (/^0[0-9]+/.test(rawVal)) {
      cleaned = rawVal.replace(/^0+/, '');
      if (cleaned === '') cleaned = '0';
    }
    setter(cleaned);
  };

  const selectedInst = instruments.find(i => i.instrument_id === selectedInstId);
  const numObserved = observedValue === '' ? 0 : Number(observedValue);
  const numRef = refValue === '' ? 0 : Number(refValue);
  const deviation = Number((numObserved - numRef).toFixed(4));
  
  const procTol = selectedInst?.process_tolerance || 0.5;
  const isOk = Math.abs(deviation) <= procTol;
  const isWarning = Math.abs(deviation) > procTol * 0.8 && isOk;
  const status: 'OK' | 'Warning' | 'Fail' = !isOk ? 'Fail' : isWarning ? 'Warning' : 'OK';

  const instrumentOptions: SelectOption[] = instruments.map(inst => ({
    value: String(inst.instrument_id),
    label: `${inst.tag_number} • ${inst.description}`,
    sublabel: `${inst.process_variable} (${inst.range_min}~${inst.range_max} ${inst.engineering_unit}) • Tol: ±${inst.process_tolerance} ${inst.engineering_unit}`
  }));

  const statusOptions: SelectOption[] = [
    { value: 'ALL', label: language === 'en' ? 'All Status' : 'Semua Status' },
    { value: 'OK', label: 'Status OK' },
    { value: 'Warning', label: 'Status Warning' },
    { value: 'Fail', label: 'Status Fail' },
  ];

  const handleOpenModal = (instId?: number) => {
    if (instId) setSelectedInstId(instId);
    setCheckDate(new Date().toISOString().split('T')[0]);
    setInspectorName(language === 'en' ? 'Field Inspector' : 'Inspektur Lapangan');
    setRefValue(25.0);
    setObservedValue(25.0);
    setNotes('');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (refValue === '' || observedValue === '') {
      alert(language === 'en' ? 'Reference value and observed value are required!' : 'Nilai acuan dan nilai teramati wajib diisi!');
      return;
    }

    const newCheck: IntermediateCheck = {
      check_id: Date.now(),
      instrument_id: selectedInstId,
      check_date: checkDate,
      inspector_name: inspectorName,
      reference_value: Number(refValue),
      observed_value: Number(observedValue),
      deviation: deviation,
      status: status,
      notes: notes || (language === 'en' ? 'Routine inspection' : 'Pemeriksaan rutin')
    };

    onSaveCheck(newCheck);
    setIsModalOpen(false);
  };

  const filteredChecks = checks.filter(c => {
    const inst = instruments.find(i => i.instrument_id === c.instrument_id);
    const matchesSearch = 
      (inst?.tag_number.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      (inst?.description.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      c.inspector_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.notes.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const okCount = checks.filter(c => c.status === 'OK').length;
  const warningCount = checks.filter(c => c.status === 'Warning').length;
  const failCount = checks.filter(c => c.status === 'Fail').length;
  const complianceRate = checks.length > 0 ? ((okCount / checks.length) * 100).toFixed(0) : '100';

  return (
    <div className="space-y-4 animate-fade-in w-full pb-6">
      <div className="ref-card p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#E8F4F0] border border-[#D1E6DF] flex items-center justify-center text-[#357F6B] shrink-0">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-[#192E27] uppercase tracking-tight">
              {t.intermediateChecks.title}
            </h2>
            <p className="text-xs text-[#769188] font-normal">
              {t.intermediateChecks.subtitle}
            </p>
          </div>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="btn-teal flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>{t.intermediateChecks.recordCheck}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="ref-card p-5 flex flex-col justify-between">
          <span className="text-xs text-[#769188] font-semibold">{t.intermediateChecks.totalChecks}</span>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-[#192E27] tabular-nums">{checks.length}</span>
            <span className="text-xs text-[#769188]">{t.intermediateChecks.testsConducted}</span>
          </div>
          <span className="text-[11px] text-[#769188]">{t.intermediateChecks.operationalLog}</span>
        </div>

        <div className="ref-card p-5 flex flex-col justify-between">
          <span className="text-xs text-[#769188] font-semibold">{t.intermediateChecks.complianceRate}</span>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-[#357F6B] tabular-nums">{complianceRate}%</span>
            <span className="text-xs text-[#769188]">{t.intermediateChecks.safeTolerance}</span>
          </div>
          <span className="text-[11px] text-[#769188]">{okCount} OK, {warningCount} Warning, {failCount} Fail</span>
        </div>

        <div className="ref-card p-5 flex flex-col justify-between">
          <span className="text-xs text-[#769188] font-semibold">{t.intermediateChecks.mitigationAction}</span>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-[#E26D6D] tabular-nums">{failCount}</span>
            <span className="text-xs text-[#769188]">{t.intermediateChecks.urgentCalNeeded}</span>
          </div>
          <span className="text-[11px] text-[#769188]">{t.intermediateChecks.rcmTrigger}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[220px] relative flex items-center">
              <Search className="h-4 w-4 text-[#769188] absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                placeholder={t.intermediateChecks.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-pill !pl-10 w-full"
              />
            </div>

            <div className="w-48">
              <CustomSelect
                value={statusFilter}
                onChange={setStatusFilter}
                options={statusOptions}
              />
            </div>
          </div>

          <div className="ref-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F4F7F6] text-[#769188] uppercase font-bold text-[10px] border-b border-[#E4EFEA]">
                  <tr>
                    <th className="py-3 px-4">{t.intermediateChecks.tableDate}</th>
                    <th className="py-3 px-4">{t.intermediateChecks.tableTag}</th>
                    <th className="py-3 px-4">{t.intermediateChecks.tableRef}</th>
                    <th className="py-3 px-4">{t.intermediateChecks.tableObserved}</th>
                    <th className="py-3 px-4">{t.intermediateChecks.tableDeviation}</th>
                    <th className="py-3 px-4 text-center">{t.intermediateChecks.tableStatus}</th>
                    <th className="py-3 px-4">{t.intermediateChecks.tableNotes}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4EFEA]">
                  {filteredChecks.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#769188] text-xs">
                        {t.intermediateChecks.noData}
                      </td>
                    </tr>
                  ) : (
                    filteredChecks.map(c => {
                      const inst = instruments.find(i => i.instrument_id === c.instrument_id);
                      return (
                        <tr key={c.check_id} className="table-row-hover">
                          <td className="py-3 px-4">
                            <div className="font-bold text-[#192E27] font-mono text-xs">{c.check_date}</div>
                            <div className="text-[11px] text-[#769188]">{c.inspector_name}</div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-bold text-[#192E27] font-mono">{inst?.tag_number}</div>
                            <div className="text-[11px] text-[#769188] truncate max-w-[140px]">{inst?.description}</div>
                          </td>

                          <td className="py-3 px-4 font-mono font-bold text-[#192E27]">
                            {c.reference_value} {inst?.engineering_unit}
                          </td>

                          <td className="py-3 px-4 font-mono font-bold text-[#192E27]">
                            {c.observed_value} {inst?.engineering_unit}
                          </td>

                          <td className="py-3 px-4 font-mono font-bold">
                            <span className={c.status === 'OK' ? 'text-[#357F6B]' : c.status === 'Warning' ? 'text-[#B57C12]' : 'text-[#E26D6D]'}>
                              {c.deviation > 0 ? `+${c.deviation}` : c.deviation} {inst?.engineering_unit}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              c.status === 'OK'
                                ? 'bg-[#E8F4F0] text-[#357F6B] border border-[#357F6B]/30'
                                : c.status === 'Warning'
                                ? 'bg-[#FEF8EB] text-[#B57C12] border border-[#F6B738]/40'
                                : 'bg-[#FEF1F1] text-[#E26D6D] border border-[#FCD7D7]'
                            }`}>
                              {c.status}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-[#769188] max-w-xs truncate">
                            {c.notes}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-4">
          <div className="ref-card p-5 space-y-3.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-[#192E27] tracking-tight border-b border-[#E4EFEA] pb-3">
              <Info className="w-4 h-4 text-[#357F6B]" />
              <span>{t.intermediateChecks.guideTitle}</span>
            </div>
            <div className="space-y-3 text-xs text-[#192E27] leading-relaxed">
              <p><strong>{language === 'en' ? 'Objective:' : 'Tujuan:'}</strong> {t.intermediateChecks.guideGoal}</p>
              <div className="p-3.5 rounded-2xl bg-[#E8F4F0] border border-[#D1E6DF] space-y-1.5 text-[11px]">
                <span className="font-bold text-[#192E27] block">{t.intermediateChecks.guideCriteriaTitle}</span>
                <ul className="list-disc list-inside space-y-1 text-[#192E27]">
                  <li><strong className="text-[#357F6B]">{t.intermediateChecks.guideOk}</strong></li>
                  <li><strong className="text-[#B57C12]">{t.intermediateChecks.guideWarn}</strong></li>
                  <li><strong className="text-[#E26D6D]">{t.intermediateChecks.guideFail}</strong></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 cursor-pointer" 
            onClick={() => setIsModalOpen(false)} 
          />

          <div className="relative rounded-3xl bg-white border border-[#E4EFEA] w-full max-w-xl shadow-2xl overflow-hidden my-auto animate-slide-up z-10 flex flex-col max-h-[92vh]">
            <div className="px-6 py-4.5 border-b border-[#357F6B]/20 flex items-center justify-between bg-[#357F6B] text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white">
                  <ClipboardCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-white">
                    {t.intermediateChecks.modalTitle}
                  </h3>
                  <p className="text-[11px] text-white/80">{t.intermediateChecks.modalSubtitle}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div>
                <label className="text-[11px] font-bold text-[#192E27] uppercase font-mono block mb-1.5">
                  {t.intermediateChecks.selectInstalled}
                </label>
                <CustomSelect
                  value={String(selectedInstId)}
                  onChange={(val) => setSelectedInstId(Number(val))}
                  options={instrumentOptions}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[10px] font-bold text-[#769188] uppercase font-mono block mb-1">
                    {t.intermediateChecks.testDate}
                  </label>
                  <input
                    type="date"
                    required
                    value={checkDate}
                    onChange={(e) => setCheckDate(e.target.value)}
                    className="w-full bg-[#F4F7F6] border border-[#E4EFEA] focus:border-[#357F6B] focus:bg-white rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#192E27] focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[#769188] uppercase font-mono block mb-1">
                    {t.intermediateChecks.inspector}
                  </label>
                  <input
                    type="text"
                    required
                    value={inspectorName}
                    onChange={(e) => setInspectorName(e.target.value)}
                    className="w-full bg-[#F4F7F6] border border-[#E4EFEA] focus:border-[#357F6B] focus:bg-white rounded-xl px-3 py-2 text-xs font-bold text-[#192E27] focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[#769188] uppercase font-mono block mb-1">
                    {t.intermediateChecks.refMaster} ({selectedInst?.engineering_unit}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={refValue}
                    onChange={(e) => handleNumericInput(setRefValue, e.target.value)}
                    className="w-full bg-[#F4F7F6] border border-[#E4EFEA] focus:border-[#357F6B] focus:bg-white rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#192E27] focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[#769188] uppercase font-mono block mb-1">
                    {t.intermediateChecks.observed} ({selectedInst?.engineering_unit}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={observedValue}
                    onChange={(e) => handleNumericInput(setObservedValue, e.target.value)}
                    className="w-full bg-[#F4F7F6] border border-[#E4EFEA] focus:border-[#357F6B] focus:bg-white rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#192E27] focus:outline-none transition"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#E8F4F0] border border-[#D1E6DF] space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-[11px] font-bold text-[#192E27] uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-[#357F6B]" />
                    <span>{t.intermediateChecks.evalHeader}</span>
                  </span>
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase border font-mono tracking-wider shadow-2xs ${
                    status === 'OK' 
                      ? 'bg-[#357F6B] text-white border-[#2A6957]' 
                      : status === 'Warning' 
                      ? 'bg-[#F6B738] text-[#192E27] border-[#E5A82E]' 
                      : 'bg-[#E26D6D] text-white border-[#C94D4D]'
                  }`}>
                    STATUS: {status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-[#D1E6DF]">
                  <div>
                    <span className="text-[10px] text-[#769188] uppercase font-mono block">{t.intermediateChecks.calcDeviation}</span>
                    <span className={`text-base font-black font-mono ${status === 'Fail' ? 'text-rose-600' : 'text-[#192E27]'}`}>
                      {deviation > 0 ? `+${deviation}` : deviation} {selectedInst?.engineering_unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#769188] uppercase font-mono block">{t.intermediateChecks.procTolLimit}</span>
                    <span className="text-base font-black font-mono text-[#357F6B]">
                      &plusmn;{procTol} {selectedInst?.engineering_unit}
                    </span>
                  </div>
                </div>

                <div className="text-[10px] text-[#769188] flex items-center justify-between pt-1 border-t border-[#D1E6DF]/60">
                  <span className="font-medium">
                    {status === 'OK' && t.intermediateChecks.evalOkText}
                    {status === 'Warning' && t.intermediateChecks.evalWarnText}
                    {status === 'Fail' && t.intermediateChecks.evalFailText}
                  </span>
                  <span className="font-mono font-bold text-[#357F6B]">ISO/IEC 17025 Cl. 7.7.1</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#769188] uppercase font-mono block mb-1">
                  {t.intermediateChecks.fieldNotesLabel}
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t.intermediateChecks.fieldNotesPlaceholder}
                  className="w-full bg-[#F4F7F6] border border-[#E4EFEA] focus:border-[#357F6B] focus:bg-white rounded-xl p-2.5 text-xs font-medium text-[#192E27] focus:outline-none transition"
                />
              </div>

              <div className="pt-2 border-t border-[#E4EFEA] flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-full bg-[#F4F7F6] text-xs font-semibold text-[#769188] hover:text-[#192E27] transition cursor-pointer"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="btn-teal"
                >
                  <Save className="h-4 w-4" />
                  <span>{t.intermediateChecks.saveRecord}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
});
