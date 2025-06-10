const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// In-memory storage for when MongoDB is down
let inMemoryUsers = new Map();
let userIdCounter = 1;

// @route   POST /api/auth/signup
// @desc    Register new user
// @access  Public
router.post('/signup', async (req, res) => {
  try {
    console.log('📝 Signup request received:', req.body);
    
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters' 
      });
    }

    // Check if MongoDB is available
    const mongoAvailable = require('mongoose').connection.readyState === 1;
    
    if (mongoAvailable) {
      try {
        // Try MongoDB first
        console.log('💾 Attempting MongoDB signup...');
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          return res.status(400).json({ 
            success: false, 
            message: 'User already exists with this email' 
          });
        }

        // Create new user
        const user = new User({
          email,
          password
        });

        await user.save();
        console.log('✅ User saved to MongoDB');

        // Create JWT token
        const token = jwt.sign(
          { userId: user._id },
          process.env.JWT_SECRET || 'fallback-secret-key',
          { expiresIn: '7d' }
        );

        res.status(201).json({
          success: true,
          message: 'User created successfully',
          token,
          user: {
            id: user._id,
            email: user.email,
            credits: user.credits || 10,
            totalAssessments: user.totalAssessments || 0,
            averageSpeedScore: user.averageSpeedScore || 0,
            bestSpeedScore: user.bestSpeedScore || 0
          }
        });

      } catch (mongoError) {
        console.log('⚠️ MongoDB signup failed, using fallback:', mongoError.message);
        // Fall through to memory storage
      }
    }
    
    // Fallback: Use in-memory storage
    if (!mongoAvailable || true) { // Force fallback for now
      console.log('💾 Using in-memory storage for signup...');
      
      // Check if user exists in memory
      if (inMemoryUsers.has(email)) {
        return res.status(400).json({ 
          success: false, 
          message: 'User already exists with this email' 
        });
      }

      // Create user in memory
      const userId = 'user_' + userIdCounter++;
      const userData = {
        id: userId,
        email,
        password, // In real app, this should be hashed
        credits: 10,
        totalAssessments: 0,
        averageSpeedScore: 0,
        bestSpeedScore: 0,
        createdAt: new Date()
      };

      inMemoryUsers.set(email, userData);
      console.log('✅ User saved to memory');

      // Create JWT token
      const token = jwt.sign(
        { userId: userId },
        process.env.JWT_SECRET || 'fallback-secret-key',
        { expiresIn: '7d' }
      );

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        token,
        user: {
          id: userData.id,
          email: userData.email,
          credits: userData.credits,
          totalAssessments: userData.totalAssessments,
          averageSpeedScore: userData.averageSpeedScore,
          bestSpeedScore: userData.bestSpeedScore
        }
      });
    }

  } catch (error) {
    console.error('❌ Signup error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during signup: ' + error.message
    });
  }
});

// @route   POST /api/auth/signin
// @desc    Login user
// @access  Public
router.post('/signin', async (req, res) => {
  try {
    console.log('🔐 Signin request received:', req.body);
    
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }

    // Check if MongoDB is available
    const mongoAvailable = require('mongoose').connection.readyState === 1;
    
    if (mongoAvailable) {
      try {
        // Try MongoDB first
        console.log('💾 Attempting MongoDB signin...');
        
        const user = await User.findOne({ email });
        if (!user) {
          return res.status(400).json({ 
            success: false, 
            message: 'Invalid email or password' 
          });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
          return res.status(400).json({ 
            success: false, 
            message: 'Invalid email or password' 
          });
        }

        // Create JWT token
        const token = jwt.sign(
          { userId: user._id },
          process.env.JWT_SECRET || 'fallback-secret-key',
          { expiresIn: '7d' }
        );

        res.json({
          success: true,
          message: 'Login successful',
          token,
          user: {
            id: user._id,
            email: user.email,
            credits: user.credits || 10,
            totalAssessments: user.totalAssessments,
            averageSpeedScore: user.averageSpeedScore,
            bestSpeedScore: user.bestSpeedScore
          }
        });

      } catch (mongoError) {
        console.log('⚠️ MongoDB signin failed, using fallback:', mongoError.message);
        // Fall through to memory storage
      }
    }
    
    // Fallback: Use in-memory storage
    if (!mongoAvailable || true) { // Force fallback for now
      console.log('💾 Using in-memory storage for signin...');
      
      const userData = inMemoryUsers.get(email);
      if (!userData || userData.password !== password) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid email or password' 
        });
      }

      // Create JWT token
      const token = jwt.sign(
        { userId: userData.id },
        process.env.JWT_SECRET || 'fallback-secret-key',
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: userData.id,
          email: userData.email,
          credits: userData.credits,
          totalAssessments: userData.totalAssessments,
          averageSpeedScore: userData.averageSpeedScore,
          bestSpeedScore: userData.bestSpeedScore
        }
      });
    }

  } catch (error) {
    console.error('❌ Signin error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during signin: ' + error.message
    });
  }
});

module.exports = router;