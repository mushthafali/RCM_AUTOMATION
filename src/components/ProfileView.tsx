import React from 'react';
import { 
  Mail, 
  FlaskConical, 
  MapPin, 
  Building2, 
  Linkedin, 
  FileText, 
  Layers, 
  GraduationCap,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import itsLogo from '../../img/ITS.webp';
import profilePhoto from '../../img/profile.webp';
import projectLogo from '../../img/logo_polos_2.webp';

export const ProfileView: React.FC = () => {
  const { language, t } = useLanguage();

  return (
    <div className="space-y-6 animate-fade-in w-full pb-10 max-w-5xl mx-auto">
      {/* 1. HERO PROFILE & IDENTITY CARD */}
      <div className="ref-card p-6 sm:p-7 bg-white border border-[#E4EFEA]">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Foto Profil Avatar */}
          <div className="shrink-0">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl border border-[#D5E5DF] shadow-xs overflow-hidden bg-[#F4F7F6]">
              <img 
                src={profilePhoto} 
                alt="Mushthafa Ali Akbar"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Nama, Jabatan, Afiliasi */}
          <div className="flex-1 space-y-2 text-center sm:text-left pt-1">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#192E27] tracking-tight">
                Mushthafa Ali Akbar
              </h1>
              <p className="text-xs sm:text-sm text-[#5D7A70] font-medium mt-1">
                {t.profile.role}
              </p>
            </div>

            <div className="flex items-center justify-center sm:justify-start gap-2.5 text-[11px] text-[#769188] pt-1.5 flex-wrap font-medium">
              <span className="flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-[#357F6B]" />
                <span>{t.profile.dept}</span>
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1">
                <FlaskConical className="w-3.5 h-3.5 text-[#357F6B]" />
                <span>{t.profile.lab}</span>
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#357F6B]" />
                <span>{t.profile.location}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN PROFILE CONTENT GRID - BALANCED 2x2 ROW ALIGNMENT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ROW 1: LEFT - Informasi Kontak (5 Cols) */}
        <div className="lg:col-span-5 ref-card p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="border-b border-[#F0F5F2] pb-3 mb-4">
              <h3 className="text-xs font-extrabold text-[#192E27] uppercase tracking-wide flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#357F6B]" />
                <span>{t.profile.contactInfo}</span>
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              {/* Email */}
              <div className="p-3 rounded-2xl bg-[#F8FAFB] border border-[#E8EFEA] flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white border border-[#D5E5DF] flex items-center justify-center text-[#357F6B] shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-[#769188] uppercase font-bold block">{t.profile.emailLabel}</span>
                  <a 
                    href="mailto:mushthafaali12@gmail.com" 
                    className="text-slate-900 font-mono font-medium hover:text-[#357F6B] transition-colors truncate block select-text"
                  >
                    mushthafaali12@gmail.com
                  </a>
                </div>
              </div>

              {/* Laboratorium */}
              <div className="p-3 rounded-2xl bg-[#F8FAFB] border border-[#E8EFEA] flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white border border-[#D5E5DF] flex items-center justify-center text-[#357F6B] shrink-0">
                  <FlaskConical className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-[#769188] uppercase font-bold block">{t.profile.labLabel}</span>
                  <span className="text-slate-900 font-medium truncate block select-text">
                    Lab. Instrumentation &amp; Control
                  </span>
                </div>
              </div>

              {/* Institusi */}
              <div className="p-3 rounded-2xl bg-[#F8FAFB] border border-[#E8EFEA] flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white border border-[#D5E5DF] flex items-center justify-center text-[#357F6B] shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-[#769188] uppercase font-bold block">{t.profile.instLabel}</span>
                  <span className="text-slate-900 font-medium block select-text">
                    {t.profile.instName}
                  </span>
                  <span className="text-[10px] text-[#769188] block select-text">
                    {t.profile.instDept}
                  </span>
                </div>
              </div>

              {/* LinkedIn */}
              <div className="p-3 rounded-2xl bg-[#F8FAFB] border border-[#E8EFEA] flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white border border-[#D5E5DF] flex items-center justify-center text-[#357F6B] shrink-0">
                  <Linkedin className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-[#769188] uppercase font-bold block">{t.profile.linkedinLabel}</span>
                  <a 
                    href="https://www.linkedin.com/in/mushthafaali" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-[#357F6B] font-mono font-medium hover:underline flex items-center gap-1 truncate select-text"
                  >
                    <span>linkedin.com/in/mushthafaali</span>
                    <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 1: RIGHT - Ringkasan Riset & Pengembangan Sistem (7 Cols) */}
        <div className="lg:col-span-7 ref-card p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="border-b border-[#F0F5F2] pb-3 mb-4">
              <h3 className="text-xs font-extrabold text-[#192E27] uppercase tracking-wide flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#357F6B]" />
                <span>{t.profile.researchSummary}</span>
              </h3>
            </div>

            <div className="space-y-3.5 text-xs text-[#4D665E] leading-relaxed select-text">
              <p>
                {t.profile.researchP1_1} <strong className="text-[#192E27]">ALITION</strong> <em>(RCM Calibration Management System)</em> {t.profile.researchP1_2} <strong className="text-[#192E27]">Mushthafa Ali Akbar</strong> {t.profile.researchP1_3} <strong className="text-[#192E27]">Laboratorium Instrumentation &amp; Control</strong>{t.profile.researchP1_4}
              </p>
              <p>
                {language === 'id' ? (
                  <>
                    Platform ini dirancang untuk mendigitalkan dan mengotomasi manajemen kalibrasi instrumen industri dengan mengadopsi metodologi <strong className="text-[#192E27]">Reliability Centered Maintenance (RCM)</strong> karya Neil Bloom. Fokus utama adalah mentransformasi sistem kalibrasi konvensional berbasis interval statis menjadi sistem manajemen kalibrasi dinamis berbasis data historis penyimpangan (<em>drift</em>) dari pembacaan <em>As-Found</em> dan <em>As-Left</em>.
                  </>
                ) : (
                  <>
                    This platform is engineered to digitize and automate industrial instrument calibration management by adopting the <strong className="text-[#192E27]">Reliability Centered Maintenance (RCM)</strong> methodology pioneered by Neil Bloom. The primary objective is transforming conventional static-interval calibration schemes into a dynamic calibration management system driven by historical drift data across <em>As-Found</em> and <em>As-Left</em> readings.
                  </>
                )}
              </p>
              <p>
                {t.profile.researchP3}
              </p>
            </div>
          </div>
        </div>

        {/* ROW 2: LEFT - Identitas Institusi & Sistem (5 Cols) */}
        <div className="lg:col-span-5 ref-card p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="border-b border-[#F0F5F2] pb-3 mb-4">
              <h3 className="text-xs font-extrabold text-[#192E27] uppercase tracking-wide flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#357F6B]" />
                <span>{t.profile.identities}</span>
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              {/* Logo ITS */}
              <div className="p-4 rounded-2xl bg-[#F8FAFB] border border-[#E8EFEA] flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border border-[#E4EFEA] flex items-center justify-center shadow-2xs mb-2.5 p-2">
                  <img 
                    src={itsLogo} 
                    alt="Logo ITS"
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-[11px] font-bold text-[#192E27]">{t.profile.itsTitle1}</span>
                <span className="text-[11px] font-bold text-[#192E27]">{t.profile.itsTitle2}</span>
                <span className="text-[9px] text-[#769188] mt-0.5">Surabaya, Indonesia</span>
              </div>

              {/* Logo Proyek RCM */}
              <div className="p-4 rounded-2xl bg-[#F8FAFB] border border-[#E8EFEA] flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border border-[#E4EFEA] flex items-center justify-center shadow-2xs mb-2.5 p-2">
                  <img 
                    src={projectLogo} 
                    alt="Logo Proyek RCM"
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-[11px] font-bold text-[#192E27]">{t.profile.rcmSysTitle1}</span>
                <span className="text-[11px] font-bold text-[#192E27]">{t.profile.rcmSysTitle2}</span>
                <span className="text-[10px] font-extrabold text-[#357F6B] tracking-wider mt-0.5">ALITION</span>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 2: RIGHT - Metodologi & Acuan Sistem (7 Cols) */}
        <div className="lg:col-span-7 ref-card p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="border-b border-[#F0F5F2] pb-3 mb-4">
              <h3 className="text-xs font-extrabold text-[#192E27] uppercase tracking-wide flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#357F6B]" />
                <span>{t.profile.references}</span>
              </h3>
            </div>

            <div className="space-y-3 text-xs select-text">
              {/* Item 1: Neil Bloom RCM */}
              <div className="p-3.5 rounded-xl bg-white border border-[#E8EFEA] flex items-start gap-3.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <strong className="text-[#192E27] block font-bold text-xs">
                    {t.profile.rcmBloomTitle}
                  </strong>
                  <span className="text-[11px] text-[#769188] leading-relaxed block mt-1">
                    {language === 'id' ? (
                      <>
                        Penerapan pohon keputusan instrumen 17-tahap RCM untuk menentukan rekomendasi interval kalibrasi adaptif: <em>Extend</em>, <em>Maintain</em>, <em>Reduce</em>, <em>Run-to-Failure</em>, atau <em>Redesign</em>.
                      </>
                    ) : (
                      <>
                        Application of the 17-step RCM instrument decision tree to determine adaptive calibration interval advisories: <em>Extend</em>, <em>Maintain</em>, <em>Reduce</em>, <em>Run-to-Failure</em>, or <em>Redesign</em>.
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* Item 2: OIML D 10 */}
              <div className="p-3.5 rounded-xl bg-white border border-[#E8EFEA] flex items-start gap-3.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <strong className="text-[#192E27] block font-bold text-xs">
                    {t.profile.oimlTitle}
                  </strong>
                  <span className="text-[11px] text-[#769188] leading-relaxed block mt-1">
                    {t.profile.oimlDesc}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

