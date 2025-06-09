const express = require('express');
const Assessment = require('../models/Assessment');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Sample reading passages and questions
const sampleContent = [
  {
    passage: `Functions are mathematical entities that assign exactly one output to each input. A function can be represented as f(x) where x is the input variable. Quadratic functions follow the form f(x) = ax² + bx + c, where a, b, and c are constants and a ≠ 0. The graph of a quadratic function is a parabola. The quadratic formula x = (-b ± √(b² - 4ac)) / 2a is used to find the roots of a quadratic equation ax² + bx + c = 0. When solving systems of equations, methods include substitution, elimination, and matrix operations. Each method has specific scenarios where it's most efficient.`,
    questions: [
      {
        question: "What is the general form of a quadratic function?",
        options: ["f(x) = ax + b", "f(x) = ax² + bx + c", "f(x) = a/x + b", "f(x) = ax³ + bx² + c"],
        correctAnswer: 1
      },
      {
        question: "What is the graph of a quadratic function called?",
        options: ["Circle", "Parabola", "Line", "Hyperbola"],
        correctAnswer: 1
      },
      {
        question: "In the quadratic formula, what must be true about the coefficient 'a'?",
        options: ["a = 0", "a ≠ 0", "a > 0", "a < 0"],
        correctAnswer: 1
      },
      {
        question: "Which methods are mentioned for solving systems of equations?",
        options: ["Only substitution", "Substitution and elimination", "Substitution, elimination, and matrix operations", "Only matrix operations"],
        correctAnswer: 2
      }
    ]
  }
];

// @route   GET /api/assessment/content
// @desc    Get reading passage and questions
// @access  Private
router.get('/content', auth, async (req, res) => {
  try {
    // For now, return the sample content
    // Later you can randomize or use AI to generate content
    const content = sampleContent[0];
    
    res.json({
      success: true,
      data: {
        passage: content.passage,
        questions: content.questions.map(q => ({
          question: q.question,
          options: q.options
        })), // Don't send correct answers to frontend
        wordCount: content.passage.split(' ').length,
        estimatedReadingTime: Math.ceil(content.passage.split(' ').length / 200) // 200 WPM average
      }
    });

  } catch (error) {
    console.error('Get content error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error getting content' 
    });
  }
});

// @route   POST /api/assessment/submit
// @desc    Submit assessment and calculate score
// @access  Private
router.post('/submit', auth, async (req, res) => {
  try {
    const { 
      userAnswers, 
      readingTimeSeconds, 
      questionTimeSeconds,
      passageIndex = 0 
    } = req.body;

    const userId = req.user.userId;
    const content = sampleContent[passageIndex];
    
    // Calculate accuracy
    let correctAnswers = 0;
    const totalQuestions = content.questions.length;
    
    userAnswers.forEach((answer, index) => {
      if (answer === content.questions[index].correctAnswer) {
        correctAnswers++;
      }
    });
    
    const accuracy = (correctAnswers / totalQuestions) * 100;
    
    // Calculate reading metrics
    const wordCount = content.passage.split(' ').length;
    const totalTimeMinutes = (readingTimeSeconds + questionTimeSeconds) / 60;
    const wordsPerMinute = Math.round(wordCount / (readingTimeSeconds / 60));
    
    // Calculate speed score (custom algorithm)
    // Base score on WPM, adjust for accuracy, penalize for slow question answering
    let speedScore = wordsPerMinute * (accuracy / 100);
    
    // Bonus for quick comprehension (answering questions quickly with high accuracy)
    if (questionTimeSeconds < 60 && accuracy > 75) {
      speedScore *= 1.2;
    }
    
    // Penalty for very slow question answering
    if (questionTimeSeconds > 120) {
      speedScore *= 0.8;
    }
    
    speedScore = Math.round(speedScore);
    
    // Save assessment
    const assessment = new Assessment({
      userId,
      passage: content.passage,
      questions: content.questions,
      userAnswers,
      readingTimeSeconds,
      questionTimeSeconds,
      totalTimeSeconds: readingTimeSeconds + questionTimeSeconds,
      accuracy,
      speedScore,
      wordsPerMinute,
      retentionRate: accuracy // For now, retention rate equals accuracy
    });
    
    await assessment.save();
    
    // Update user stats
    const user = await User.findById(userId);
    user.totalAssessments += 1;
    
    // Calculate new average
    const allAssessments = await Assessment.find({ userId });
    const avgScore = allAssessments.reduce((sum, assess) => sum + assess.speedScore, 0) / allAssessments.length;
    user.averageSpeedScore = Math.round(avgScore);
    
    // Update best score
    if (speedScore > user.bestSpeedScore) {
      user.bestSpeedScore = speedScore;
    }
    
    await user.save();
    
    // Return results
    res.json({
      success: true,
      data: {
        speedScore,
        accuracy,
        wordsPerMinute,
        responseTime: questionTimeSeconds,
        retentionRate: accuracy,
        correctAnswers,
        totalQuestions,
        readingTime: readingTimeSeconds,
        questionTime: questionTimeSeconds,
        totalTime: readingTimeSeconds + questionTimeSeconds,
        userStats: {
          totalAssessments: user.totalAssessments,
          averageSpeedScore: user.averageSpeedScore,
          bestSpeedScore: user.bestSpeedScore
        }
      }
    });

  } catch (error) {
    console.error('Submit assessment error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error submitting assessment' 
    });
  }
});

module.exports = router;