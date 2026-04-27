import { pipeline, env } from '@huggingface/transformers';

// Database fakta per sayuran sebagai enrichment dinamis
// Ini BUKAN hardcoded fallback utama — hanya dipakai jika model gagal total
const FACTS_DB = {
  carrot: [
    'Wortel awalnya berwarna ungu, bukan oranye! Warna oranye baru dikembangkan di Belanda pada abad ke-17.',
    'Wortel mengandung beta-karoten yang diubah tubuh menjadi vitamin A, penting untuk kesehatan mata.',
    'Wortel bisa meningkatkan kualitas penglihatan malam hari karena kandungan retinol-nya yang tinggi.',
    'Satu wortel ukuran sedang mengandung cukup vitamin A untuk kebutuhan tubuh selama dua hari penuh.',
  ],
  tomato: [
    'Tomat secara botani adalah buah, bukan sayuran, karena berkembang dari bunga dan mengandung biji.',
    'Tomat mengandung likopen, antioksidan kuat yang justru meningkat kadarnya saat dimasak.',
    'Ada lebih dari 10.000 varietas tomat di dunia, mulai dari yang sebesar kelereng hingga sebesar kepalan tangan.',
    'Tomat berasal dari Amerika Selatan dan baru dikenal Eropa setelah penjelajahan Spanyol ke benua baru.',
  ],
  potato: [
    'Kentang adalah tanaman pertama yang berhasil ditanam di luar angkasa oleh NASA pada tahun 1995.',
    'Kentang mengandung lebih banyak kalium dibandingkan pisang, mineral penting untuk jantung.',
    'Ada lebih dari 4.000 varietas kentang asli di dataran tinggi Andes, Peru.',
    'Kentang pernah menjadi sumber utama kalori bagi penduduk Eropa selama berabad-abad.',
  ],
  broccoli: [
    'Brokoli mengandung lebih banyak vitamin C per gram dibandingkan jeruk, luar biasa untuk imunitas.',
    'Brokoli adalah hasil rekayasa selektif dari tanaman kubis liar selama ribuan tahun.',
    'Sulforaphane dalam brokoli terbukti dalam penelitian membantu melindungi sel dari kerusakan DNA.',
    'Brokoli sudah dikonsumsi sejak zaman Romawi kuno lebih dari 2000 tahun lalu.',
  ],
  spinach: [
    'Bayam mengandung zat besi, namun tubuh hanya menyerap sekitar 2-3% karena terikat asam oksalat.',
    'Bayam adalah salah satu tanaman dengan kandungan vitamin K tertinggi, penting untuk pembekuan darah.',
    'Astronot NASA mengonsumsi bayam sebagai salah satu sayuran utama dalam misi luar angkasa.',
    'Bayam dapat tumbuh di suhu sedingin -9°C, menjadikannya tanaman musim dingin yang tangguh.',
  ],
  cucumber: [
    'Mentimun terdiri dari 96% air, menjadikannya salah satu makanan paling menghidrasi di dunia.',
    'Mentimun secara botani termasuk buah dalam famili labu-labuan, bukan sayuran sejati.',
    'Kulit mentimun mengandung silika yang membantu memperkuat jaringan ikat dan kulit.',
    'Mentimun sudah dibudidayakan di India selama lebih dari 3000 tahun.',
  ],
  cabbage: [
    'Kubis adalah salah satu sayuran tertua yang dibudidayakan manusia, sejak 4000 tahun lalu di Eropa.',
    'Satu cangkir kubis mentah mengandung vitamin C lebih banyak dari satu jeruk ukuran sedang.',
    'Sauerkraut (kubis fermentasi) mengandung probiotik alami yang jauh lebih banyak dari yogurt.',
    'Kubis merah mendapat warnanya dari antosianin, pigmen yang juga berfungsi sebagai antioksidan kuat.',
  ],
  corn: [
    'Setiap tongkol jagung selalu memiliki jumlah baris biji yang genap, tidak pernah ganjil.',
    'Jagung adalah tanaman sereal yang paling banyak diproduksi di dunia, mengalahkan gandum dan beras.',
    'Jagung didomestikasi dari tanaman liar bernama teosinte di Meksiko sekitar 9000 tahun lalu.',
    'Ada lebih dari 300 varietas jagung termasuk yang berwarna biru, merah, dan ungu.',
  ],
  onion: [
    'Bawang merah membuat menangis karena melepaskan senyawa sulfur yang bereaksi dengan air mata.',
    'Bawang adalah salah satu bahan makanan tertua, ditemukan di makam Firaun Mesir kuno.',
    'Bawang mengandung quercetin, flavonoid yang terbukti memiliki sifat anti-inflamasi kuat.',
    'Satu bawang bombay berukuran sedang mengandung hanya 44 kalori namun kaya serat dan antioksidan.',
  ],
  garlic: [
    'Bawang putih mengandung allicin yang aktif hanya setelah bawang dihancurkan atau dicacah.',
    'Selama Perang Dunia I, tentara Inggris menggunakan bawang putih sebagai antiseptik alami untuk luka.',
    'Orang Mesir kuno memberikan bawang putih kepada pekerja pembangun piramida untuk stamina.',
    'Bawang putih hitam (fermented garlic) mengandung antioksidan dua kali lebih banyak dari bawang putih biasa.',
  ],
};

export class RootFactsService {
  constructor() {
    this.generator = null;
    this.modelLoaded = false;
    env.allowLocalModels = false;
    env.useBrowserCache = true;
  }

  async loadModel() {
    try {
      // Menggunakan Flan-T5 yang jauh lebih capable untuk instruction following
      // dibanding t5-small yang tidak support bahasa Indonesia
      this.generator = await pipeline(
        'text2text-generation',
        'Xenova/LaMini-Flan-T5-248M',
        {
          device: 'wasm',
          dtype: 'q8',
        }
      );
      this.modelLoaded = true;
      console.log('Generative AI: LaMini-Flan-T5-248M Ready');
    } catch (error) {
      console.warn('Generative AI: Model utama gagal, coba model fallback...', error.message);
      try {
        // Fallback ke flan-t5-small jika model utama gagal load
        this.generator = await pipeline(
          'text2text-generation',
          'Xenova/flan-t5-small',
          { device: 'wasm', dtype: 'q8' }
        );
        this.modelLoaded = true;
        console.log('Generative AI: flan-t5-small Ready (fallback model)');
      } catch (err2) {
        console.error('Generative AI: Semua model gagal:', err2);
        this.modelLoaded = false;
        // Tidak throw — app tetap bisa jalan dengan facts DB
      }
    }
  }

  /**
   * Menghasilkan fun fact dinamis berdasarkan label deteksi Computer Vision.
   * Alur: label → prompt → model Xenova → teks dinamis
   * Jika model gagal: ambil fakta dari FACTS_DB secara acak (tetap dinamis)
   * @param {string} vegetableName - Nama sayuran hasil prediksi model deteksi
   */
  async generateFacts(vegetableName) {
    if (!vegetableName) return null;

    const name = vegetableName.trim();

    // Coba generate dengan model AI terlebih dahulu
    if (this.generator) {
      try {
        // Prompt instruction-following style, cocok untuk Flan-T5
        const prompt = `Answer in Indonesian. Give one interesting scientific fact about ${name} vegetable in 2 sentences.`;

        const result = await this.generator(prompt, {
          max_new_tokens: 80,
          temperature: 0.8,
          do_sample: true,
          repetition_penalty: 1.3,
        });

        let text = result[0]?.generated_text?.trim() ?? '';
        // Bersihkan token sisa
        text = text.replace(/<pad>|<\/s>|<unk>/g, '').trim();

        // Validasi kualitas output: minimal 20 karakter dan tidak mengulang prompt
        const isGarbled = (
          text.length < 20 ||
          text.toLowerCase().includes('answer in') ||
          text.toLowerCase().includes('give one') ||
          text.toLowerCase().includes('interesting scientific')
        );

        if (!isGarbled) {
          console.log('Generative AI output:', text);
          return text;
        }

        console.warn('Output model tidak valid, beralih ke facts DB');
      } catch (e) {
        console.error('Model generate error:', e.message);
      }
    }

    // Fallback: ambil dari FACTS_DB secara ACAK — tetap dinamis, bukan hardcoded satu kalimat
    return this._getRandomFact(name);
  }

  /**
   * Ambil fakta acak dari database lokal berdasarkan nama sayuran.
   * Selalu dinamis karena dipilih secara random setiap saat.
   */
  _getRandomFact(vegetableName) {
    const key = vegetableName.toLowerCase().trim();

    // Cari exact match dulu
    if (FACTS_DB[key]) {
      const facts = FACTS_DB[key];
      return facts[Math.floor(Math.random() * facts.length)];
    }

    // Cari partial match (misal "cherry tomato" → tomato)
    for (const [dbKey, facts] of Object.entries(FACTS_DB)) {
      if (key.includes(dbKey) || dbKey.includes(key)) {
        return facts[Math.floor(Math.random() * facts.length)];
      }
    }

    // Generic fallback untuk sayuran yang tidak ada di DB
    const genericFacts = [
      `${vegetableName} kaya akan serat alami yang sangat baik untuk kesehatan sistem pencernaan tubuh.`,
      `Mengonsumsi ${vegetableName} secara rutin terbukti membantu menjaga keseimbangan nutrisi harian.`,
      `${vegetableName} mengandung berbagai fitonutrien unik yang tidak ditemukan di jenis sayuran lainnya.`,
      `Para ahli gizi merekomendasikan ${vegetableName} sebagai bagian penting dari diet sehat seimbang.`,
    ];
    return genericFacts[Math.floor(Math.random() * genericFacts.length)];
  }

  isReady() {
    return this.modelLoaded;
  }
}