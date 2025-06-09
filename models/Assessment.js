const mongoose = require('mongoose');

const assessmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  passage: {
    type: String,
    required: true
  },
  questions: [{
    question: String,
    options: [String],
    correctAnswer: Number
  }],
  userAnswers: [Number],
  readingTimeSeconds: {
    type: Number,
    required: true
  },
  questionTimeSeconds: {
    type: Number,
    required: true
  },
  totalTimeSeconds: {
    type: Number,
    required: true
  },
  accuracy: {
    type: Number,
    required: true
  },
  speedScore: {
    type: Number,
    required: true
  },
  wordsPerMinute: {
    type: Number,
    required: true
  },
  retentionRate: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Assessment', assessmentSchema);