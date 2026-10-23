> Referensi desain simulator. Untuk startup, power lock, profil dan firmware terkini, ikuti README utama serta PROFILES/POWER_AND_PINS.

# REMORA simulator

Simulasi visual layar dan enam tombol berdasarkan sketsa casing REMORA. Buka `index.html` di browser. Klik sakelar **ON** untuk melihat boot, lalu klik tombol warna pada gambar atau gunakan keyboard **Q W E / A S D**. Klik sakelar lagi untuk mematikan; menyalakannya kembali akan mengulang boot.

Layar digambar langsung pada **320 × 240 piksel** (rasio 4:3). Renderer di `assets/remora-pixel-ui.js` menggambar font bitmap, ikon, adegan game, dan maskot sapi dengan koordinat piksel bulat. Antialiasing dimatikan. Halaman tetap hitam; layar memakai latar cokelat gelap pada tema **AMBER** atau biru gelap pada **OCEAN**, dengan panel dan aksen sesuai tema. Bodi konsol lurus dan terpusat; enam keyswitch RGB tersusun dua baris tanpa nomor atau tulisan. Saat tidak menyala permukaannya netral; seluruh permukaan keyswitch mengikuti warna lampu yang dikirim oleh game atau menu.

### Proporsi fisik simulator

Tampak depan mengikuti gambar CAD terbaru dan geometri STL **ReMora Reworked v22** yang tersimpan di `cad-repair/weight-estimate-v22/raw/`. Bodi **81,9 × 95,6 mm**, bingkai layar **45,6 × 35,5 mm** pada posisi **7,5 / 7 mm** dari kiri/atas. Area layar 4:3 **41,6 × 31,2 mm** dipusatkan di dalam bingkai. Enam lubang tombol **17,3 × 17,3 mm**, jarak antartombol **4 mm**, pada posisi awal **11 / 49,5 mm**. Speaker memakai 25 lubang diameter **1,75 mm**, pitch **4 mm**; grille kapsul lama dihapus.

Pada lebar bodi 630 CSS px, layar tampil native **320 × 240 CSS px**. Untuk jendela lebih sempit, seluruh bodi, layar, speaker dan tombol mengecil dengan satu skala agar proporsinya tetap sama; lubang speaker tidak disembunyikan. Resolusi canvas tetap 320×240 dan rendering tetap pixelated. Ukuran fisik pada monitor mengikuti zoom dan kepadatan layar, sehingga angka mm di atas menjelaskan model CAD, bukan kalibrasi ukuran nyata monitor.

Menu utama menampilkan **Classic → Reverse → Reaction → Light Maze → Whack-a-Light → Hot Potato → Direction Shift → Missing Key → Signal Decoder → Snake → Pong → Settings → Classic**. Endless dihapus; Speed menjadi tantangan pada Classic mulai difficulty **Hard**. Deskripsi pendek dan nomor carousel dihapus. **Ungu/kuning** memilih kiri/kanan, **cyan** membuka panduan, dan **hijau** membuka pregame atau Settings. Layar bukan layar sentuh. Gunakan tombol fisik pada gambar atau Q W E / A S D; panah kiri/kanan serta Enter juga tersedia pada menu. Saat bermain, `Escape` kembali ke menu.

Setiap game mempunyai adegan dan pose sapi sendiri. Enam menu baru memakai pose merumput, melompat, berlari, berguling, mengintip, dan mendengar musik. Sprite pilihan dipotong dari lembar gambar pengguna. `assets/prepare-cow-sprites.py` menyimpan potongan transparan dan versi native di `assets/cow-sprites/`, lalu mengekspor mask ke `assets/remora-cow-sprites.js`. Renderer mengecat mask pada piksel bulat dengan garis luar tipis. Menu mempunyai animasi lampu/radar/panah; pose dengan mata yang cocok berkedip tanpa menggeser tubuh. Pembaruan dibatasi sekitar 10 frame/detik dan berhenti saat mati atau tidur. Difficulty memakai ekspresi terpisah; baterai memakai pose duduk dan charge memakai sapi tidur.

Play membuka **pregame** berisi Difficulty dan rekor. **Ungu/kuning** memilih **Easy → Normal → Hard → Expert → Master**, **merah** kembali, dan **hijau** memulai. Pada Classic Easy/Normal, pola tumbuh dari level sebelumnya dan input tidak dibatasi waktu. Hard/Expert/Master mengganti seluruh pola setiap level, mulai dari 4/6/8 langkah, dengan waktu jawab sekitar 1.000/700/480 ms per tombol yang makin pendek. Rekor disimpan per game/difficulty. Reaction menyimpan waktu tercepat, memakai rata-rata respons untuk rangkaian Hard ke atas. Rekor versi lama disimpan; nilai baru dengan aturan lebih sulit bersaing pada record difficulty yang sama.

## Mekanik dan difficulty

Layout panel game mempertahankan susunan lama. Kotak warna kecil di dalam pad dihapus: warna utama mengisi pad secara penuh, tanpa blok atau bingkai kecil tambahan. Dekorasi tiga kotak pada menu Classic juga dihapus. Petunjuk warna tetap tersedia bila diperlukan untuk memilih tindakan, membaca kartu Direction Shift atau mengetahui target Reaction/Hot Potato. Keyboard desktop mengikuti posisi tombol **Q W E / A S D**; angka keyboard tidak digunakan sebagai tombol kontrol. Skor, level, waktu, ukuran peta dan angka yang merupakan materi Signal Decoder tetap ditampilkan sebagai data permainan.

Pada Hard/Expert/Master, susunan enam warna tombol diacak setiap level; tidak ada warna yang tetap pada tombol yang sama dari level sebelumnya. Easy/Normal mengganti susunan setiap lima level. Susunan tetap selama satu level agar preview dan jawaban konsisten. Pola Easy/Normal yang bertambah mempertahankan urutan warnanya ketika posisi tombol berubah. Kartu arah, target, dan lampu fisik simulator mengikuti susunan aktif. Decoder mempertahankan letak navigasi simetris; lampu petunjuknya mengikuti warna aktif. Whack-a-Light dan Hot Potato tetap menggunakan warna sebagai arti isyarat dengan lokasi sinyal yang berubah; hijau/merah dan aturan warna lainnya tidak ditukar artinya.

Direction Shift memakai susunan lama: panah netral di kiri, empat kartu arah di kanan, serta indikator rotasi dan cermin di atas. Angka pada kartu diganti blok 10×14 piksel yang cocok dengan lampu keyswitch tujuan. Lampu arah tersedia saat preview dan input. Pada Hard ke atas, mapping harus diingat. Rangkaian Master tetap berada dalam area petunjuk kiri agar kartu arah tidak tertutup.

### Progres setiap lima level

Difficulty yang dipilih tetap berlaku sepanjang permainan. Easy tidak otomatis berubah menjadi Hard atau memperoleh aturan baru secara mendadak. Setiap lima level, tempo atau jendela respons menjadi sekitar **6% lebih ketat**, dengan batas minimum yang bisa dimainkan. Beban tambahan seperti jumlah target/wave naik satu setiap sepuluh level; jumlah celah/kode dan panjang rangkaian arah bertambah lebih jarang, setiap lima belas level. Peta Maze menambah satu kolom atau satu baris secara bergantian setiap lima level. Header mempertahankan nama Difficulty; `TAHAP` menunjukkan progres. Rekor tetap disimpan per Difficulty pilihan.

| Game | Kenaikan bertahap |
| --- | --- |
| Classic / Reverse | Easy/Normal menambah satu langkah per level; Hard+ pola baru, panjang naik satu per dua level; tempo naik 6% setiap lima level |
| Reaction | Waktu respons turun 6% tiap tahap; satu target tambahan setiap sepuluh level, aturan GO/cermin sesuai Difficulty pilihan |
| Light Maze | Satu kolom/baris bergantian; waktu langkah turun 6%; tambahan bonus Master dan toleransi langkah berubah setiap lima belas level |
| Whack-a-Light | Wave bertambah satu setiap sepuluh level; jendela wave turun 6%, jumlah isyarat serentak sesuai Difficulty pilihan |
| Hot Potato | Satu tangkapan tambahan setiap sepuluh level; tempo sinyal naik 6%, aturan putar balik/jebakan sesuai Difficulty |
| Direction Shift | Soal bertambah setiap sepuluh level; rangkaian Master bertambah satu setiap lima belas level; waktu jawab turun 6% |
| Missing Key | Satu langkah pola tambahan setiap tiga level, satu celah tambahan setiap lima belas level; tempo naik 6% |
| Signal Decoder | Bit/invert/LSB tetap sesuai Difficulty; tambahan kode setiap lima belas level; tempo naik 6% dan waktu jawab turun 3% tiap tahap |

### Keluar cepat

**Tahan keyswitch kiri bawah dua detik** saat berada dalam game untuk kembali langsung ke menu; keyboard **Escape** keluar seketika. Setelah hampir satu detik, layar menampilkan progres tahan kiri bawah. Pelepasan lebih awal membatalkan pintasan. Tahan kuning/double tap Whack-a-Light tetap memakai durasi mekanik permainan; pintasan keluar sengaja lebih lama. Timer pintasan dibatalkan saat perangkat dimatikan, baterai kritis, atau kembali ke menu agar tidak mengganggu permainan berikutnya.

Logika sebelas game berada di `assets/remora-arcade.js`, terpisah dari renderer.

| Game | Easy / Normal | Hard | Expert / Master |
| --- | --- | --- | --- |
| Classic | Pola bertambah satu langkah | Pola baru 4+ langkah dan Speed | Pola baru 6+/8+ langkah, tempo dan batas jawab jauh lebih ketat |
| Reverse | Balik urutan terakhir ke pertama | Pola baru dan Speed | Balik urutan sekaligus cermin posisi tombol; warna mengikuti susunan aktif |
| Reaction | Satu GO hijau | Tiga GO dan GO merah jebakan | Lima GO dengan tombol cermin / tujuh GO dengan tombol sebelah; 450/320 ms |
| Light Maze | Labirin bercabang 6×4 / 7×5, peta terbuka; Normal memiliki portal | Peta 8×5, kabut setelah preview, bonus wajib, batas langkah dan waktu | Expert 9×6; Master mulai 14×9 hingga 18×12, dua sampai empat bonus wajib dan toleransi langkah lebih ketat |
| Whack-a-Light | Easy hijau/merah; Normal kelima aturan warna | Dua isyarat sekaligus | Arah ungu dapat berubah; Master tiga isyarat dan double tap lebih ketat |
| Hot Potato | Tekan target hanya saat sinyal hijau tiba | Arah berubah di tengah putaran | Target merah jebakan; Master sinyal sekitar 170 ms per node |
| Direction Shift | Mapping tetap / rotasi dengan bantuan mapping | Rotasi baru per soal; bantuan disembunyikan | Cermin arah; Master hafalkan tiga panah dari preview |
| Missing Key | Pola utuh lalu replay dengan satu celah | Dua celah pada pola lebih panjang | Tiga celah; Master replay terbalik |
| Signal Decoder | Satu kode 4 bit, angka 0–15 | Dua kode 5 bit, angka 0–31 | Tiga kode 6/7 bit, angka 0–63 / 0–127; polaritas terbalik, Master bit LSB dulu |

Whack-a-Light: **hijau tap**, **merah jangan tekan**, **biru double tap**, **kuning tahan**, **ungu tekan tetangga sesuai arah di layar**. Tahan tombol fisik dengan mouse atau tombol huruf keyboard; pelepasan terlalu dini gagal. Pada Hard ke atas, tulisan tindakan pada kotak, legenda warna di bawah layar, dan bantuan di bawah simulator dikosongkan. Data wave, skor dan waktu tetap ditampilkan. Purple memakai tetangga nyata pada baris yang sama. Reaction Master memakai tetangga kanan, atau kiri bila target sudah di ujung kanan.

Light Maze: posisi keyswitch **tengah atas untuk naik, kanan atas untuk kanan, tengah bawah untuk turun, kiri atas untuk kiri**, atau panah keyboard. Warna lampu mengikuti kondisi jalur; blok petunjuk arah pada layar mengikuti warna lampu tersebut. Setiap level memakai labirin baru dengan dinding dan persimpangan, start `S`, goal `G`, portal biru `P` dan bonus kuning `*`. LED tombol menunjukkan arah aman, dinding, portal atau bonus dari posisi sekarang. Portal memindahkan pemain sekali ke pintu keluar; bonus wajib pada Hard ke atas. Easy/Normal boleh mencoba arah yang terhalang tanpa kalah; Hard ke atas kalah bila menabrak dinding. Setelah preview, Hard ke atas menyembunyikan wilayah yang belum dijelajahi; posisi, wilayah yang sudah dikunjungi dan jalan keluar setempat tetap terlihat. Batas langkah mengikuti rute yang dapat diselesaikan melalui portal. Master dimulai dengan 126 petak, preview empat detik, dua bonus wajib dan toleransi tiga langkah. Peta tumbuh setiap lima level sampai 216 petak, bonus wajib dapat bertambah menjadi empat, toleransi turun hingga nol, dan waktu per langkah memendek sampai minimum 450 ms. Semua bonus ditempatkan di rute yang dapat dilalui tanpa dilewati portal.

Signal Decoder: ubah kode biner menjadi angka desimal, contoh `1011` = `11`. Kode dipilih dari seluruh rentang 4/5/6/7 bit, termasuk nol; empat kode terakhir tidak diulang. Masukkan jawaban pada tiga digit desimal: **tombol atas kiri/kanan (1/3) pindah digit**, **bawah kiri/kanan (4/6) kurangi/tambah angka**, **tengah atas (2) hapus**, **tengah bawah (5) konfirmasi**. Digit aktif diberi garis dan warna tombol ditampilkan di layar. Keyboard: atas/bawah mengubah digit, kiri/kanan memilih digit, Backspace menghapus dan Enter mengonfirmasi. Easy tanpa batas waktu; difficulty lain memiliki waktu per jawaban yang memperhitungkan input beberapa digit. Nada rendah/lampu biru adalah LOW; nada tinggi/lampu kuning adalah HIGH. Expert membalik arti bit; Master juga mengirim bit dari LSB. Tempo sinyal meningkat sekitar 6% dan waktu jawab memendek sekitar 3% setiap lima level, dengan batas minimum. Nada mengikuti Settings → Sound dan aturan audio browser; decoding tetap dapat dilakukan dari LED.

`assets/remora-feedback.js` memuat **15 ucapan sukses berbeda per game** (165 total). Pemilihan berputar tanpa pengulangan sampai 15 ucapan terpakai, dan posisi putarannya disimpan. Game over memilih lima tingkat respons berdasarkan skor, level selesai, dan rekor baru. Selain tiga penutup lama, tersedia **20 penutup tambahan**: masing-masing lima sarkas, iba, lucu, dan semangat. Penutup diacak dari varian yang sesuai capaian dan tidak mengulang penutup terakhir game yang sama; pilihannya disimpan. Pose hasil juga mengikuti capaian.

Settings memakai daftar seleksi dan ikon piksel untuk suara, kecerahan, tema, lampu tombol, baterai, profil, jaringan, sistem, dan statistik. Difficulty hanya ada sebelum bermain. Petunjuk tindakan memakai swatch warna di bagian bawah layar. Tema lama BLACK/GRAPHITE otomatis menjadi AMBER/OCEAN. Halaman baterai memakai satu warna aksen tema untuk bar, persentase, dan tegangan. Petunjuk navigasi mengikuti warna LED tombol yang sama.

Penyempurnaan UI: peta Maze memenuhi area permainan; ilustrasi menu menampilkan labirin dan konversi biner 4 bit. Digit aktif Decoder memakai blok terang dan penunjuk, disertai konfirmasi ketika satu kode benar. Label pada tombol fisik dan bantuan di bawah konsol mengikuti halaman yang sedang dibuka. Penghitung waktu menampilkan sisa detik dan berubah merah saat tersisa kurang dari seperempat waktu. Panah Difficulty dan petunjuk perubahan dinonaktifkan pada batas Easy/Master. Panduan dan Settings memakai panel yang konsisten untuk memisahkan baris. Efek napas yang menggeser sebagian tubuh sapi tetap dihapus; kedipan mata dipertahankan.

## Dua game arcade bertema sapi

Space Invader dihapus dari simulator atas permintaan pengguna. Carousel kini berisi sebelas game, lalu Settings.

**Snake**: ular sapi mengumpulkan rumput dengan tombol atas kiri/tengah/kanan dan tengah bawah untuk arah kiri/atas/kanan/bawah. Tubuhnya putih dengan bercak hitam tidak beraturan; ujung depan memakai kepala sapi berpiksel dengan tanduk, telinga, mata dan moncong. Pola yang sama dipakai pada preview dan permainan. Hindari pagar, batu dan tubuh sendiri. Hard ke atas menambah batu; tempo tumbuh perlahan setiap lima level.


**Pong**: gerakkan papan bercorak sapi dengan tombol atas kiri/kanan atau panah keyboard. Pantulkan bola susu melewati papan lawan untuk mencetak poin. Semua Difficulty kini memakai bola lebih cepat dan papan lebih sempit: Easy/Normal/Hard/Expert/Master memakai lebar 52/46/40/34/28 piksel, target 3/4/5/6/7 poin dan 3/3/2/2/1 nyawa. Lawan memperkirakan titik kedatangan bola setelah pantulan dinding dan menyerang ke arah yang jauh dari pemain. Bola bertambah cepat 3,5% per pantulan sampai batas kecepatan; sudut pantul dapat diarahkan dari tepi papan. Kecepatan dasar tetap naik perlahan setiap lima level. Gerak bola dibagi menjadi langkah kecil agar bola cepat tidak melewati papan tanpa terdeteksi.

Preview Pong berupa mesin arcade mini bertuliskan MOO PONG, layar dengan dua paddle dan bola bergerak, joystick, serta tombol warna. Maskot sapi dengan ekspresi siap bertanding berada di sebelahnya. Ilustrasi Pong memakai area 164×105 piksel yang sama dengan Classic, dengan ukuran maskot yang diselaraskan. Semuanya digambar langsung dengan piksel bulat. Kedua game memiliki adegan preview dan sapi sendiri, pregame, rekor per Difficulty, serta 15 ucapan sukses dan respons game over.

## Suara dan animasi mati

**Settings → Sound** memiliki tiga slider **Utama**, **BGM Menu**, dan **SFX**, masing-masing 0–100%. Tengah atas/bawah memilih slider, atas kiri/kanan mengurangi/menambah 10%, dan kiri/kanan bawah kembali. Pengaturan disimpan. Volume utama mengendalikan kedua kanal; BGM dan SFX dapat dimatikan terpisah. Musik menu merupakan melodi prosedural orisinal, berhenti saat bermain, tidur atau mati. Efek tersedia untuk navigasi, konfirmasi, boot, mati, lampu pola, langkah, jawaban benar, level selesai, game over, rumput, tembakan, benturan dan pantulan. Browser mengaktifkan audio setelah interaksi pengguna. Ini masih audio simulasi Web Audio, belum dikirim ke MAX98357 perangkat fisik.

Saat OFF ditekan, input serta timer permainan dihentikan dan lampu tombol padam. Animasi mati berlangsung sekitar **2,5 detik**: sapi dan pesan berpamitan terlihat selama 1,1 detik, lalu layar meredup perlahan dan menutup menjadi garis tipis. Efek suara mati mengikuti volume utama dan SFX. Setelah animasi, layar benar-benar hitam.

Light Maze Easy/Normal langsung masuk permainan karena peta tetap terbuka. Hanya Hard/Expert/Master yang menampilkan fase ingat peta sebelum kabut aktif.

## Easter egg: tamu kucing

Di **menu utama**, tekan keyswitch **tengah bawah lima kali berturut-turut**, dengan jeda tiap tekan tidak lebih dari 1,5 detik. Keyboard: **S S S S S**. Halaman rahasia memakai pose kucing berdiri dengan kaki dan ekor terangkat dari lembar sprite terbaru yang diberikan pengguna. Geometri kucing lama di `assets/remora-secret-cat.js` tetap disimpan sebagai arsip, tetapi tidak dimuat oleh simulator.

Tombol **kanan bawah / Enter** memainkan salah satu dari **enam potongan satu meong** dari [video pilihan pengguna](https://www.youtube.com/watch?v=_SNIchho6kM), secara acak tanpa mengulang varian yang baru dimainkan. **Kiri bawah / Escape** kembali ke game yang sebelumnya dipilih pada menu. Sumber dan waktu potongan tercatat di `assets/audio/README.md` dan `assets/audio/meow-segments.json`. Sampel PCM mono 22.050 Hz disertakan di `assets/remora-meow-sample.js` agar tetap bekerja melalui `file://`; semua mengikuti volume Master/SFX dan tidak menumpuk. Kucing ruang rahasia diperbesar sedikit, tanpa bingkai maupun latar kotak. Pintasan easter egg hanya aktif di carousel dan tidak mengubah input game.

## Pose maskot

### Tamu kucing dari lembar sprite terbaru

Pose statis dipotong transparan, dengan warna putih, hitam dan belang abu-abu tetap terpisah. `assets/prepare-cat-sprites.py` menghasilkan potongan dan mask native di `assets/cat-sprites/` serta `assets/remora-cat-sprites.js`. Sumber disimpan di `assets/cat-sprites/source-sheet.png` supaya bisa dibuat ulang setelah file clipboard sementara hilang. Semua digambar dengan koordinat piksel bulat, tanpa blur atau pergantian frame. Sapi di carousel game dan mekanik permainan tetap dipakai.

| Lokasi | Pose kucing |
| --- | --- |
| Ruang rahasia, S lima kali di menu utama | Berdiri, ekor terangkat, pose kiri atas lembar sprite |
| Settings → Profile | Menjilat kaki / grooming |
| Settings → Stats / Achievements | Duduk dengan mulut senang |
| INFO satu game acak setiap dinyalakan | Mengintip sebagian dari tepi kiri/kanan, di samping judul, tidak menutupi teks; sprite kanan dicerminkan |
| Settings → Theme | Berguling, di kanan bawah |
| Saat perangkat dimatikan | Tidur di samping sapi tidur |

Pose sapi tetap berdiri di Classic, merumput di Light Maze, lompat statis di Whack-a-Light, minum di menu Settings, duduk pada baterai, serta ekspresi pada hasil permainan. Tidak ada pergantian frame merumput, ekor, duduk–berdiri, atau melompat. Kedipan mata sederhana dari versi sebelumnya tetap tersedia pada pose yang cocok.

Strip sumber, potongan, generator, dan pratinjau animasi lama disimpan sebagai arsip di `assets/cow-animations/` dan `previews/remora-cow-animations.gif`; `assets/remora-cow-animations.js` tidak dimuat oleh simulator. Pratinjau desain aktif adalah `previews/remora-ui-polish.png`.

## TODO mekanik game tambahan

Beat Catch, Fake Signal, Pattern Hunt, Bomb Defuse, dan Sound Hunt tetap dalam backlog. Light Maze, Hot Potato, Direction Shift, Signal Decoder, Missing Key, dan tambahan Whack-a-Light sudah dapat dimainkan di simulator. Port mekanik, aset sapi, input hold/double tap, dan feedback ke firmware LVGL masih diperlukan.

## Pemeriksaan simulasi

Jalankan `node tests/ui-smoke.cjs`. Pemeriksaan mencakup sebelas game × lima difficulty, input benar/salah, deadline, hold/double tap, pergantian pola, rekor, feedback, carousel, pengaturan, boot fade, charge/tidur, dan batas piksel. `node tests/render-pixel-previews.cjs` menghasilkan gambar dari renderer yang sama. Pratinjau enam menu baru ada di `previews/remora-new-games.png` dan layar bermain di `previews/remora-gameplay.png`. Versi sebelum desain piksel disimpan di `backups/pre-pixel-redesign/`.

