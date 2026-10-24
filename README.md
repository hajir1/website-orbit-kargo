# Orbit Kargo

Hasil ekspor **OneWebForDeveloper** dalam format **HTML + CSS**, 7 halaman.

| Halaman | Alamat |
|---|---|
| Beranda | `index.html` |
| Layanan | `layanan.html` |
| Jaringan | `jaringan.html` |
| Tarif | `tarif.html` |
| Tentang | `tentang.html` |
| Wawasan | `wawasan.html` |
| Kontak | `kontak.html` |

## Cara menjalankan

Tanpa build dan tanpa dependensi.

1. Ekstrak zip, lalu buka `index.html` di peramban.
2. Untuk hosting, unggah seluruh folder ke hosting statis (Netlify, Vercel, GitHub Pages, cPanel, dll.).

Pratinjau lokal dengan server (opsional): `npx serve .` atau `python3 -m http.server`.

## Struktur

- `*.html`: satu berkas per halaman
- `assets/global.css`: variabel global (:root), pemuat font, dan gaya dasar
- `assets/<halaman>.css/.js`: gaya & skrip tiap halaman

## Library (CDN)

- **Three.js 0.186.1** (MIT): https://threejs.org/

Library dimuat dari CDN jsDelivr dengan versi terkunci (lihat `index.html` / layout). Inisialisasinya dijalankan ulang setiap pindah halaman.

## Catatan

- Variabel global (warna, ukuran, font) ada di blok `:root` CSS global. Ubah nilainya di sana untuk mengganti tema.
- Font Google dimuat lewat `@import` di CSS; font cadangan sistem dipakai selama font belum termuat.
- Formulir tidak mengirim data ke mana pun. Hubungkan ke backend atau layanan formulir Anda.
