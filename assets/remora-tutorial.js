(function(root){
  'use strict';
  function message(step,name){return [
    `HAI ${name}! AYO KENAL REMORA. TEKAN HIJAU.`,
    'INI CLASSIC. HAFALKAN LAMPU! TEKAN CYAN UNTUK INFO.',
    'INFO BERISI CARA MAIN. UNGU/KUNING PINDAH HALAMAN. HIJAU: LANJUT.',
    'UNGU: LEBIH MUDAH. KUNING: LEBIH SULIT. COBA TEKAN KUNING.',
    `DIFFICULTY TERSIMPAN, ${name}. TUTUP PESAN UNTUK MELIHATNYA.`,
    `INI SETTINGS UNTUK SUARA, LAYAR, DAN PROFILMU, ${name}.`,
    `SIAP, ${name}! TAHAN TOMBOL KIRI BAWAH 2 DETIK UNTUK KELUAR GAME.`
  ][step]||'';}
  root.RemoraTutorial={message};
})(typeof window==='undefined'?globalThis:window);
