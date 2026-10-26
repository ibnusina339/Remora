# Rate Me dan XDAXA

Rate Me berada pada carousel setelah Pong dan sebelum Settings. Pilih Rate Game untuk salah satu dari 11 game, atau Rate Remora untuk lima pertanyaan umum. Kiri/kanan mengurangi/menambah setengah bintang; hijau melanjutkan. Minimum 0,5 dan maksimum 5 bintang. Jawaban kosong tidak dapat dilanjutkan.

## Lima aspek Remora

1. Daya tarik tampilan.
2. Keunikan Remora.
3. Kemudahan navigasi.
4. Kenyamanan kontrol.
5. Kepuasan keseluruhan.

## Saran game

Tersedia tujuh template: terlalu mudah, terlalu sulit, tempo terlalu cepat, kontrol membingungkan, petunjuk kurang jelas, tampilan sulit dibaca, dan suara kurang nyaman. Gunakan atas/bawah untuk memilih, hijau untuk menandai atau membatalkan. Maksimal dua pilihan; saran boleh kosong. Kuning menyimpan penilaian. Pesan terima kasih hanya muncul setelah penyimpanan berhasil.

## Developer

Ada lima slot pemain biasa dan satu slot developer XDAXA, selalu di baris paling bawah Profiles. XDAXA tidak mengurangi jumlah slot pemain dan tidak bisa dihapus atau diganti nama. Pilih XDAXA lalu tekan KEY3 tiga kali, dengan jeda antar ketukan kurang dari dua detik. Setelah masuk, buka Settings > Stats/Achievements dan tekan KEY3 tiga kali lagi. Pilih hasil Rating Game atau Rating Remora.

Catatan diberi nomor Rate 1, Rate 2, dan seterusnya, lengkap dengan nama serta ID profil yang memberi rating. Buka catatan lalu gunakan KEY5 untuk menggulir ke bawah dan KEY2 ke atas. Setiap penilaian tetap terpisah, tidak menimpa penilaian sebelumnya. Menghapus profil pemain tidak menghapus catatan rating asal profil itu. Penyalaan ulang mengunci akses developer lagi.

Ini kunci gestur untuk akses lokal, bukan autentikasi kriptografis. Rating dan data pemain disimpan lokal, tanpa cloud. Firmware memakai namespace feedback pada partisi userdata; simulator memakai localStorage remora-ratings. Maksimal 64 catatan. Saat penuh, catatan lama tidak ditimpa; penilaian baru menampilkan pesan gagal/arsip penuh. OTA dengan peta partisi tetap mempertahankan profil dan rating. Erase seluruh chip atau menghapus data browser dapat menghapus data.

Pesan akhir: "terimakasih sudah kasih rating buat Remora, segala masukan sangat berarti".

## Ajakan setelah game over (v0.3.0)

Ajakan opsional menunggu 2,8 detik setelah game over. Pemain bisa memilih Nanti atau menilai game yang baru dimainkan; setelah selesai kembali ke hasil game. Perlu minimal tiga game berakhir dan hasil cukup berarti: dua level selesai, skor 600, rekor baru dengan satu level selesai, atau perubahan performa konsisten seperti di bawah. Antara semua ajakan tetap perlu minimal enam game over dan sepuluh menit.

Profil bersama bisa mendapat ajakan berulang, termasuk game yang sudah dinilai. Tidak ada lagi batas sekali seumur profil/game. Setiap pengiriman menjadi Rate baru; rating sebelumnya tetap utuh, dengan nama dan ID profil yang sama.

- Ajakan berkala pada game/profil yang sama: minimal 12 game tambahan dan 30 menit sejak ajakan atau rating terakhir.
- Jalur perubahan performa: bandingkan rata-rata tiga hasil terkini dengan tiga hasil baseline pada game dan difficulty yang sama. Perlu selisih minimal 600 poin per game serta perubahan minimal dua kali lipat, ke atas maupun ke bawah. Satu hasil menyimpang tidak cukup.
- Bila perubahan terdeteksi, ajakan boleh muncul setelah enam game tambahan dan sepuluh menit. Hasil rendah juga boleh mendapat ajakan jika penurunan konsisten terdeteksi. Petunjuk perubahan kedaluwarsa setelah enam hasil berikutnya.
- Ganti difficulty memulai ulang pembandingan skor; hasil antar-game dan antar-profil tidak dicampur. Baseline menyesuaikan perlahan untuk perubahan kecil.
- Rating manual juga mengatur ulang jeda ajakan game tersebut. Rate Me manual tetap dapat digunakan kapan saja, tanpa menunggu jeda.
- XDAXA dan arsip penuh tidak memicu ajakan. Riwayat jumlah game dan baseline disimpan; timer memakai uptime sehingga direset ketika perangkat benar-benar dinyalakan ulang. Jumlah game yang diwajibkan tetap berlaku setelah restart.

**Perubahan skor hanya petunjuk untuk mengundang feedback, bukan identifikasi orang.** Pemain yang sama dapat meningkat atau menurun; pemain berbeda dapat memiliki skor mirip. Catatan tidak dilabeli sebagai individu berbeda secara otomatis.

Masuk XDAXA > Settings > RATING PROMPT. Ungu mematikan dan kuning mengaktifkan ajakan untuk semua profil. Pilihan tersimpan pada pengaturan perangkat, bukan preferensi per profil. Rate Me tetap dapat digunakan ketika ajakan dimatikan. Keluar atau Retry sebelum ajakan tampil membatalkan ajakan tertunda.
