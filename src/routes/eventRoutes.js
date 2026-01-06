import express from 'express';
import multer from 'multer';
import { EventController } from '../controllers/eventController.js';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/json' || file.mimetype === 'text/csv') {
      cb(null, true);
    } else {
      cb(new Error('Only JSON and CSV files are allowed'));
    }
  },
});

// Event operations
router.post('/', EventController.createEvent);
router.post('/batch', EventController.createBatchEvents);
router.post('/upload', upload.single('file'), EventController.uploadEvents);
router.get('/lead/:leadId', EventController.getEvents);

export default router;