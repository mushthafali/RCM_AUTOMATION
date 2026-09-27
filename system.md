# BLUEPRINT SISTEM APLIKASI KALIBRASI INSTRUMEN BERBASIS LOGIKA RCM (RELIABILITY CENTERED MAINTENANCE) DENGAN PENYIMPANAN LOCAL JSON

## 1. Ringkasan dan Definisi Proyek

Aplikasi ini merupakan perangkat lunak desktop Windows mandiri berformat `.exe` yang dirancang untuk mendigitalkan proses kalibrasi instrumen industri dan mengintegrasikannya dengan metodologi Reliability Centered Maintenance (RCM) karya Neil Bloom. 

Tujuan utama proyek ini adalah menggantikan sistem kalibrasi konvensional berbasis interval statis menjadi sistem manajemen kalibrasi dinamis berbasis data historis penyimpangan (*drift*). Aplikasi ini tidak membebankan teknisi dengan kalkulasi ketidakpastian metrologi laboratorium yang rumit, melainkan berfokus pada:
* Pencatatan data kalibrasi sebelum penyetelan (*As-Found*) dan setelah penyetelan (*As-Left*).
* Pelacakan pergeseran nilai ukur (*drift*) antar-periode kalibrasi secara otomatis.
* Eksekusi pohon keputusan instrumen 17-tahap RCM untuk menentukan apakah interval kalibrasi harus diperpanjang, dipertahankan, dipersingkat, dijadikan opsional (*run-to-failure*), atau memerlukan modifikasi desain.
* Penyimpanan seluruh data master dan riwayat pengujian secara offline dalam berkas lokal JSON tanpa ketergantungan pada server database eksternal.

---

## 2. Arsitektur Perangkat Lunak dan Tumpukan Teknologi (Tech Stack)

Aplikasi dibangun menggunakan kombinasi Tauri dan ekosistem frontend web modern untuk menghasilkan performa tinggi, ukuran instalasi kecil, penggunaan RAM hemat, serta tampilan antarmuka yang dinamis, halus, dan tidak kaku.

Tumpukan teknologi utama proyek mencakup 6 komponen:
* Backend Desktop: Tauri v2 berbasis bahasa Rust
* Frontend Core: React 18 dengan TypeScript dan Vite
* Styling dan UI Components: Tailwind CSS dan Shadcn UI
* Animasi dan Interaksi Dinamis: Framer Motion
* Visualisasi Data Drift: Recharts
* Format Penyimpanan Data: Berkas Local JSON murni (`serde_json` / `tauri-plugin-store`)

### Backend Tauri dan Rust
Rust bertanggung jawab mengelola operasi sistem berkas Windows secara native, menjalankan pembacaan dan penulisan berkas JSON, menangani ekspor dokumen PDF, serta mengompilasi biner menjadi file `.exe` mandiri. Memanfaatkan mesin WebView2 bawaan Windows, aplikasi menghasilkan installer berukuran 10 hingga 15 MB dengan konsumsi memori RAM berkisar antara 30 hingga 50 MB.

### Frontend React 18 dan TypeScript
React mengelola antarmuka pengguna berbasis komponen secara reaktif. TypeScript memastikan validasi tipe data yang ketat pada seluruh parameter metrologi, nilai span, error, drift, dan status logika RCM agar tidak terjadi kesalahan komputasi.

### Desain Antarmuka Tailwind CSS dan Shadcn UI
Antarmuka menerapkan tema modern dengan sudut membulat halus (*rounded-xl*), palet warna netral (*slate/zinc*), serta indikator visual berwarna hijau, kuning, dan merah untuk mengindikasikan status toleransi secara seketika.

### Animasi Framer Motion
Framer Motion memberikan transisi halus antar-halaman, animasi geser saat formulir *As-Left* terbuka, serta efek visual pada simpul pohon keputusan RCM saat mengevaluasi data instrumen.

### Visualisasi Recharts
Recharts digunakan untuk merender grafik garis interaktif yang menampilkan riwayat error pada setiap titik uji dari sesi-sesi kalibrasi terdahulu terhadap garis batas toleransi vendor dan toleransi proses.

### Mekanisme Penyimpanan Berkas JSON
Penyimpanan data lokal menggunakan berkas teks terstruktur berformat JSON (`calibration_data.json`). Sistem Rust mengimplementasikan mekanisme *atomic write*, yaitu menulis data ke berkas sementara (`calibration_data.json.tmp`) sebelum menggantikannya ke berkas utama untuk mencegah kerusakan data jika daya komputer terputus saat proses penyimpanan.

---

## 3. Struktur Skema Data Local JSON

Seluruh data master instrumen, profil parameter RCM, dan riwayat pengujian disimpan di direktori lokal pengguna:
`C:\Users\<Username>\AppData\Local\CalibrationRCM\calibration_data.json`

Untuk mode portabel (dijalankan dari flashdisk), berkas disimpan berdampingan dengan file biner:
`./data/calibration_data.json`

Struktur objek JSON dirancang memiliki 3 simpul utama:
* `metadata`: Menyimpan informasi versi aplikasi, tanggal update basis data, dan konfigurasi umum.
* `instruments`: Berisi array master instrumen beserta profil RCM dan riwayat kalibrasi lengkapnya[cite: 1, 2, 3].
* `intermediate_checks`: Berisi riwayat verifikasi antara berkala.

### Contoh Berkas Skema JSON

```json
{
  "metadata": {
    "app_version": "1.0.0",
    "last_updated": "2026-08-27T10:00:00Z",
    "organization": "PT. Indonesia Bersih Cemerlang"
  },
  "instruments": [
    {
      "instrument_id": 1,
      "tag_number": "PT-303",
      "description": "Reactor Vessel Pressure Transmitter",
      "location": "Production Building Area A",
      "process_variable": "Pressure",
      "range_min": 0.0,
      "range_max": 50.0,
      "engineering_unit": "psig",
      "process_tolerance": 0.3,
      "vendor_tolerance_percent": 0.25,
      "current_interval_months": 12,
      "next_due_date": "2027-02-15",
      "created_at": "2025-02-15T08:00:00Z",
      "rcm_profile": {
        "is_functional": false,
        "triggers_operator_action": true,
        "is_redundant": false,
        "indication_comparison_possible": false,
        "acceptable_drift_consequence": false,
        "final_classification": "Critical"
      },
      "calibration_history": [
        {
          "calibration_id": 101,
          "calibration_date": "2025-02-15",
          "technician_name": "Ahmad",
          "calibrator_standard_id": "CAL-STD-PRESS-01",
          "calibration_type": "Field",
          "environment_temperature": 24.0,
          "environment_humidity": 55.0,
          "as_found_status": "Pass",
          "as_left_status": "Not Adjusted",
          "decision_action": "MAINTAIN",
          "previous_interval_months": 12,
          "recommended_interval_months": 12,
          "notes": "Kalibrasi awal normal",
          "data_points": [
            {
              "percent_span": 0.0,
              "standard_input": 0.0,
              "as_found_reading": 0.02,
              "as_found_error": 0.02,
              "as_found_error_percent": 0.04,
              "as_left_reading": null,
              "as_left_error": null,
              "as_left_error_percent": null,
              "previous_error": 0.0,
              "calculated_drift": 0.02,
              "calculated_drift_percent": 0.04
            },
            {
              "percent_span": 50.0,
              "standard_input": 25.0,
              "as_found_reading": 25.05,
              "as_found_error": 0.05,
              "as_found_error_percent": 0.1,
              "as_left_reading": null,
              "as_left_error": null,
              "as_left_error_percent": null,
              "previous_error": 0.0,
              "calculated_drift": 0.05,
              "calculated_drift_percent": 0.1
            },
            {
              "percent_span": 100.0,
              "standard_input": 50.0,
              "as_found_reading": 50.08,
              "as_found_error": 0.08,
              "as_found_error_percent": 0.16,
              "as_left_reading": null,
              "as_left_error": null,
              "as_left_error_percent": null,
              "previous_error": 0.0,
              "calculated_drift": 0.08,
              "calculated_drift_percent": 0.16
            }
          ]
        },
        {
          "calibration_id": 102,
          "calibration_date": "2026-02-15",
          "technician_name": "Ahmad",
          "calibrator_standard_id": "CAL-STD-PRESS-01",
          "calibration_type": "Field",
          "environment_temperature": 24.5,
          "environment_humidity": 58.0,
          "as_found_status": "Pass",
          "as_left_status": "Not Adjusted",
          "decision_action": "EXTEND",
          "previous_interval_months": 12,
          "recommended_interval_months": 18,
          "notes": "Drift stabil di bawah toleransi vendor 0.25%",
          "data_points": [
            {
              "percent_span": 0.0,
              "standard_input": 0.0,
              "as_found_reading": 0.03,
              "as_found_error": 0.03,
              "as_found_error_percent": 0.06,
              "as_left_reading": null,
              "as_left_error": null,
              "as_left_error_percent": null,
              "previous_error": 0.02,
              "calculated_drift": 0.01,
              "calculated_drift_percent": 0.02
            },
            {
              "percent_span": 50.0,
              "standard_input": 25.0,
              "as_found_reading": 25.07,
              "as_found_error": 0.07,
              "as_found_error_percent": 0.14,
              "as_left_reading": null,
              "as_left_error": null,
              "as_left_error_percent": null,
              "previous_error": 0.05,
              "calculated_drift": 0.02,
              "calculated_drift_percent": 0.04
            },
            {
              "percent_span": 100.0,
              "standard_input": 50.0,
              "as_found_reading": 50.09,
              "as_found_error": 0.09,
              "as_found_error_percent": 0.18,
              "as_left_reading": null,
              "as_left_error": null,
              "as_left_error_percent": null,
              "previous_error": 0.08,
              "calculated_drift": 0.01,
              "calculated_drift_percent": 0.02
            }
          ]
        }
      ]
    }
  ],
  "intermediate_checks": [
    {
      "check_id": 1,
      "instrument_id": 1,
      "check_date": "2026-05-20",
      "inspector_name": "Budi",
      "reference_value": 25.0,
      "observed_value": 25.05,
      "deviation": 0.05,
      "status": "OK",
      "notes": "Pemeriksaan titik tengah normal"
    }
  ]
}