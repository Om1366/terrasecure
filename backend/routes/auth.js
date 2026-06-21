import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, Activity } from '../config/db.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'terrasecure_super_secret_key_123';

// Register Citizen / General Public
router.post('/register', async (req, res) => {
  const { username, password, fullName, nationalId, role } = req.body;

  if (!username || !password || !fullName || !nationalId) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  // Ensure role is valid or default to citizen
  const userRole = role && ['admin', 'officer', 'citizen'].includes(role) ? role : 'citizen';

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username is already taken' });
    }

    const existingNationalId = await User.findOne({ nationalId });
    if (existingNationalId) {
      return res.status(400).json({ message: 'National ID is already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      username,
      password: hashedPassword,
      fullName,
      nationalId,
      role: userRole,
    });

    // Log Activity
    await Activity.create({
      action: 'User Registered',
      details: `${fullName} registered as a ${userRole}`,
      performedBy: username,
    });

    const token = jwt.sign(
      { id: newUser._id, username: newUser.username, role: newUser.role, fullName: newUser.fullName },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(201).json({
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        role: newUser.role,
        fullName: newUser.fullName,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error during registration', error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role, fullName: user.fullName },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        fullName: user.fullName,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error during login', error: err.message });
  }
});

// Get current logged in user details
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      id: user._id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      nationalId: user.nationalId,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching profile' });
  }
});

export default router;
