import express from 'express';
import bcrypt from 'bcryptjs';
import { User, Activity } from '../config/db.js';
import { verifyToken, checkRole } from '../middleware/auth.js';

const router = express.Router();

// Apply Admin restriction to all user management routes
router.use(verifyToken);
router.use(checkRole(['admin']));

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = await User.find();
    // Exclude passwords
    const sanitizedUsers = users.map(user => {
      const { password, ...rest } = user;
      return rest;
    });
    res.json(sanitizedUsers);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving users', error: err.message });
  }
});

// Create new user (Directly from Admin Dashboard)
router.post('/', async (req, res) => {
  const { username, password, fullName, nationalId, role } = req.body;

  if (!username || !password || !fullName || !nationalId || !role) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  if (!['admin', 'officer', 'citizen'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username is already taken' });
    }

    const existingNational = await User.findOne({ nationalId });
    if (existingNational) {
      return res.status(400).json({ message: 'National ID is already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      username,
      password: hashedPassword,
      fullName,
      nationalId,
      role,
    });

    await Activity.create({
      action: 'User Created',
      details: `Admin created user account ${username} as role ${role}`,
      performedBy: req.user.username,
    });

    const { password: _, ...sanitized } = newUser;
    res.status(201).json(sanitized);
  } catch (err) {
    res.status(500).json({ message: 'Error creating user', error: err.message });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Do not let admin delete their own account
    if (user.username === req.user.username) {
      return res.status(400).json({ message: 'Cannot delete your own admin account.' });
    }

    await User.deleteOne({ _id: id });

    await Activity.create({
      action: 'User Deleted',
      details: `Admin deleted user account ${user.username}`,
      performedBy: req.user.username,
    });

    res.json({ message: `User ${user.username} deleted successfully.` });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting user', error: err.message });
  }
});

export default router;
