import express from 'express';
import crypto from 'crypto';
import { Property, Transfer, Activity } from '../config/db.js';
import { verifyToken, checkRole } from '../middleware/auth.js';

const router = express.Router();

const generatePropertyHash = (propertyId, address, area, owner, status) => {
  const content = `${propertyId}|${address}|${area}|${owner}|${status}`;
  return crypto.createHash('sha256').update(content).digest('hex');
};

const generateDeedHash = (propertyId, fromOwner, toOwner, saleValue, dateStr) => {
  const content = `${propertyId}|${fromOwner}|${toOwner}|${saleValue}|${dateStr}`;
  return crypto.createHash('sha256').update(content).digest('hex');
};

// List all transfers (Officer / Admin)
router.get('/', verifyToken, checkRole(['officer', 'admin']), async (req, res) => {
  try {
    const transfers = await Transfer.find();
    res.json(transfers);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving transfers', error: err.message });
  }
});

// Initiate Ownership Transfer (Officer / Admin)
router.post('/', verifyToken, checkRole(['officer', 'admin']), async (req, res) => {
  const { propertyId, fromOwner, toOwner, saleValue } = req.body;

  if (!propertyId || !fromOwner || !toOwner || !saleValue) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    // Verify Property exists and is eligible for transfer
    const property = await Property.findOne({ propertyId });
    if (!property) {
      return res.status(404).json({ message: `Property ${propertyId} not found.` });
    }

    if (property.status === 'Transfer Pending' || property.status === 'Pending Approval') {
      return res.status(400).json({
        message: 'This property has a pending registration or transfer action. Resolve it first.',
      });
    }

    // Generate unique Transfer ID: TX-2026-XXXX
    const year = new Date().getFullYear();
    let isUnique = false;
    let transferId = '';
    while (!isUnique) {
      const suffix = Math.floor(1000 + Math.random() * 9000);
      transferId = `TX-${year}-${suffix}`;
      const existing = await Transfer.findOne({ transferId });
      if (!existing) isUnique = true;
    }

    const timestamp = new Date().toISOString();
    const deedHash = generateDeedHash(propertyId, fromOwner, toOwner, saleValue, timestamp);

    // Create the transfer record
    const newTransfer = await Transfer.create({
      transferId,
      propertyId,
      fromOwner,
      toOwner,
      saleValue: parseFloat(saleValue),
      status: 'Pending Approval',
      deedHash,
      transferDate: timestamp,
    });

    // Update Property status to lock it during transfer
    const newPropertyHash = generatePropertyHash(
      property.propertyId,
      property.address,
      property.area,
      property.currentOwner,
      'Transfer Pending'
    );

    await Property.updateOne(
      { propertyId },
      { status: 'Transfer Pending', securityHash: newPropertyHash }
    );

    // Log Activity
    await Activity.create({
      action: 'Transfer Initiated',
      details: `Initiated transfer ${transferId} for ${propertyId} from ${fromOwner} to ${toOwner}`,
      performedBy: req.user.username,
    });

    res.status(201).json(newTransfer);
  } catch (err) {
    res.status(500).json({ message: 'Error initiating transfer', error: err.message });
  }
});

// Approve or Reject Transfer (Officer / Admin)
router.post('/:id/approve', verifyToken, checkRole(['officer', 'admin']), async (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // 'Approve' or 'Reject'

  if (!action || !['Approve', 'Reject'].includes(action)) {
    return res.status(400).json({ message: "Invalid action. Use 'Approve' or 'Reject'." });
  }

  try {
    const transfer = await Transfer.findById(id);
    if (!transfer) {
      return res.status(404).json({ message: 'Transfer record not found.' });
    }

    if (transfer.status !== 'Pending Approval') {
      return res.status(400).json({ message: `Transfer has already been processed: ${transfer.status}` });
    }

    const property = await Property.findOne({ propertyId: transfer.propertyId });
    if (!property) {
      return res.status(404).json({ message: 'Associated property not found.' });
    }

    if (action === 'Approve') {
      // Approve transfer
      await Transfer.findByIdAndUpdate(id, {
        status: 'Approved',
        approvedBy: req.user.username,
      });

      // Update property owner and reset status to Registered
      const newPropertyHash = generatePropertyHash(
        property.propertyId,
        property.address,
        property.area,
        transfer.toOwner,
        'Registered'
      );

      await Property.updateOne(
        { propertyId: transfer.propertyId },
        {
          currentOwner: transfer.toOwner,
          status: 'Registered',
          securityHash: newPropertyHash,
        }
      );

      await Activity.create({
        action: 'Transfer Approved',
        details: `Approved transfer ${transfer.transferId}. Ownership of ${transfer.propertyId} transferred to ${transfer.toOwner}`,
        performedBy: req.user.username,
      });

      res.json({ message: 'Transfer approved successfully.', status: 'Approved' });
    } else {
      // Reject transfer
      await Transfer.findByIdAndUpdate(id, {
        status: 'Rejected',
        approvedBy: req.user.username,
      });

      // Unlock property back to Registered with original owner
      const resetPropertyHash = generatePropertyHash(
        property.propertyId,
        property.address,
        property.area,
        property.currentOwner,
        'Registered'
      );

      await Property.updateOne(
        { propertyId: transfer.propertyId },
        { status: 'Registered', securityHash: resetPropertyHash }
      );

      await Activity.create({
        action: 'Transfer Rejected',
        details: `Rejected transfer ${transfer.transferId} for ${transfer.propertyId}`,
        performedBy: req.user.username,
      });

      res.json({ message: 'Transfer rejected.', status: 'Rejected' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error processing transfer', error: err.message });
  }
});

export default router;
