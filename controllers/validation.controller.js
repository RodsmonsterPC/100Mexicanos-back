const QuestionCard = require('../models/QuestionCard');
const embeddingService = require('../services/embeddingService');

// Caché en memoria: { [questionId]: [ { text: '...', embedding: [...] }, ... ] }
const questionEmbeddingsCache = {};

const normalizeText = (text) =>
  text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

const levenshtein = (a, b) => {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
};

const isMatchString = (input, target) => {
  const ni = normalizeText(input);
  const nt = normalizeText(target);
  if (ni === nt) return true;
  if (nt.length > 5 && ni.length > 3) {
    if (nt.includes(ni) || ni.includes(nt)) return true;
  }
  const threshold = Math.max(1, Math.floor(nt.length * 0.40));
  return levenshtein(ni, nt) <= threshold;
};

const validateAnswer = async (req, res) => {
  try {
    const { id } = req.params;
    const { input, revealed } = req.body;

    if (!input || !input.trim()) {
      return res.json({ success: true, matchedIndex: -1, isCorrect: false });
    }

    // 1. Obtener pregunta
    const question = await QuestionCard.findById(id);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Pregunta no encontrada.' });
    }

    // 2. Primera pasada: Búsqueda rápida (exacta y sinónimos vía Levenshtein)
    // Buscamos sobre las respuestas no reveladas (revealed contiene true/false en cada índice)
    const exactMatchIndex = question.answers.findIndex(
      (answer, idx) => (!revealed || !revealed[idx]) && isMatchString(input, answer.text)
    );

    if (exactMatchIndex !== -1) {
      return res.json({
        success: true,
        isCorrect: true,
        matchedIndex: exactMatchIndex,
        points: question.answers[exactMatchIndex].points
      });
    }

    // 3. Segunda pasada: Validación semántica con Embeddings (Modelo AI)
    // Primero, revisar si la pregunta ya está en caché
    let cachedAnswers = questionEmbeddingsCache[id];
    if (!cachedAnswers) {
      console.log(`[IA] Generando embeddings caché para pregunta: ${id}`);
      cachedAnswers = [];
      for (const ans of question.answers) {
        const emb = await embeddingService.generateEmbedding(ans.text);
        cachedAnswers.push({ text: ans.text, embedding: emb });
      }
      questionEmbeddingsCache[id] = cachedAnswers;
    }

    // Generar embedding para la palabra que el usuario ingresó
    const inputEmbedding = await embeddingService.generateEmbedding(input);

    let bestSimilarity = -1;
    let bestIndex = -1;

    // Comparar contra las respuestas del caché que no han sido reveladas aún
    for (let idx = 0; idx < cachedAnswers.length; idx++) {
      if (revealed && revealed[idx]) continue; // ignorar respuestas mostradas
      
      const similarity = embeddingService.cosineSimilarity(inputEmbedding, cachedAnswers[idx].embedding);
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestIndex = idx;
      }
    }

    // Umbral estricto definido por el usuario reducido para tolerar variaciones
    console.log(`[Validation] Input: "${input}", Best match: "${bestIndex !== -1 ? cachedAnswers[bestIndex].text : 'N/A'}", Score: ${bestSimilarity.toFixed(4)}`);
    
    // Aumentamos el umbral a 0.65 para evitar falsos positivos con palabras no relacionadas, manteniendo flexibilidad
    if (bestSimilarity >= 0.65 && bestIndex !== -1) {
      return res.json({
        success: true,
        isCorrect: true,
        matchedIndex: bestIndex,
        points: question.answers[bestIndex].points
      });
    }

    // Si todo falla, respuesta incorrecta
    return res.json({ success: true, matchedIndex: -1, isCorrect: false });

  } catch (error) {
    console.error('Error in validateAnswer:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { validateAnswer };
