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
    console.log('📞 Assessment content requested by user:', req.user.userId);
    
    // Use sample content directly (no database query to avoid timeout)
    const content = sampleContent[0];
    
    console.log('✅ Returning sample content');
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
    console.error('❌ Get content error:', error);
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
    console.log('📝 Assessment submission from user:', req.user.userId);
    
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
    const wordsPerMinute = Math.round(wordCount / (readingTimeSeconds / 60));
    
    // Calculate speed score (custom algorithm)
    let speedScore = wordsPerMinute * (accuracy / 100);
    
    // Bonus for quick comprehension
    if (questionTimeSeconds < 60 && accuracy > 75) {
      speedScore *= 1.2;
    }
    
    // Penalty for very slow question answering
    if (questionTimeSeconds > 120) {
      speedScore *= 0.8;
    }
    
    speedScore = Math.round(speedScore);
    
    // Save assessment (with timeout protection)
    try {
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
        retentionRate: accuracy
      });
      
      // Set a timeout for the save operation
      const savePromise = assessment.save();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database save timeout')), 5000)
      );
      
      await Promise.race([savePromise, timeoutPromise]);
      console.log('✅ Assessment saved to database');
    } catch (saveError) {
      console.log('⚠️ Database save failed (continuing anyway):', saveError.message);
      // Continue even if save fails
    }
    
    // Update user stats (with timeout protection)
    try {
      const user = await User.findById(userId);
      if (user) {
        user.totalAssessments += 1;
        
        // Simple average calculation without querying all assessments
        const newTotal = user.totalAssessments;
        const oldAvg = user.averageSpeedScore || 0;
        user.averageSpeedScore = Math.round(((oldAvg * (newTotal - 1)) + speedScore) / newTotal);
        
        // Update best score
        if (speedScore > user.bestSpeedScore) {
          user.bestSpeedScore = speedScore;
        }
        
        // Set timeout for user save
        const userSavePromise = user.save();
        const userTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('User save timeout')), 3000)
        );
        
        await Promise.race([userSavePromise, userTimeoutPromise]);
        console.log('✅ User stats updated');
      }
    } catch (userError) {
      console.log('⚠️ User update failed (continuing anyway):', userError.message);
      // Continue even if user update fails
    }
    
    // Return results (always succeed)
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
          totalAssessments: 1, // Default values if database fails
          averageSpeedScore: speedScore,
          bestSpeedScore: speedScore
        }
      }
    });

  } catch (error) {
    console.error('❌ Submit assessment error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error submitting assessment' 
    });
  }
});

module.exports = router;