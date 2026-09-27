import React, { useEffect, useState, useCallback } from 'react';
import { 
  CalibrationDatabase, 
  Instrument, 
  CalibrationSession, 
  IntermediateCheck 
} from './types/schema';
import { 
  loadDatabase, 
  saveInstrument, 
  deleteInstrument, 
  saveIntermediateCheck, 
  importDatabaseFromFile, 
  getStorageStatus,
  subscribeToStorage
} from './services/storageService';

import { CheckCircle2 } from 'lucide-react';
import { Sidebar, NavTab } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { InstrumentList } from './components/InstrumentList';
import { InstrumentFormModal } from './components/InstrumentFormModal';
import { CalibrationSessionModal } from './components/CalibrationSessionModal';
import { CalibrationReportView } from './components/CalibrationReportView';
import { BackupModal } from './components/BackupModal';
import { DriftAnalyticsView } from './components/DriftAnalyticsView';
import { CalibrationComparatorView } from './components/CalibrationComparatorView';
import { IntermediateChecksView } from './components/IntermediateChecksView';
import { RcmSimulator } from './components/RcmSimulator';
import { MetrologyCalculator } from './components/MetrologyCalculator';
import { ProfileView } from './components/ProfileView';
import { useLanguage } from './context/LanguageContext';

import { 
  Loader2, 
  Download, 
  Upload
} from 'lucide-react';

export const App: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const [database, setDatabase] = useState<CalibrationDatabase | null>(null);
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [selectedAnalyticsInstrumentId, setSelectedAnalyticsInstrumentId] = useState<number | null>(null);
  const [storageInfo, setStorageInfo] = useState<{
    source: string;
    lastSaved: string;
    itemCount: number;
    filePath: string;
    byteSize: number;
  } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Desktop responsive sidebar collapsed state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Selected Physical Quantity filter for Master Instrumen (synced with Sidebar and InstrumentList)
  const [selectedInstrumentPV, setSelectedInstrumentPV] = useState<string>('ALL');

  const [isInstrumentModalOpen, setIsInstrumentModalOpen] = useState(false);
  const [editingInstrument, setEditingInstrument] = useState<Instrument | null>(null);

  const [isCalibrationModalOpen, setIsCalibrationModalOpen] = useState(false);
  const [calibratingInstrument, setCalibratingInstrument] = useState<Instrument | null>(null);

  const [viewingReportInstrument, setViewingReportInstrument] = useState<Instrument | null>(null);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  useEffect(() => {
    refreshData();

    const unsubscribe = subscribeToStorage((updatedDb) => {
      setDatabase(updatedDb);
      refreshStorageInfo();
    });

    // Responsive sidebar: auto-collapse on narrow screen (< 1100px), and auto-expand when returning to full window (>= 1100px)
    let prevWidth = window.innerWidth;
    const handleResize = () => {
      const currentWidth = window.innerWidth;
      if (currentWidth < 1100 && prevWidth >= 1100) {
        setIsSidebarCollapsed(true);
      } else if (currentWidth >= 1100 && prevWidth < 1100) {
        setIsSidebarCollapsed(false);
      }
      prevWidth = currentWidth;
    };

    if (window.innerWidth < 1100) {
      setIsSidebarCollapsed(true);
    } else {
      setIsSidebarCollapsed(false);
    }
    window.addEventListener('resize', handleResize);

    return () => {
      unsubscribe();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const refreshData = async () => {
    const db = await loadDatabase();
    setDatabase(db);
    await refreshStorageInfo();
  };

  const refreshStorageInfo = async () => {
    const info = await getStorageStatus();
    setStorageInfo(info);
  };

  const showNotification = useCallback((msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3000);
  }, []);

  // Default process variable for new instrument modal
  const [modalDefaultPV, setModalDefaultPV] = useState<string>('Pressure');

  const handleAddNewInstrument = (defaultPV?: string) => {
    setEditingInstrument(null);
    setModalDefaultPV(defaultPV || (selectedInstrumentPV !== 'ALL' ? selectedInstrumentPV : 'Pressure'));
    setIsInstrumentModalOpen(true);
  };

  const handleEditInstrument = (inst: Instrument) => {
    setEditingInstrument(inst);
    setIsInstrumentModalOpen(true);
  };

  const handleSaveInstrument = async (instrument: Instrument) => {
    await saveInstrument(instrument);
    await refreshData();
    showNotification(
      language === 'en'
        ? `Instrument ${instrument.tag_number} successfully saved.`
        : `Instrumen ${instrument.tag_number} berhasil disimpan.`
    );
  };

  const handleDeleteInstrument = async (instrumentId: number) => {
    await deleteInstrument(instrumentId);
    if (viewingReportInstrument && Number(viewingReportInstrument.instrument_id) === Number(instrumentId)) {
      setViewingReportInstrument(null);
    }
    if (selectedAnalyticsInstrumentId && Number(selectedAnalyticsInstrumentId) === Number(instrumentId)) {
      setSelectedAnalyticsInstrumentId(null);
    }
    if (editingInstrument && Number(editingInstrument.instrument_id) === Number(instrumentId)) {
      setEditingInstrument(null);
      setIsInstrumentModalOpen(false);
    }
    await refreshData();
    showNotification(
      language === 'en'
        ? 'Instrument successfully removed from the system.'
        : 'Instrumen berhasil dihapus dari sistem.'
    );
  };

  const handleOpenNewCalibration = (targetInst?: Instrument) => {
    const instToCalibrate = targetInst || (database?.instruments && database.instruments.length > 0 ? database.instruments[0] : null);
    if (!instToCalibrate) {
      alert(language === 'en' ? 'Please add a master instrument first.' : 'Tambahkan instrumen master terlebih dahulu.');
      return;
    }
    setCalibratingInstrument(instToCalibrate);
    setIsCalibrationModalOpen(true);
  };

  const handleSaveCalibration = async (updatedInstrument: Instrument, newSession: CalibrationSession) => {
    await saveInstrument(updatedInstrument);
    await refreshData();
    showNotification(
      language === 'en'
        ? `Calibration session logged: ${newSession.decision_action}.`
        : `Sesi kalibrasi dicatat: ${newSession.decision_action}.`
    );
  };

  const handleSaveIntermediateCheck = async (check: IntermediateCheck) => {
    await saveIntermediateCheck(check);
    await refreshData();
    showNotification(
      language === 'en'
        ? 'Intermediate check record saved successfully.'
        : 'Verifikasi antara berhasil disimpan.'
    );
  };

  const handleViewReport = (inst: Instrument) => {
    setViewingReportInstrument(inst);
  };

  const handleExport = () => {
    setIsBackupModalOpen(true);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = async (event) => {
        if (event.target?.result) {
          const res = await importDatabaseFromFile(event.target.result as string);
          if (res.success) {
            await refreshData();
            showNotification(res.message);
          } else {
            alert(res.message);
          }
        }
      };
    }
  };


  if (!database || !storageInfo) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F8FAFC] text-slate-800">
        <div className="flex items-center gap-3 text-xs font-mono bg-white p-4 rounded-xl shadow-subtle border border-slate-200">
          <Loader2 className="h-4 w-4 animate-spin text-[#357F6B]" />
          <span className="font-semibold text-slate-900">{t.header.loading}</span>
        </div>
      </div>
    );
  }

  const criticalCount = database.instruments.filter(i => i.rcm_profile.final_classification === 'Critical').length;

  const tabTitles: Record<NavTab, { title: string; subtitle: string }> = {
    dashboard: { title: t.header.dashboardTitle, subtitle: t.header.dashboardSubtitle },
    instruments: { title: t.header.instrumentsTitle, subtitle: t.header.instrumentsSubtitle },
    drift_analytics: { title: t.header.driftTitle, subtitle: t.header.driftSubtitle },
    comparator: { title: t.header.comparatorTitle, subtitle: t.header.comparatorSubtitle },
    intermediate_checks: { title: t.header.intermediateChecksTitle, subtitle: t.header.intermediateChecksSubtitle },
    rcm_simulator: { title: t.header.rcmSimulatorTitle, subtitle: t.header.rcmSubtitle },
    metrology: { title: t.header.metrologyTitle, subtitle: t.header.metrologySubtitle },
    profile: { title: t.header.profileTitle, subtitle: t.header.profileSubtitle },
  };

  return (
    <div className="min-h-screen w-full bg-[#F4F7F6] text-slate-900 flex print:min-h-0 print:bg-white print:text-black print:block print:p-0">
      {/* Toast Notification */}
      {statusMessage && (
        <div className="fixed bottom-4 right-4 z-50 bg-[#0F172A] text-white font-medium text-xs px-3.5 py-2.5 rounded-lg shadow-popover border border-slate-700 flex items-center gap-2 animate-slide-up print:hidden">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Desktop Sidebar (Collapsible Rail) */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setViewingReportInstrument(null);
          setActiveTab(tab);
        }}
        instrumentCount={database.instruments.length}
        criticalCount={criticalCount}
        checksCount={database.intermediate_checks.length}
        onOpenNewCalibration={() => handleOpenNewCalibration()}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        instruments={database.instruments}
        activeInstrumentPVFilter={selectedInstrumentPV}
        onSelectInstrumentPVFilter={(pv) => {
          setSelectedInstrumentPV(pv);
          setActiveTab('instruments');
        }}
      />

      {/* Main Full-Screen Content Canvas */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden print:overflow-visible print:block print:w-full print:p-0"
        style={{ contain: 'layout style' }}>
        {/* ── HEADER - floating gray pill matching sidebar ── */}
        <header className="mx-3 mt-3 mb-0 px-5 py-0 flex items-center justify-between sticky top-3 z-20 print:hidden bg-[#EAECEF] border border-[#D5D9E0] rounded-[28px] shadow-sm"
          style={{ height: '56px' }}>
          {/* Left: Dynamic Section Title & Context (Clean Design) */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-sm font-black text-zinc-900 tracking-tight font-mono uppercase">
                {tabTitles[activeTab]?.title || 'Dashboard'}
              </h1>
              <span className="text-zinc-300 hidden md:inline">|</span>
              <span className="text-xs text-zinc-500 font-medium hidden md:inline truncate max-w-xs">
                {tabTitles[activeTab]?.subtitle || 'Sistem Kalibrasi RCM'}
              </span>
            </div>
          </div>

          {/* Right: Action buttons + Language switcher - white pill clusters matching sidebar */}
          <div className="flex items-center gap-2 text-xs shrink-0">
            {/* Language Switcher Pill */}
            <div className="flex items-center bg-white p-0.5 rounded-full border border-[#D5D9E0] shadow-sm">
              <button
                type="button"
                onClick={() => setLanguage('id')}
                className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  language === 'id'
                    ? 'bg-[#357F6B] text-white shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-[#EAECEF]'
                }`}
                title="Bahasa Indonesia"
              >
                <span>ID</span>
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  language === 'en'
                    ? 'bg-[#357F6B] text-white shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-[#EAECEF]'
                }`}
                title="English"
              >
                <span>EN</span>
              </button>
            </div>

            {/* Action cluster */}
            <div className="flex items-center bg-white p-0.5 rounded-full border border-[#D5D9E0] shadow-sm">
              <button
                onClick={handleExport}
                className="px-3 py-1.5 rounded-full text-zinc-700 font-semibold text-[11px] flex items-center gap-1.5 hover:bg-[#EAECEF] transition cursor-pointer"
                title={t.header.backupTooltip}
              >
                <Download className="h-3.5 w-3.5 text-zinc-600" />
                <span className="hidden sm:inline font-mono">{t.header.backup}</span>
              </button>

              <span className="w-[1px] h-4 bg-[#D5D9E0]" />

              <label className="px-3 py-1.5 rounded-full text-zinc-700 font-semibold text-[11px] flex items-center gap-1.5 hover:bg-[#EAECEF] cursor-pointer transition">
                <Upload className="h-3.5 w-3.5 text-zinc-600" />
                <span className="hidden sm:inline font-mono">{t.header.restore}</span>
                <input type="file" accept=".json" onChange={handleImport} className="hidden" />
              </label>
            </div>
          </div>
        </header>

        {/* Full-Width Fluid Main Area */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-7 pb-6 w-full print:max-w-none print:w-full print:p-0 print:m-0 print:block">
          {viewingReportInstrument ? (
            <CalibrationReportView
              instrument={viewingReportInstrument}
              onBack={() => setViewingReportInstrument(null)}
            />
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <Dashboard
                  instruments={database.instruments}
                  intermediateChecks={database.intermediate_checks}
                  onNavigateToInstruments={() => {
                    setSelectedInstrumentPV('ALL');
                    setActiveTab('instruments');
                  }}
                  onNavigateToNewCalibration={(instId) => {
                    const target = instId ? database.instruments.find(i => i.instrument_id === instId) : undefined;
                    handleOpenNewCalibration(target);
                  }}
                  onNavigateToAnalytics={(instId) => {
                    if (instId) {
                      setSelectedAnalyticsInstrumentId(instId);
                    }
                    setActiveTab('drift_analytics');
                  }}
                  onNavigateToIntermediateChecks={() => setActiveTab('intermediate_checks')}
                  onNavigateToRcmSimulator={() => setActiveTab('rcm_simulator')}
                  onSelectInstrument={(inst) => handleViewReport(inst)}
                />
              )}

              {activeTab === 'instruments' && (
                <InstrumentList
                  instruments={database.instruments}
                  onSelectInstrument={(inst) => handleViewReport(inst)}
                  onAddNewInstrument={handleAddNewInstrument}
                  onEditInstrument={handleEditInstrument}
                  onDeleteInstrument={handleDeleteInstrument}
                  onNewCalibration={(inst) => handleOpenNewCalibration(inst)}
                  onViewReport={(inst) => handleViewReport(inst)}
                  selectedPV={selectedInstrumentPV}
                  onSelectPV={(pv) => setSelectedInstrumentPV(pv)}
                />
              )}

              {activeTab === 'drift_analytics' && (
                <DriftAnalyticsView 
                  instruments={database.instruments} 
                  initialInstrumentId={selectedAnalyticsInstrumentId}
                  onSelectInstrument={(id) => setSelectedAnalyticsInstrumentId(id)}
                />
              )}

              {activeTab === 'comparator' && (
                <CalibrationComparatorView 
                  instruments={database.instruments} 
                  initialInstrumentId={selectedAnalyticsInstrumentId}
                  onSelectInstrument={(id) => setSelectedAnalyticsInstrumentId(id)}
                  onOpenNewCalibration={(inst) => handleOpenNewCalibration(inst)}
                />
              )}

              {activeTab === 'intermediate_checks' && (
                <IntermediateChecksView
                  instruments={database.instruments}
                  checks={database.intermediate_checks}
                  onSaveCheck={handleSaveIntermediateCheck}
                />
              )}

              {activeTab === 'rcm_simulator' && (
                <RcmSimulator instruments={database.instruments} />
              )}

              {activeTab === 'metrology' && (
                <MetrologyCalculator />
              )}

              {activeTab === 'profile' && (
                <ProfileView />
              )}
            </>
          )}
        </main>
      </div>

      {isInstrumentModalOpen && (
        <InstrumentFormModal
          isOpen={isInstrumentModalOpen}
          onClose={() => setIsInstrumentModalOpen(false)}
          onSave={handleSaveInstrument}
          onDelete={handleDeleteInstrument}
          initialData={editingInstrument}
          defaultProcessVariable={modalDefaultPV}
        />
      )}

      {isCalibrationModalOpen && calibratingInstrument && (
        <CalibrationSessionModal
          isOpen={isCalibrationModalOpen}
          onClose={() => setIsCalibrationModalOpen(false)}
          onSaveCalibration={handleSaveCalibration}
          instrument={calibratingInstrument}
        />
      )}

      {isBackupModalOpen && database && (
        <BackupModal
          isOpen={isBackupModalOpen}
          onClose={() => setIsBackupModalOpen(false)}
          instruments={database.instruments}
          intermediateChecks={database.intermediate_checks}
          onBackupSuccess={(res) => {
            showNotification(res.message || 'Backup database berhasil disimpan.');
          }}
        />
      )}
    </div>
  );
};

export default App;
