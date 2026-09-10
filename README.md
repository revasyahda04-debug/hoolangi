# Arabic Gesture Versus v1.0.3

Static web game 1 vs 1 untuk menyusun kalimat bahasa Arab dengan gesture tangan menggunakan MediaPipe.

## Aturan permainan v1.0.3

- Tidak ada timer atau batas waktu.
- Player 1 dan Player 2 mendapat soal yang diacak secara terpisah.
- Dengan bank 20 soal dan default 10 soal per pemain, **set soal Player 1 dan Player 2 tidak saling tumpang tindih**: 10 soal untuk kiri dan 10 soal lainnya untuk kanan.
- Urutan kartu kata di dalam setiap soal juga diacak sendiri-sendiri pada masing-masing sisi.
- Setiap pemain berjalan secara independen. Pemain yang selesai lebih dahulu pada satu soal tidak perlu menunggu lawan.
- Begitu semua slot pada sisi pemain terisi, jawaban langsung dinilai.
- Jawaban **benar maupun salah tetap otomatis lanjut ke soal berikutnya** setelah feedback singkat.
- Jawaban benar mendapat **+10 poin**.
- Jawaban salah mendapat **0 poin**.
- Default: masing-masing pemain mengerjakan 10 soal yang dipilih dari bank 20 soal.
- Pertandingan selesai setelah kedua pemain menyelesaikan seluruh soal masing-masing.
- Pemenang ditentukan dari skor akhir tertinggi.

## Gesture

- Telunjuk = cursor.
- Satukan ujung telunjuk dan ibu jari = pinch / ambil kartu.
- Gerakkan tangan sambil pinch = drag.
- Buka pinch = drop.
- Satu tangan aktif per pemain direkomendasikan untuk versi ini.

## Teknologi

- HTML
- CSS
- TypeScript
- Vite
- MediaPipe Tasks Vision / Hand Landmarker
- WebRTC `getUserMedia()`
- Canvas 2D
- JSON statis

Tidak menggunakan database, SQL, backend API, Firebase, PostgreSQL, MySQL, atau server aplikasi.

## Struktur proyek

```text
arabic-gesture-versus/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vercel.json
├── scripts/
│   └── validate-data.mjs
└── src/
    ├── main.ts
    ├── styles.css
    ├── config.ts
    ├── types.ts
    ├── audio.ts
    ├── data/
    │   └── questions.json
    ├── game/
    │   ├── GameEngine.ts
    │   └── QuestionDeck.ts
    ├── interaction/
    │   └── DragController.ts
    ├── vision/
    │   └── HandTracker.ts
    └── utils/
        ├── dom.ts
        └── random.ts
```

## Menjalankan secara lokal

Disarankan Node.js 20.19 atau lebih baru.

```bash
npm install
npm run check
npm run dev
```

Buka alamat yang ditampilkan Vite, biasanya:

```text
http://localhost:5173
```

Untuk production build:

```bash
npm run build
```

Hasil build berada di folder:

```text
dist/
```

## Uji tanpa kamera

Pada layar awal tersedia tombol **Uji tanpa kamera (mouse/touch)**. Gunakan mode ini untuk menguji:

- bank soal,
- drag and drop,
- susunan RTL,
- validasi benar/salah,
- perpindahan soal otomatis,
- skor,
- progress masing-masing pemain,
- hasil pertandingan.

## Mengubah jumlah soal per pemain

Buka:

```text
src/config.ts
```

Ubah:

```ts
questionsPerPlayer: 10
```

menjadi misalnya:

```ts
questionsPerPlayer: 20
```

Jumlah tidak boleh melebihi jumlah soal di `src/data/questions.json`.

## Menambah atau mengedit soal

File soal:

```text
src/data/questions.json
```

Contoh struktur:

```json
{
  "id": 1,
  "level": 1,
  "sentence": "ذَهَبَ أَحْمَدُ إِلَى الْمَدْرَسَةِ",
  "words": ["ذَهَبَ", "أَحْمَدُ", "إِلَى", "الْمَدْرَسَةِ"],
  "translation": "Ahmad pergi ke sekolah."
}
```

Urutan pada `words` adalah urutan jawaban yang benar.

Setelah mengedit soal, jalankan:

```bash
npm run check:data
```

## Deploy ke GitHub

```bash
git init
git add .
git commit -m "Arabic Gesture Versus v1.0.3"
git branch -M main
git remote add origin URL_REPOSITORY_GITHUB_ANDA
git push -u origin main
```

## Deploy ke Vercel

1. Push proyek ke GitHub.
2. Buka Vercel.
3. Pilih **New Project**.
4. Import repository GitHub proyek ini.
5. Vercel akan membaca konfigurasi Vite.
6. Build command: `npm run build`.
7. Output directory: `dist`.
8. Deploy.

`vercel.json` sudah disediakan.

Kamera browser membutuhkan secure context. Vercel menggunakan HTTPS, sedangkan development lokal dapat menggunakan `localhost`.

## Catatan tracking dua pemain

MediaPipe dikonfigurasi untuk maksimal dua tangan. Sistem membagi tangan berdasarkan posisi horizontal pada layar:

- tangan di sisi kiri → Player 1,
- tangan di sisi kanan → Player 2.

Untuk kestabilan, gunakan satu tangan per pemain dan usahakan kedua pemain tetap berada pada sisi masing-masing dari garis tengah.

## Validasi soal

Project memiliki script validasi untuk memastikan bank soal tidak kosong, struktur soal benar, dan ID unik:

```bash
npm run check:data
```

## Konfigurasi penting

Semua pengaturan utama ada di `src/config.ts`:

- `questionsPerPlayer`: jumlah soal untuk masing-masing pemain.
- `pointsPerCorrect`: poin jika susunan benar.
- `answerTransitionDelayMs`: jeda feedback sebelum berpindah ke soal berikutnya.
- `pinch`: threshold gesture pinch.
- `dropSnapRadiusPx`: jarak snap kartu ke slot.
- `mediapipe`: URL WASM dan model Hand Landmarker.



## v1.0.3 — Feedback jawaban & skor lebih jelas

- Setelah susunan lengkap, setiap sisi menampilkan panel besar **JAWABAN ANDA BENAR** atau **JAWABAN ANDA SALAH**.
- Jawaban benar langsung menambahkan **+10 poin** dan angka skor dianimasikan agar terlihat.
- Jawaban salah menampilkan **+0 poin** dan kalimat jawaban yang benar.
- Feedback tampil sekitar 2,2 detik sebelum pemain tersebut berpindah ke soal berikutnya.
- Player 1 dan Player 2 tetap diperiksa dan berpindah soal secara independen.
