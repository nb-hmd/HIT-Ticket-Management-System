import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { TicketAttachment } from '../models/index';

const router = Router();

// Create uploads directory if it doesn't exist
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allow specific file types
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') // 10MB default
  }
});

// Upload file for ticket
router.post('/ticket/:ticketId', authenticateToken, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const { ticketId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = path.extname(file.originalname);
    const filename = `${timestamp}_${randomString}${fileExtension}`;
    const filePath = path.join(uploadDir, filename);

    // Save file to disk
    fs.writeFileSync(filePath, file.buffer);

    // Save file info to database
    const attachment = await TicketAttachment.create({
      ticket_id: ticketId,
      filename: file.originalname,
      file_path: `/uploads/${filename}`,
      mime_type: file.mimetype,
      file_size: file.size
    });

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        id: attachment.id,
        filename: attachment.filename,
        file_path: attachment.file_path,
        mime_type: attachment.mime_type,
        file_size: attachment.file_size,
        uploaded_at: attachment.uploaded_at
      }
    });

  } catch (error: any) {
    console.error('Upload error:', error);
    
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 10MB.'
        });
      }
    }

    res.status(500).json({
      success: false,
      message: 'File upload failed'
    });
  }
});

// Get file by ID
router.get('/file/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const attachment = await TicketAttachment.findByPk(id);
    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    const filePath = path.join(__dirname, '../..', attachment.file_path);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on disk'
      });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', attachment.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.filename}"`);
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error: any) {
    console.error('Get file error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete file
router.delete('/file/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const attachment = await TicketAttachment.findByPk(id);
    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Check permissions (only admin or ticket owner can delete)
    if (req.user!.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const filePath = path.join(__dirname, '../..', attachment.file_path);
    
    // Delete file from disk
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete from database
    await attachment.destroy();

    res.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error: any) {
    console.error('Delete file error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get ticket attachments
router.get('/ticket/:ticketId/files', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { ticketId } = req.params;

    const attachments = await TicketAttachment.findAll({
      where: { ticket_id: ticketId },
      order: [['uploaded_at', 'DESC']]
    });

    res.json({
      success: true,
      data: attachments
    });

  } catch (error: any) {
    console.error('Get ticket files error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;