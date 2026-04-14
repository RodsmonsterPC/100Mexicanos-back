const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true },
  points: { type: Number, required: true, min: 1 },
  revealed: { type: Boolean, default: false },
  synonyms: [{ type: String, trim: true }]
});

const questionCardSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true },
    category: { type: String, required: true, default: 'General', trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    userCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'UserCategory', default: null },
    answers: {
      type: [answerSchema],
      validate: {
        validator: function (v) { return v.length === 5; },
        message: 'Cada tarjeta debe tener exactamente 5 respuestas.',
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('QuestionCard', questionCardSchema);
