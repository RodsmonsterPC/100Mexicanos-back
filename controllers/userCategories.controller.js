const UserCategory = require('../models/UserCategory');
const QuestionCard = require('../models/QuestionCard');

// Recalcular puntos y jugabilidad de una categoría
const refreshCategoryPoints = async (categoryId) => {
  const cards = await QuestionCard.find({ userCategory: categoryId });
  let totalPoints = 0;
  
  for (const card of cards) {
    for (const answer of card.answers) {
      totalPoints += answer.points || 0;
    }
  }

  const isPlayable = totalPoints >= 500;
  
  await UserCategory.findByIdAndUpdate(categoryId, {
    totalPoints,
    isPlayable
  });
};

const getUserCategories = async (req, res) => {
  try {
    const categories = await UserCategory.find({ createdBy: req.userId });
    
    // Obtener la cantidad de cartas por cada categoría manualmente (o podríamos agregarlo al modelo)
    const result = [];
    for (const cat of categories) {
      const cardsCount = await QuestionCard.countDocuments({ userCategory: cat._id });
      result.push({
        ...cat.toObject(),
        cardsCount
      });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener categorías', error: err.message });
  }
};

const createUserCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'El nombre es obligatorio' });

    const count = await UserCategory.countDocuments({ createdBy: req.userId });
    if (count >= 3) {
      return res.status(400).json({ message: 'Límite máximo de 3 mazos alcanzado' });
    }

    const newCategory = new UserCategory({
      name,
      createdBy: req.userId,
      totalPoints: 0,
      isPlayable: false
    });

    await newCategory.save();
    res.status(201).json(newCategory);
  } catch (err) {
    res.status(500).json({ message: 'Error al crear mazo', error: err.message });
  }
};

const deleteUserCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await UserCategory.findOne({ _id: id, createdBy: req.userId });
    if (!category) return res.status(404).json({ message: 'Mazo no encontrado' });

    // Eliminar todas las tarjetas de este mazo
    await QuestionCard.deleteMany({ userCategory: category._id });
    await UserCategory.findByIdAndDelete(category._id);

    res.json({ message: 'Mazo eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ message: 'Error al eliminar mazo', error: err.message });
  }
};

const updateUserCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: 'El nombre es obligatorio' });

    const category = await UserCategory.findOneAndUpdate(
      { _id: id, createdBy: req.userId },
      { name: name.trim() },
      { new: true }
    );

    if (!category) return res.status(404).json({ message: 'Mazo no encontrado' });

    // Actualizar también el campo category de las tarjetas relacionadas por compatibilidad
    await QuestionCard.updateMany(
      { userCategory: category._id, createdBy: req.userId },
      { category: name.trim() }
    );

    res.json(category);
  } catch (err) {
    res.status(500).json({ message: 'Error al actualizar mazo', error: err.message });
  }
};

const getCategoryCards = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const category = await UserCategory.findOne({ _id: categoryId, createdBy: req.userId });
    if (!category) return res.status(404).json({ message: 'Mazo no encontrado' });

    const cards = await QuestionCard.find({ userCategory: categoryId });
    res.json(cards);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener tarjetas', error: err.message });
  }
};

const createCategoryCard = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { question, answers } = req.body;

    const category = await UserCategory.findOne({ _id: categoryId, createdBy: req.userId });
    if (!category) return res.status(404).json({ message: 'Mazo no encontrado' });

    const currentCardsCount = await QuestionCard.countDocuments({ userCategory: categoryId });
    if (currentCardsCount >= 20) {
      return res.status(400).json({ message: 'Límite máximo de 20 cartas por mazo' });
    }

    const newCard = new QuestionCard({
      question: question,
      category: category.name, // Usamos el nombre también por compatibilidad local
      answers: answers,
      createdBy: req.userId,
      userCategory: category._id
    });

    await newCard.save();
    await refreshCategoryPoints(category._id);

    res.status(201).json(newCard);
  } catch (err) {
    res.status(500).json({ message: 'Error al crear carta', error: err.message });
  }
};

const updateCategoryCard = async (req, res) => {
    try {
      const { categoryId, cardId } = req.params;
      const { question, answers } = req.body;
  
      const category = await UserCategory.findOne({ _id: categoryId, createdBy: req.userId });
      if (!category) return res.status(404).json({ message: 'Mazo no encontrado' });
  
      const card = await QuestionCard.findOneAndUpdate(
          { _id: cardId, userCategory: categoryId, createdBy: req.userId },
          { question, answers },
          { new: true, runValidators: true }
      );
      
      if (!card) return res.status(404).json({ message: 'Carta no encontrada' });
      
      await refreshCategoryPoints(category._id);
  
      res.json(card);
    } catch (err) {
      res.status(500).json({ message: 'Error al editar carta', error: err.message });
    }
  };

const deleteCategoryCard = async (req, res) => {
  try {
    const { categoryId, cardId } = req.params;
    
    const category = await UserCategory.findOne({ _id: categoryId, createdBy: req.userId });
    if (!category) return res.status(404).json({ message: 'Mazo no encontrado' });

    const card = await QuestionCard.findOneAndDelete({ _id: cardId, userCategory: categoryId, createdBy: req.userId });
    if (!card) return res.status(404).json({ message: 'Carta no encontrada' });

    await refreshCategoryPoints(category._id);

    res.json({ message: 'Carta eliminada' });
  } catch (err) {
    res.status(500).json({ message: 'Error al eliminar carta', error: err.message });
  }
};

module.exports = {
  getUserCategories,
  createUserCategory,
  deleteUserCategory,
  updateUserCategory,
  getCategoryCards,
  createCategoryCard,
  updateCategoryCard,
  deleteCategoryCard
};
