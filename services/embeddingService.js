const { pipeline, env } = require('@xenova/transformers');

// Configuración obligatoria para reducir drásticamente el consumo de memoria en entornos de bajos recursos (ej. ~512MB en Render)
// Evita que se disparen múltiples hilos de WebAssembly, lo que causa picos enormes de RAM
env.backends.onnx.wasm.numThreads = 1; 
env.backends.onnx.wasm.simd = false; // Desactivar SIMD para reducir el overhead de memoria
env.allowLocalModels = false;

class EmbeddingService {
  constructor() {
    this.extractor = null;
    this.modelName = 'Xenova/all-MiniLM-L6-v2'; // Modelo ligero (~90MB) en vez del multilingüe (~471MB) que crashea Render
    this.initializationPromise = null;
  }

  async init() {
    if (this.extractor) return this.extractor;
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = new Promise(async (resolve, reject) => {
      try {
        console.log(`[IA] Cargando modelo de embeddings: ${this.modelName}...`);
        this.extractor = await pipeline('feature-extraction', this.modelName);
        console.log(`[IA] Modelo cargado exitosamente.`);
        resolve(this.extractor);
      } catch (error) {
        console.error(`[IA] Error al cargar modelo de embeddings:`, error);
        reject(error);
      }
    });

    return this.initializationPromise;
  }

  async generateEmbedding(text) {
    try {
      const extractor = await this.init();
      // Generate embedding and take the mean pooling, normalize
      const output = await extractor(text, { pooling: 'mean', normalize: true });
      // Output is a tensor, we return standard JS Array
      return Array.from(output.data);
    } catch (error) {
      console.error('[IA] Error al generar embedding para:', text, error);
      throw error;
    }
  }

  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

module.exports = new EmbeddingService();
