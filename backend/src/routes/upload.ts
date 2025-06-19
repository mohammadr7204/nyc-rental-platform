import express, { Response } from 'express';
import multer from 'multer';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = express.Router();

// Configure AWS S3
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

const bucket = process.env.AWS_S3_BUCKET!;

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and documents
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and documents are allowed.'));
    }
  }
});

// Upload single file
router.post('/single', upload.single('file'), asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { folder = 'general' } = req.body;
  const fileExtension = req.file.originalname.split('.').pop();
  const fileName = `${folder}/${uuidv4()}.${fileExtension}`;

  const uploadCommand = new PutObjectCommand({
    Bucket: bucket,
    Key: fileName,
    Body: req.file.buffer,
    ContentType: req.file.mimetype,
    Metadata: {
      userId: req.user!.userId,
      originalName: req.file.originalname
    }
  });

  try {
    await s3Client.send(uploadCommand);

    const fileUrl = `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        fileName,
        fileUrl,
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype
      }
    });
  } catch (error) {
    console.error('S3 upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
}));

// Upload multiple files
router.post('/multiple', upload.array('files', 10), asyncHandler(async (req: AuthRequest, res: Response) => {
  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const { folder = 'general' } = req.body;
  const uploadedFiles = [];

  try {
    for (const file of files) {
      const fileExtension = file.originalname.split('.').pop();
      const fileName = `${folder}/${uuidv4()}.${fileExtension}`;

      const uploadCommand = new PutObjectCommand({
        Bucket: bucket,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          userId: req.user!.userId,
          originalName: file.originalname
        }
      });

      await s3Client.send(uploadCommand);

      const fileUrl = `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

      uploadedFiles.push({
        fileName,
        fileUrl,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype
      });
    }

    res.json({
      success: true,
      message: `${uploadedFiles.length} files uploaded successfully`,
      data: uploadedFiles
    });
  } catch (error) {
    console.error('S3 upload error:', error);
    res.status(500).json({ error: 'Failed to upload files' });
  }
}));

// Generate presigned URL for direct upload
router.post('/presigned-url', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { fileName, fileType, folder = 'general' } = req.body;

  if (!fileName || !fileType) {
    return res.status(400).json({ error: 'fileName and fileType are required' });
  }

  const fileExtension = fileName.split('.').pop();
  const key = `${folder}/${uuidv4()}.${fileExtension}`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: fileType,
    Metadata: {
      userId: req.user!.userId,
      originalName: fileName
    }
  });

  try {
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    const fileUrl = `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    res.json({
      success: true,
      data: {
        signedUrl,
        fileUrl,
        key
      }
    });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
}));

// Delete file
router.delete('/:fileName', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { fileName } = req.params;

  const deleteCommand = new DeleteObjectCommand({
    Bucket: bucket,
    Key: fileName
  });

  try {
    await s3Client.send(deleteCommand);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('S3 delete error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
}));

export default router;