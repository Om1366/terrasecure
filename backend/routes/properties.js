import express from 'express';
import crypto from 'crypto';
import { Property, Activity } from '../config/db.js';
import { verifyToken, checkRole } from '../middleware/auth.js';

const router = express.Router();

// Generate cryptographic hash of property fields
const generatePropertyHash = (propertyId, address, area, owner, status) => {
  const content = `${propertyId}|${address}|${area}|${owner}|${status}`;
  return crypto.createHash('sha256').update(content).digest('hex');
};

// Search property by ID (PUBLIC)
router.get('/search/:propertyId', async (req, res) => {
  const { propertyId } = req.params;
  try {
    const property = await Property.findOne({ propertyId });
    if (!property) {
      return res.status(404).json({ message: `Property with ID '${propertyId}' not found.` });
    }
    res.json(property);
  } catch (err) {
    res.status(500).json({ message: 'Error searching property', error: err.message });
  }
});

// List all properties (Officer / Admin)
router.get('/', verifyToken, checkRole(['officer', 'admin']), async (req, res) => {
  try {
    const properties = await Property.find();
    res.json(properties);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving properties', error: err.message });
  }
});

// Register New Property (Officer / Admin)
router.post('/', verifyToken, checkRole(['officer', 'admin']), async (req, res) => {
  const { address, area, propertyType, currentOwner, boundaryCoordinates } = req.body;

  if (!address || !area || !propertyType || !currentOwner || !boundaryCoordinates) {
    return res.status(400).json({ message: 'Please provide all required fields' });
  }

  try {
    // Generate a unique Property ID: PROP-2026-XXXX
    const year = new Date().getFullYear();
    let isUnique = false;
    let propertyId = '';
    
    while (!isUnique) {
      const suffix = Math.floor(1000 + Math.random() * 9000);
      propertyId = `PROP-${year}-${suffix}`;
      const existing = await Property.findOne({ propertyId });
      if (!existing) isUnique = true;
    }

    const defaultStatus = 'Registered'; // Officer registerations are instantly approved or pending
    const securityHash = generatePropertyHash(
      propertyId,
      address,
      area,
      currentOwner,
      defaultStatus
    );

    const newProperty = await Property.create({
      propertyId,
      address,
      area: parseFloat(area),
      propertyType,
      currentOwner,
      boundaryCoordinates,
      status: defaultStatus,
      securityHash,
    });

    // Record system activity
    await Activity.create({
      action: 'Property Registered',
      details: `Registered ${propertyType} property ${propertyId} for owner ${currentOwner}`,
      performedBy: req.user.username,
    });

    res.status(201).json(newProperty);
  } catch (err) {
    res.status(500).json({ message: 'Error registering property', error: err.message });
  }
});

// Update Property Status (Officer / Admin)
router.put('/:id/status', verifyToken, checkRole(['officer', 'admin']), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ message: 'Status is required' });
  }

  try {
    const property = await Property.findById(id);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Recompute hash with new status
    const newHash = generatePropertyHash(
      property.propertyId,
      property.address,
      property.area,
      property.currentOwner,
      status
    );

    const updatedProperty = await Property.findByIdAndUpdate(
      id,
      { status, securityHash: newHash },
      { new: true }
    );

    await Activity.create({
      action: 'Status Updated',
      details: `Status of property ${property.propertyId} changed to ${status}`,
      performedBy: req.user.username,
    });

    res.json(updatedProperty);
  } catch (err) {
    res.status(500).json({ message: 'Error updating status', error: err.message });
  }
});

export default router;
