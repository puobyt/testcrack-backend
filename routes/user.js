const express = require('express');
const Assessment = require('../models/Assessment');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/user/progress
// @desc    Get user progress and stats
// @access  Private
router.get('/progress', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get user basic info
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Get all user assessments
    const assessments = await Assessment.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10); // Last 10 assessments
    
    // Calculate progress metrics
    const progressData = {
      user: {
        email: user.email,
        totalAssessments: user.totalAssessments,
        averageSpeedScore: user.averageSpeedScore,
        bestSpeedScore: user.bestSpeedScore,
        memberSince: user.createdAt
      },
      recentAssessments: assessments.map(assessment => ({
        speedScore: assessment.speedScore,
        accuracy: assessment.accuracy,
        wordsPerMinute: assessment.wordsPerMinute,
        date: assessment.createdAt,
        totalTime: assessment.totalTimeSeconds
      })),
      performanceTrends: {
        averageAccuracy: assessments.length > 0 ? 
          Math.round(assessments.reduce((sum, a) => sum + a.accuracy, 0) / assessments.length) : 0,
        averageWPM: assessments.length > 0 ? 
          Math.round(assessments.reduce((sum, a) => sum + a.wordsPerMinute, 0) / assessments.length) : 0,
        improvementRate: calculateImprovementRate(assessments)
      }
    };
    
    res.json({
      success: true,
      data: progressData
    });

  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error getting progress' 
    });
  }
});

// Helper function to calculate improvement rate
function calculateImprovementRate(assessments) {
  if (assessments.length < 2) return 0;
  
  const recent = assessments.slice(0, Math.min(3, assessments.length));
  const older = assessments.slice(-Math.min(3, assessments.length));
  
  const recentAvg = recent.reduce((sum, a) => sum + a.speedScore, 0) / recent.length;
  const olderAvg = older.reduce((sum, a) => sum + a.speedScore, 0) / older.length;
  
  return Math.round(((recentAvg - olderAvg) / olderAvg) * 100);
}

module.exports = router;