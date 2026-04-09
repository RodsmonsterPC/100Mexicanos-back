const QuestionCard = require('../models/QuestionCard');

const seedQuestions = [
  { question: 'Menciona algo que llevas a la playa', category: 'Viajes', answers: [{ text: 'Toalla', points: 35 }, { text: 'Bloqueador', points: 25 }, { text: 'Sombrilla', points: 20 }, { text: 'Lentes de sol', points: 12 }, { text: 'Sandalias', points: 8 }] },
  { question: 'Nombre una cosa que la gente hace cuando está nerviosa', category: 'Cuerpo Humano', answers: [{ text: 'Morder uñas', points: 40 }, { text: 'Sudar', points: 25 }, { text: 'Temblar', points: 18 }, { text: 'Hablar mucho', points: 10 }, { text: 'Reírse', points: 7 }] },
  { question: 'Menciona algo que encuentras en una cocina', category: 'Hogar', answers: [{ text: 'Refrigerador', points: 38 }, { text: 'Estufa', points: 28 }, { text: 'Microondas', points: 17 }, { text: 'Sartén', points: 11 }, { text: 'Cuchillo', points: 6 }] },
  { question: 'Qué cosa se te olvida al salir de vacaciones', category: 'Viajes', answers: [{ text: 'Cepillo de dientes', points: 42 }, { text: 'Medicamentos', points: 22 }, { text: 'Cargador del celular', points: 18 }, { text: 'Ropa interior', points: 12 }, { text: 'Pasaporte', points: 6 }] },
  { question: 'Nombre un animal que se puede tener como mascota', category: 'Animales', answers: [{ text: 'Perro', points: 45 }, { text: 'Gato', points: 30 }, { text: 'Pez', points: 12 }, { text: 'Hamster', points: 8 }, { text: 'Conejo', points: 5 }] },
  { question: 'Menciona algo que hay en un supermercado', category: 'Comida', answers: [{ text: 'Frutas y verduras', points: 35 }, { text: 'Carnes', points: 28 }, { text: 'Lacteos', points: 20 }, { text: 'Pan', points: 12 }, { text: 'Refrescos', points: 5 }] },
  { question: 'Que cosa hace una persona cuando esta triste', category: 'Cuerpo Humano', answers: [{ text: 'Llorar', points: 50 }, { text: 'Comer', points: 22 }, { text: 'Dormir', points: 15 }, { text: 'Escuchar musica', points: 8 }, { text: 'Ver peliculas', points: 5 }] },
  { question: 'Nombre algo que usas todos los dias', category: 'Vida Diaria', answers: [{ text: 'Celular', points: 45 }, { text: 'Cepillo de dientes', points: 25 }, { text: 'Ropa', points: 18 }, { text: 'Jabon', points: 8 }, { text: 'Zapatos', points: 4 }] },
  { question: 'Menciona algo que puedes hacer en un parque', category: 'Entretenimiento', answers: [{ text: 'Correr', points: 38 }, { text: 'Jugar', points: 28 }, { text: 'Pasear al perro', points: 18 }, { text: 'Hacer picnic', points: 10 }, { text: 'Leer', points: 6 }] },
  { question: 'Nombre una cosa que encuentras en una oficina', category: 'Hogar', answers: [{ text: 'Computadora', points: 42 }, { text: 'Escritorio', points: 26 }, { text: 'Silla', points: 18 }, { text: 'Telefono', points: 10 }, { text: 'Impresora', points: 4 }] },
];

const getAllQuestions = async (req, res) => {
  try {
    const questions = await QuestionCard.find().sort({ category: 1, createdAt: -1 });
    res.json({ success: true, count: questions.length, data: questions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getCategories = async (req, res) => {
  try {
    const categories = await QuestionCard.distinct('category');
    res.json({ success: true, count: categories.length, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getRandomQuestion = async (req, res) => {
  try {
    const query = {};
    if (req.query.categories) {
      // Split by comma
      const categoriesArray = req.query.categories.split(',');
      query.category = { $in: categoriesArray };
    }

    const count = await QuestionCard.countDocuments(query);
    if (count === 0) return res.status(404).json({ success: false, message: 'No hay preguntas con esos criterios.' });
    
    const random = Math.floor(Math.random() * count);
    const question = await QuestionCard.findOne(query).skip(random);
    
    const cleanQuestion = {
      ...question.toObject(),
      answers: question.answers.map((a) => ({ ...a.toObject(), revealed: false })),
    };
    res.json({ success: true, data: cleanQuestion });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createQuestion = async (req, res) => {
  try {
    const { question, category, answers } = req.body;
    if (!question || !answers || answers.length !== 5) {
      return res.status(400).json({ success: false, message: 'Se requiere una pregunta y exactamente 5 respuestas.' });
    }
    const newQuestion = await QuestionCard.create({ 
      question, 
      category: category || 'General', 
      answers 
    });
    res.status(201).json({ success: true, data: newQuestion });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const deleteQuestion = async (req, res) => {
  try {
    const question = await QuestionCard.findByIdAndDelete(req.params.id);
    if (!question) return res.status(404).json({ success: false, message: 'Pregunta no encontrada.' });
    res.json({ success: true, message: 'Pregunta eliminada.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const seedIfEmpty = async () => {
  try {
    const count = await QuestionCard.countDocuments();
    if (count === 0) {
      await QuestionCard.insertMany(seedQuestions);
      console.log(`🌱 Base de datos sembrada con ${seedQuestions.length} preguntas.`);
    } else {
      console.log(`📚 ${count} preguntas ya existen en la base de datos.`);
    }
  } catch (error) {
    console.error('Error al sembrar preguntas:', error.message);
  }
};

const updateQuestion = async (req, res) => {
  try {
    const { question, category, answers } = req.body;
    if (!question || !answers || answers.length !== 5) {
      return res.status(400).json({ success: false, message: 'Se requiere una pregunta y exactamente 5 respuestas.' });
    }
    const updatedQuestion = await QuestionCard.findByIdAndUpdate(
      req.params.id, 
      { question, category: category || 'General', answers },
      { new: true }
    );
    if (!updatedQuestion) return res.status(404).json({ success: false, message: 'Pregunta no encontrada.' });
    res.json({ success: true, data: updatedQuestion });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = { getAllQuestions, getCategories, getRandomQuestion, createQuestion, deleteQuestion, updateQuestion, seedIfEmpty };
