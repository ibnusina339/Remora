# Rev K2: pin dan software lock

Referensi: `hardware/REMORA_Schematic_Rev_K2_A4.pdf`, khususnya halaman 3 dan 9. PDF sumber dipertahankan apa adanya.

| Fungsi | GPIO / sambungan |
| --- | --- |
| KEY1, KEY2, KEY3 | 1, 2, 3 |
| KEY4, KEY5, KEY6 | 4, 6, 7 |
| ADC baterai | GPIO0, pembagi 100 kΩ / 47 kΩ, rasio 147/47 |
| USB_SENSE | GPIO8, input saja, LOW saat USB charger hadir |
| HOLD | GPIO14 HIGH mempertahankan catu utama |
| PER_EN | GPIO15 HIGH menghidupkan rail periferal |
| AUDIO_PWM | GPIO16 → filter → PAM8302A |
| Motor getar | GPIO17 → input driver motor |
| TFT CLK, MOSI, DC, RST | 18, 19, 20, 5 |
| TFT CS | GND, konfigurasi CS = -1 |
| Enam SK6812 MINI-E | GPIO23, dapat diubah lewat menuconfig |

KEY1–6 aktif LOW dengan pull-up internal. Susunan fisik: KEY1/2/3 di atas, KEY4/5/6 di bawah. Nomor ini hanya identitas teknis dokumentasi; UI memakai warna dan posisi.

GPIO8 tidak dipakai mengendalikan LED bawaan SuperMini. Pastikan letak pad **GPIO23** pada revisi board asli; skema tidak menetapkan koordinat fisik pad. Validasi ambang data SK6812 pada catu 5 V juga diperlukan. TFT adalah ST7789V GMT020-03-SD landscape 320×240. Orientasi/inversi bisa diatur lewat menuconfig.

## Transisi daya

| Kondisi | Respons |
| --- | --- |
| Standby, baterai cukup | KEY1 + KEY3 tepat dua detik membuka permainan; tombol lain harus dilepas |
| Baterai ≤5% | Simpan/pause, pemberitahuan dua detik, lalu standby; pulih minimal 10% |
| USB hadir dan baterai ≥80% | Simpan/pause, CABUT USB dua detik, lalu standby; cabut USB untuk melepas latch |
| USB baru dipasang saat standby | Popup status/perkiraan baterai dua detik, lalu standby |
| Standby + USB hadir + KEY1 saja dua detik | Persentase tampil lima detik, lalu standby; satu hold tidak mengulang popup |
| KEY1 saja tanpa USB | Tidak membuka layar/game |
| Tegangan kritis terkonfirmasi | Lepas HOLD untuk cutoff; default 3,2 V, harus dikalibrasi |

Software lock pada 80% **tidak memutus pengisian TP4056**. USB_SENSE hanya menunjukkan USB charger hadir, bukan bukti arus pengisian. Persentase adalah perkiraan dari tegangan LiPo, bisa bergeser saat dibebani atau dicas.

Standby menggunakan **light sleep**, HOLD tetap HIGH dan ditahan GPIO hold. PER_EN LOW, keluaran periferal LOW. Wake USB memakai level berlawanan dengan kondisi saat tidur untuk mencegah wake loop. Timer membaca baterai berkala; hold tombol dipantau lebih sering.

Ini standby logis, bukan memutus S0. Jika **S0 OFF / catu benar-benar hilang**, ESP32 tidak dapat merespons KEY1 atau USB. Tidak ada saklar mekanik tambahan pada rancangan software ini.

## Validasi perangkat pertama

Uji HOLD/PER_EN, USB_SENSE aktif LOW, keenam tombol, kalibrasi ADC terhadap multimeter, orientasi TFT pada 10 MHz, LED dan audio sebelum menaikkan SPI. Pin strapping dan bentuk pad board asli harus dicocokkan dengan skema. Binary berhasil dibangun tidak membuktikan rangkaian fisik sudah diuji.
