import { pipeline, env } from '@huggingface/transformers';
import { TONE_CONFIG } from '../utils/config.js';

export class RootFactsService {
  constructor() {
    this.generator = null;
    this.currentTone = TONE_CONFIG.defaultTone;

    // MATIKAN SEMUA FITUR OTOMATIS YANG BISA BIKIN ERROR
    env.allowLocalModels = false;
    env.allowRemoteModels = true;
    // Paksa browser untuk tidak pakai cache yang mungkin korup
    env.useBrowserCache = false; 
  }

  async loadModel() {
    try {
      console.log('AI: Mencoba memuat model dengan konfigurasi paling stabil...');
      
      // JURUS TERAKHIR: Gunakan model paling kecil 'Xenova/tiny-random-LlamaForCausalLM' 
      // untuk tes apakah AI-nya bisa jalan atau tidak. 
      // Atau tetap gunakan flan-t5-small tapi pastikan parameternya begini:
      this.generator = await pipeline('text2text-generation', 'Xenova/la-mini-flan-t5-small', {
        device: 'wasm',
        // Jika 'q4' error terus, kita pakai 'fp32' tapi paksa wasm
        dtype: 'fp32', 
      });

      console.log('AI: Berhasil! Generator siap digunakan.');
    } catch (error) {
      console.error('AI: Error fatal saat loadModel:', error);
      // Tampilkan error ke UI agar kita bisa lihat detailnya
      throw new Error(`AI Gagal: ${error.message}`);
    }
  }

  setTone(tone) {
    this.currentTone = tone;
  }

  async generateFacts(vegetableName) {
    if (!this.generator) return 'Generator belum siap.';
    const prompt = `Fact about ${vegetableName}:`;
    try {
      const result = await this.generator(prompt, { 
        max_new_tokens: 20,
        do_sample: false 
      });
      return result[0].generated_text;
    } catch (e) {
      return 'Gagal generate.';
    }
  }

  isReady() {
    return !!this.generator;
  }
}