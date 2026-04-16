import { pipeline } from '@huggingface/transformers';
import { TONE_CONFIG } from '../utils/config.js';

export class RootFactsService {
  constructor() {
    this.generator = null;
    this.currentTone = TONE_CONFIG.defaultTone;
  }

  async loadModel() {
    const device = navigator.gpu ? 'webgpu' : 'webgl';
    this.generator = await pipeline('text2text-generation', 'Xenova/la-mini-flan-t5-small', { device });
  }

  setTone(tone) {
    this.currentTone = tone;
  }

  async generateFacts(vegetableName) {
    if (!this.generator) return null;

    const prompts = {
      funny: `Tell a very funny joke or hilarious fact about ${vegetableName} in one short sentence.`,
      historical: `Tell a brief historical origin story about ${vegetableName} in one short sentence.`,
      normal: `Give me an interesting fun fact about ${vegetableName} in one short sentence.`,
    };

    const result = await this.generator(prompts[this.currentTone] || prompts.normal, {
      max_new_tokens: 50,
      temperature: 0.7,
      top_p: 0.9,
      do_sample: true,
    });

    return result[0].generated_text;
  }

  isReady() {
    return !!this.generator;
  }
}