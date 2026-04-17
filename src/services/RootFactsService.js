import { pipeline, env } from '@huggingface/transformers';
import { TONE_CONFIG } from '../utils/config.js';

export class RootFactsService {
  constructor() {
    this.generator = null;
    this.currentTone = TONE_CONFIG.defaultTone;

    env.allowLocalModels = false;
    env.useBrowserCache = true;
  }

  async loadModel() {
    try {
      // Kita tetap pakai t5-small karena terbukti tembus di jaringan kamu
      this.generator = await pipeline('text2text-generation', 'Xenova/t5-small', {
        device: 'wasm',
        dtype: 'q4',
        fetch_init: {
          credentials: 'omit',
          mode: 'cors',
        }
      });
      console.log('AI: Generator Siap Memberikan Fakta!');
    } catch (error) {
      console.error('AI Load Error:', error);
      throw error;
    }
  }

  setTone(tone) {
    this.currentTone = tone;
  }

  async generateFacts(vegetableName) {
    if (!this.generator) return null;

    // Kita buat prompt yang lebih memaksa AI untuk menjelaskan dalam Bahasa Indonesia
    const prompts = {
      funny: `Berikan satu fakta lucu dan singkat tentang sayuran ${vegetableName} dalam Bahasa Indonesia.`,
      historical: `Berikan sejarah singkat asal usul sayuran ${vegetableName} dalam Bahasa Indonesia.`,
      normal: `Jelaskan apa itu sayuran ${vegetableName} dan manfaatnya secara singkat dalam Bahasa Indonesia.`,
    };

    try {
      const result = await this.generator(prompts[this.currentTone] || prompts.normal, {
        max_new_tokens: 100, // Kita perpanjang biar penjelasannya gak kepotong
        temperature: 0.7,
        do_sample: true,
      });

      // T5 kadang butuh sedikit pembersihan teks di awal
      let text = result[0].generated_text;
      return text.replace(/<pad>|<\/s>/g, '').trim();
    } catch (e) {
      return `Sayuran ini adalah ${vegetableName}, sangat baik untuk kesehatan tubuh kamu.`;
    }
  }

  isReady() {
    return !!this.generator;
  }
}