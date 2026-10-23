# Profil lokal dan First Login

REMORA menyimpan **maksimal lima profil di flash ESP32-C6**, tanpa akun, GitHub token, Supabase, atau cloud. Tidak membutuhkan Wi-Fi untuk menyimpan atau berpindah pemain.

Setiap profil memuat nama, rekor semua game pada lima Difficulty, statistik bermain, status tutorial, pilihan Difficulty per game, volume utama/BGM/SFX, kecerahan, tema dan intensitas LED. SPI clock adalah pengaturan perangkat, tidak ikut berpindah profil.

## Pemain baru

1. Settings → First Login → konfirmasi.
2. REMORA menyimpan penanda lalu masuk standby setelah **tiga detik**.
3. Nyalakan kembali dengan menahan kiri atas + kanan atas dua detik.
4. Buat **profil baru** dengan nama maksimal tujuh karakter.
5. Tutorial menyapa nama itu, mengenalkan Classic, INFO, Difficulty dan Settings.

Profil lama tetap tersimpan. Saat kelima slot terisi, konfirmasi First Login ditolak dan layar meminta menghapus satu profil lewat Settings → Profiles. Menghapus profil memerlukan konfirmasi; hanya data profil pilihan yang dihapus. Menambah dari slot kosong juga membuka penamaan dan tutorial.

Tutorial menggunakan kotak dialog dengan teks muncul bertahap. Pendampingnya kucing duduk biasa **tanpa lidah**. Tekan hijau saat teks belum selesai untuk menampilkan seluruh pesan. Tombol berwarna yang disebutkan pada dialog melanjutkan latihan. Pintasan rahasia: tahan **kiri bawah + kanan bawah / KEY4 + KEY6 selama tiga detik**. Pintasan hanya berlaku saat tutorial.

Pada firmware, picker nama memakai ungu/kuning untuk kelompok karakter, cyan/biru untuk karakter sebelumnya/berikutnya, merah untuk hapus, hijau untuk tambah. **Tahan hijau untuk menyimpan**. Simulator memakai picker tujuh kotak; hijau menyimpan nama.

## Ketahanan data saat update

Data berada di partisi NVS `userdata` tersendiri, alamat `0x3e0000`, ukuran 64 KiB. Dua slot aplikasi OTA tidak tumpang tindih dengannya. Update OTA hanya menulis slot aplikasi yang tidak aktif. Penyimpanan menggunakan schema version dan pembacaan nilai bawaan untuk field baru. Tidak ada perintah otomatis menghapus NVS ketika inisialisasi gagal.

Pergantian, penamaan, penghapusan profil dan First Login langsung disimpan; perubahan biasa dikumpulkan maksimal lima detik dan disimpan sebelum standby. Jangan memutus baterai saat data sedang ditulis.

**Erase seluruh chip, perubahan peta partisi, atau kerusakan flash tetap dapat menghapus data.** Karena cloud dibatalkan, tidak ada pemulihan otomatis dari internet. Update memakai peta partisi ini dan jangan menjalankan `erase-flash`.

Simulator menyimpan profil di `localStorage` browser. Data browser tidak otomatis dipindahkan ke perangkat. Profil lama simulator dimigrasikan menjadi slot pertama tanpa menghapus rekor.
