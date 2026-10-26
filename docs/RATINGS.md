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

Ajakan opsional menunggu 2,8 detik setelah game over. Pemain bisa memilih Nanti atau menilai game yang baru dimainkan; setelah selesai kembali ke hasil game. Muncul setelah minimal tiga game berakhir dan hasil cukup berarti (dua level selesai, skor 600, atau rekor baru dengan satu level selesai). Di antara ajakan perlu enam game over dan cooldown sepuluh menit pada sesi penyalaan yang sama. Satu profil/game hanya diminta sekali; game yang sudah dinilai, profil XDAXA, dan arsip yang penuh tidak memicu ajakan.

Masuk XDAXA > Settings > RATING PROMPT. Ungu mematikan dan kuning mengaktifkan ajakan untuk semua profil. Pilihan tersimpan pada pengaturan perangkat, bukan preferensi per profil. Rate Me tetap dapat digunakan ketika ajakan dimatikan. Keluar atau Retry sebelum ajakan tampil membatalkan ajakan tertunda.
