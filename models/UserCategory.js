const mongoose = require('mongoose');

const userCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  isPlayable: {
    type: Boolean,
    default: false,
  },
  totalPoints: {
    type: Number,
    default: 0,
  }
}, { timestamps: true });

// Límite de 3 categorías por usuario (esto se puede validar a nivel de controlador)
module.exports = mongoose.model('UserCategory', userCategorySchema);
