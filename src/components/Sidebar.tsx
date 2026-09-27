import React, { useMemo } from 'react';
import { 
  Sparkles,
  LayoutDashboard, 
  Layers, 
  TrendingUp, 
  ClipboardCheck, 
  GitBranch, 
  Calculator, 
  User, 
  Minus,
  ChevronRight,
  ChevronLeft,
  Gauge,
  Thermometer,
  Scale,
  Droplets,
  Waves,
  Zap,
  FlaskConical,
  Ruler,
  SlidersHorizontal,
  GitCompare
} from 'lucide-react';
import { Instrument } from '../types/schema';
import { PHYSICAL_QUANTITIES } from '../utils/physicalQuantities';
import { useLanguage } from '../context/LanguageContext';

export type NavTab = 
  | 'dashboard'
  | 'instruments'
  | 'drift_analytics'
  | 'comparator'
  | 'intermediate_checks'
  | 'rcm_simulator'
  | 'metrology'
  | 'profile';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  instrumentCount: number;
  criticalCount: number;
  checksCount: number;
  onOpenNewCalibration: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  instruments?: Instrument[];
  activeInstrumentPVFilter?: string;
  onSelectInstrumentPVFilter?: (pv: string) => void;
}

const getPVSubItemIcon = (pv: string, className = "w-3.5 h-3.5") => {
  switch (pv) {
    case 'Pressure': return <Gauge className={className} />;
    case 'Temperature': return <Thermometer className={className} />;
    case 'Weight': return <Scale className={className} />;
    case 'Flow': return <Droplets className={className} />;
    case 'Level': return <Waves className={className} />;
    case 'Electrical': return <Zap className={className} />;
    case 'Analytical': return <FlaskConical className={className} />;
    case 'Dimensional': return <Ruler className={className} />;
    case 'Custom': return <SlidersHorizontal className={className} />;
    case 'ALL':
    default:
      return <Layers className={className} />;
  }
};

export const Sidebar: React.FC<SidebarProps> = React.memo(({
  activeTab,
  onSelectTab,
  instrumentCount,
  criticalCount: _criticalCount,
  checksCount,
  isCollapsed,
  onToggleCollapse,
  instruments,
  activeInstrumentPVFilter = 'ALL',
  onSelectInstrumentPVFilter
}) => {
  const { language, t } = useLanguage();

  const instrumentSubItems = useMemo(() => [
    { id: 'inst_all', label: t.nav.allInstruments, pv: 'ALL', count: instrumentCount },
    ...PHYSICAL_QUANTITIES.map(cat => {
      const count = instruments 
        ? instruments.filter(i => (i.process_variable || '').toLowerCase() === cat.id.toLowerCase()).length 
        : 0;
      return {
        id: `inst_pv_${cat.id}`,
        label: language === 'en' ? (cat.nameEn || cat.id) : (cat.name.split(' (')[0] || cat.name),
        pv: cat.id,
        count
      };
    })
  ], [t, language, instrumentCount, instruments]);

  const navItems = useMemo(() => [
    {
      id: 'dashboard' as NavTab,
      label: t.nav.dashboard,
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'instruments' as NavTab,
      label: t.nav.instruments,
      icon: Layers,
      badge: instrumentCount.toString(),
      subItems: instrumentSubItems
    },
    {
      id: 'drift_analytics' as NavTab,
      label: t.nav.driftAnalytics,
      icon: TrendingUp,
      badge: null,
    },
    {
      id: 'comparator' as NavTab,
      label: t.nav.comparator,
      icon: GitCompare,
      badge: null,
    },
    {
      id: 'intermediate_checks' as NavTab,
      label: t.nav.intermediateChecks,
      icon: ClipboardCheck,
      badge: checksCount > 0 ? checksCount.toString() : null,
      hasNotification: checksCount > 0,
    },
    {
      id: 'rcm_simulator' as NavTab,
      label: t.nav.rcmSimulator,
      icon: GitBranch,
      badge: null,
    },
    {
      id: 'metrology' as NavTab,
      label: t.nav.metrology,
      icon: Calculator,
      badge: null,
    },
    {
      id: 'profile' as NavTab,
      label: t.nav.profile,
      icon: User,
      badge: null,
    }
  ], [t, instrumentCount, checksCount, instrumentSubItems]);

  return (
    <aside
      className={`shrink-0 my-3 ml-3 sticky top-3 select-none print:hidden z-30 flex flex-col ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
      style={{ height: 'calc(100vh - 1.5rem)', transition: 'width 0.25s cubic-bezier(0.16, 1, 0.3, 1)', willChange: 'width' }}
    >
      {/* ── COLLAPSED RAIL VIEW (Exact replica of Leftmost column in reference image) ── */}
      {isCollapsed ? (
        <div className="w-full h-full bg-[#EAECEF] border border-[#D5D9E0] rounded-[32px] shadow-sm flex flex-col items-center py-4 relative">
          {/* Top Star/Sparkle Brand Mark */}
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-900 mb-6 shrink-0">
            <Sparkles className="w-5 h-5 fill-current stroke-none" />
          </div>

          {/* Navigation Icons Column */}
          <div className="flex-1 flex flex-col items-center space-y-3 w-full px-2 overflow-y-auto overflow-x-hidden no-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <div key={item.id} className="relative group flex flex-col items-center w-full">
                  <button
                    onClick={() => {
                      onSelectTab(item.id);
                    }}
                    className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-white text-zinc-900 shadow-sm'
                        : 'text-zinc-600 hover:text-zinc-900 hover:bg-black/[0.04]'
                    }`}
                    title={item.label}
                  >
                    <Icon className="w-4 h-4 stroke-[2]" />

                    {/* Pink/Rose Notification Dot (like Messages in reference) */}
                    {item.hasNotification && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-pink-500 border-2 border-[#EAECEF]" />
                    )}
                  </button>

                  {/* Vertical Line with Center Dot Indicator directly below Active Icon (Signature from reference) */}
                  {isActive && (
                    <div className="w-[1.5px] h-9 bg-zinc-400/40 relative flex items-center justify-center my-1 animate-fade-in">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                    </div>
                  )}

                  {/* Sleek Tooltip Popover on Hover */}
                  <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#18181B] text-white text-xs font-medium rounded-xl shadow-xl whitespace-nowrap z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <span>{item.label}</span>
                    {item.badge && item.badge !== '+' && (
                      <span className="ml-1.5 text-[10px] font-mono text-zinc-400 bg-white/10 px-1.5 py-0.2 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Expand Notch Button on Right Edge */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse();
            }}
            title={language === 'en' ? 'Expand Menu' : 'Perluas Menu'}
            className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white border border-[#D5D9E0] shadow-md flex items-center justify-center text-zinc-700 hover:text-zinc-900 hover:scale-110 transition cursor-pointer z-40"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* ── EXPANDED MENU VIEW ── */
        <div className="w-full h-full bg-[#EAECEF] border border-[#D5D9E0] rounded-[32px] shadow-sm flex flex-col p-4 relative">
          {/* Collapse Notch Button - Mid-right edge, identical position to collapsed expand notch */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse();
            }}
            title={language === 'en' ? 'Collapse Menu' : 'Kecilkan Menu'}
            className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white border border-[#D5D9E0] shadow-md flex items-center justify-center text-zinc-700 hover:text-zinc-900 hover:scale-110 transition cursor-pointer z-40"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Header with Sparkle Icon and Title 'Menu' */}
          <div className="flex items-center gap-2.5 px-2 pt-1 pb-4 shrink-0">
            <Sparkles className="w-5 h-5 text-zinc-900 fill-current stroke-none" />
            <span className="font-extrabold text-base text-zinc-900 tracking-tight">Menu</span>
          </div>

          {/* Nav Items List */}
          <div className="flex-1 space-y-1 overflow-y-auto pr-1 no-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <div key={item.id} className="space-y-1">
                  {/* Main Tab Button */}
                  {isActive ? (
                    /* Active Main Item: Bold Dark Capsule Pill with minus '-' toggle */
                    <button
                      onClick={() => onSelectTab(item.id)}
                      className="w-full bg-[#18181B] text-white rounded-full px-4 py-2.5 shadow-xs flex items-center justify-between text-xs font-semibold cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <Icon className="w-4 h-4 shrink-0 stroke-[2]" />
                        <span className="truncate">{item.label}</span>
                      </div>
                      <Minus className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
                    </button>
                  ) : (
                    /* Inactive Main Item: Clean, minimal text with optional badge */
                    <button
                      onClick={() => {
                        onSelectTab(item.id);
                      }}
                      className="w-full px-3.5 py-2 rounded-2xl flex items-center justify-between text-xs font-medium text-zinc-700 hover:text-zinc-900 hover:bg-black/[0.03] transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <div className="relative">
                          <Icon className="w-4 h-4 shrink-0 text-zinc-500 group-hover:text-zinc-800 transition-colors" />
                          {item.hasNotification && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-pink-500" />
                          )}
                        </div>
                        <span className="truncate">{item.label}</span>
                      </div>

                      {/* Pill/Circle Badge or Plus */}
                      {item.badge && (
                        item.badge === '+' ? (
                          <span className="text-zinc-400 font-bold text-sm leading-none">+</span>
                        ) : (
                          <span className="w-5 h-5 rounded-full bg-[#18181B] text-white font-mono text-[10.5px] font-bold flex items-center justify-center">
                            {item.badge}
                          </span>
                        )
                      )}
                    </button>
                  )}

                  {/* Sub-tree Hierarchy for Master Instrumen (with vertical line connector) */}
                  {isActive && item.subItems && (
                    <div className="border-l-2 border-zinc-300 ml-6 pl-3.5 py-1 space-y-0.5">
                      {item.subItems.map((sub) => {
                        const subPv = (sub as any).pv;
                        const subCount = (sub as any).count;
                        const isSubActive = activeInstrumentPVFilter === 'ALL' || !activeInstrumentPVFilter
                          ? (sub.id === 'inst_all' || subPv === 'ALL')
                          : subPv === activeInstrumentPVFilter;

                        return (
                          <button
                            id={`sub_item_${sub.id}`}
                            key={sub.id}
                            onClick={() => {
                              onSelectTab('instruments');
                              if (onSelectInstrumentPVFilter) {
                                onSelectInstrumentPVFilter(subPv || 'ALL');
                              }
                            }}
                            className={`w-full text-left transition-colors duration-150 flex items-center gap-2 text-xs cursor-pointer rounded-full px-3 py-1.5 border ${
                              isSubActive
                                ? 'bg-white shadow-xs font-semibold text-zinc-900 border-black/5'
                                : 'border-transparent font-medium text-zinc-600 hover:text-zinc-900 hover:bg-black/[0.03]'
                            }`}
                          >
                            {getPVSubItemIcon(subPv || 'ALL', `w-3.5 h-3.5 shrink-0 ${isSubActive ? 'text-zinc-900' : 'text-zinc-400'}`)}
                            <span className="truncate">{sub.label}</span>
                            {typeof subCount === 'number' && subCount > 0 && (
                              <span className={`ml-auto text-[10px] font-mono px-1.5 py-0.2 rounded-full shrink-0 ${
                                isSubActive ? 'bg-zinc-200/80 text-zinc-900 font-bold' : 'text-zinc-400 bg-black/[0.04]'
                              }`}>
                                {subCount}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
});
