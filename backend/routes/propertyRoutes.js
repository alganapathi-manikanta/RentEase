import express from 'express';
import {
  createProperty,
  deleteProperty,
  getMyProperties,
  getProperties,
  getPropertyById,
  getProperty3D,
  saveProperty3D,
  deleteProperty3D,
  updateProperty,
  incrementPropertyViews,
} from '../controllers/propertyController.js';
import { authorize, protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getProperties);
router.get('/my-properties', protect, authorize('landlord'), getMyProperties);
router.get('/my', protect, authorize('landlord'), getMyProperties);
router.get('/:id', getPropertyById);
router.post('/:id/view', incrementPropertyViews);
router.post('/', protect, authorize('landlord'), createProperty);
router.put('/:id', protect, authorize('landlord'), updateProperty);
router.delete('/:id', protect, authorize('landlord'), deleteProperty);
router.get('/:id/3d', getProperty3D);
router.post('/:id/3d', protect, authorize('landlord'), saveProperty3D);
router.put('/:id/3d', protect, authorize('landlord'), saveProperty3D);
router.delete('/:id/3d', protect, authorize('landlord'), deleteProperty3D);

export default router;
