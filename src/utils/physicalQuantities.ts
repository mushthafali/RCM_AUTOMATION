/**
 * Physical Quantities & Engineering Units Catalog for Industrial Calibration
 * Comprehensive library covering all standard physical measurement domains.
 */

export interface PhysicalQuantityCategory {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  defaultUnit: string;
  units: string[];
}

export const PHYSICAL_QUANTITIES: PhysicalQuantityCategory[] = [
  {
    id: 'Pressure',
    name: 'Tekanan (Pressure)',
    nameEn: 'Pressure',
    description: 'Tekanan gauge, absolut, diferensial, dan vakum',
    defaultUnit: 'psig',
    units: ['psig', 'bar', 'mbar', 'kPa', 'MPa', 'psi', 'kg/cm²', 'inH2O', 'mmHg', 'torr', 'Pa', 'atm']
  },
  {
    id: 'Temperature',
    name: 'Suhu / Temperatur (Temperature)',
    nameEn: 'Temperature',
    description: 'Sensor termal (RTD, Termokopel, Thermistor, Bimetal)',
    defaultUnit: '°C',
    units: ['°C', '°F', 'K', '°R']
  },
  {
    id: 'Weight',
    name: 'Massa / Beban (Weight / Mass / Force)',
    nameEn: 'Weight / Force',
    description: 'Timbangan, load cell, dynamometer, sensor gaya',
    defaultUnit: 'kg',
    units: ['kg', 'g', 'mg', 'ton', 'lb', 'oz', 'N', 'kN', 'lbf', 'kgf']
  },
  {
    id: 'Flow',
    name: 'Aliran / Debit (Flow)',
    nameEn: 'Flow',
    description: 'Flowmeter volumetrik, massa, dan elektromagnetik',
    defaultUnit: 'm³/h',
    units: ['m³/h', 'L/min', 'L/h', 'L/s', 'gpm', 'scfm', 'kg/h', 'ton/h', 'mL/min', 'm³/s']
  },
  {
    id: 'Level',
    name: 'Tingkat / Level (Level)',
    nameEn: 'Level',
    description: 'Transmitter level ultrasonik, radar, DP level, float',
    defaultUnit: '%',
    units: ['%', 'mm', 'cm', 'm', 'inch', 'ft']
  },
  {
    id: 'Electrical',
    name: 'Kelistrikan & Sinyal (Electrical / Signal)',
    nameEn: 'Electrical / Signal',
    description: 'Transduser arus, tegangan, resistansi, frekuensi',
    defaultUnit: 'mA',
    units: ['mA', 'A', 'µA', 'V', 'mV', 'µV', 'kV', 'Ω', 'kΩ', 'MΩ', 'Hz', 'kHz', 'MHz']
  },
  {
    id: 'Analytical',
    name: 'Analitikal & Kimiawi (Analytical / Chemical)',
    nameEn: 'Analytical / Chemical',
    description: 'Sensor pH, konduktivitas, DO, turbidity, gas detector',
    defaultUnit: 'pH',
    units: ['pH', 'µS/cm', 'mS/cm', 'ppm', 'ppb', '% vol', 'mg/L', 'NTU', 'mg/m³', '% LEL']
  },
  {
    id: 'Dimensional',
    name: 'Dimensi & Mekanik (Dimensional / Torque / Speed)',
    nameEn: 'Dimensional / Mechanical',
    description: 'Micrometer, dial gauge, sensor torsi, tachometer',
    defaultUnit: 'mm',
    units: ['mm', 'µm', 'cm', 'm', 'inch', 'mil', 'Nm', 'Ncm', 'kgf.m', 'lbf.ft', 'rpm', 'rad/s']
  },
  {
    id: 'Custom',
    name: 'Parameter Kustom (Custom Parameter)',
    nameEn: 'Custom Parameter',
    description: 'Tentukan parameter dan satuan rekayasa kustom',
    defaultUnit: 'unit',
    units: ['unit', 'custom']
  }
];

export const getCategoryById = (id: string): PhysicalQuantityCategory => {
  return PHYSICAL_QUANTITIES.find(cat => cat.id.toLowerCase() === (id || '').toLowerCase()) || PHYSICAL_QUANTITIES[0];
};

export const getUnitsForCategory = (categoryId: string): string[] => {
  const cat = getCategoryById(categoryId);
  return cat.units;
};

export interface PVMetadata {
  id: string;
  label: string;
  color: string;
  bg: string;
  iconName: 'Gauge' | 'Thermometer' | 'Scale' | 'Droplets' | 'Waves' | 'Zap' | 'FlaskConical' | 'Ruler' | 'SlidersHorizontal';
}

export const getPVMetadata = (pv: string): PVMetadata => {
  const lower = (pv || '').toLowerCase().trim();
  if (lower.includes('press') || lower.includes('tekanan')) {
    return { id: 'Pressure', label: 'Pressure', color: '#357F6B', bg: '#E8F4F0', iconName: 'Gauge' };
  }
  if (lower.includes('temp') || lower.includes('suhu') || lower.includes('term')) {
    return { id: 'Temperature', label: 'Temperature', color: '#D9534F', bg: '#FDF2F2', iconName: 'Thermometer' };
  }
  if (lower.includes('weight') || lower.includes('berat') || lower.includes('massa') || lower.includes('load') || lower.includes('beban')) {
    return { id: 'Weight', label: 'Weight / Mass', color: '#F6B738', bg: '#FEF8EB', iconName: 'Scale' };
  }
  if (lower.includes('flow') || lower.includes('aliran') || lower.includes('debit')) {
    return { id: 'Flow', label: 'Flow', color: '#0EA5E9', bg: '#E0F2FE', iconName: 'Droplets' };
  }
  if (lower.includes('level') || lower.includes('tingkat') || lower.includes('ketinggian') || lower.includes('permukaan')) {
    return { id: 'Level', label: 'Level', color: '#6366F1', bg: '#EEF2FF', iconName: 'Waves' };
  }
  if (lower.includes('elect') || lower.includes('listrik') || lower.includes('volt') || lower.includes('curr') || lower.includes('arus') || lower.includes('sinyal')) {
    return { id: 'Electrical', label: 'Electrical', color: '#EAB308', bg: '#FEFCE8', iconName: 'Zap' };
  }
  if (lower.includes('analy') || lower.includes('kimia') || lower.includes('ph') || lower.includes('gas')) {
    return { id: 'Analytical', label: 'Analytical', color: '#10B981', bg: '#ECFDF5', iconName: 'FlaskConical' };
  }
  if (lower.includes('dimen') || lower.includes('torsi') || lower.includes('speed') || lower.includes('rpm') || lower.includes('panjang') || lower.includes('jarak')) {
    return { id: 'Dimensional', label: 'Dimensional', color: '#8B5CF6', bg: '#F5F3FF', iconName: 'Ruler' };
  }
  return { id: 'Custom', label: pv || 'Proses', color: '#357F6B', bg: '#E8F4F0', iconName: 'SlidersHorizontal' };
};

