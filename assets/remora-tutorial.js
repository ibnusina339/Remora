(function(root){
  'use strict';
  function message(step,name){return [
    `HAI ${name}! AKU MEOW. TEKAN HIJAU UNTUK KENAL REMORA.`,
    'INI CLASSIC. HAFALKAN LAMPU! TEKAN CYAN UNTUK INFO.',
    'INFO BERISI CARA MAIN. UNGU/KUNING PINDAH HALAMAN. HIJAU: LANJUT.',
    'UNGU: LEBIH MUDAH. KUNING: LEBIH SULIT. COBA TEKAN KUNING.',
    `DIFFICULTY GAME INI TERSIMPAN, ${name}. HIJAU: SETTINGS.`,
    `INI SETTINGS: SUARA, LAYAR, DAN PROFIL. TEKAN HIJAU, ${name}.`,
    `SIAP, ${name}! TAHAN TOMBOL KIRI BAWAH 2 DETIK UNTUK KELUAR GAME.`
  ][step]||'';}
  root.RemoraTutorial={message};
})(typeof window==='undefined'?globalThis:window);
