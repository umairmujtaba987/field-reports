import { Request, Response } from 'express';
import fs from 'fs';
import { store } from '../services/store';
import { ReportImage } from '../types';
import { MIN_IMAGE_COUNT, MAX_IMAGE_COUNT } from '../middleware/upload';

export const listReports = (req: Request, res: Response) => {
  const reports = store.getAll();
  return res.json({
    count: reports.length,
    reports,
  });
};

export const getReport = (req: Request, res: Response) => {
  const { id } = req.params;
  const report = store.getById(id);

  if (!report) {
    return res.status(404).json({ error: `Report with ID ${id} not found.` });
  }

  return res.json(report);
};

export const createReport = (req: Request, res: Response) => {
  const { clientReportId, description } = req.body;
  const files = (req.files as Express.Multer.File[]) || [];

  // Helper to cleanup newly uploaded files in case of validation or duplicate failure
  const cleanupFiles = () => {
    for (const file of files) {
      if (file.path && fs.existsSync(file.path)) {
        try {
          fs.unlinkSync(file.path);
        } catch (e) {
          // ignore unlink error
        }
      }
    }
  };

  // 1. Validation: Description required (non-blank)
  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    cleanupFiles();
    return res.status(400).json({
      error: 'Description is required and must not be empty.',
      code: 'MISSING_DESCRIPTION',
    });
  }

  // 2. Validation: clientReportId required for Idempotency
  if (!clientReportId || typeof clientReportId !== 'string' || clientReportId.trim().length === 0) {
    cleanupFiles();
    return res.status(400).json({
      error: 'clientReportId is required for idempotency.',
      code: 'MISSING_CLIENT_REPORT_ID',
    });
  }

  // 3. Idempotency Check: "Nothing lands twice"
  const existingReport = store.getByClientId(clientReportId);
  if (existingReport) {
    console.log(`[IDEMPOTENCY] Client report ${clientReportId} already exists. Returning existing.`);
    cleanupFiles(); // Discard duplicate files
    return res.status(200).json(existingReport);
  }

  // 4. Validation: 1 to 5 images
  if (files.length < MIN_IMAGE_COUNT || files.length > MAX_IMAGE_COUNT) {
    cleanupFiles();
    return res.status(400).json({
      error: `Each report must have between ${MIN_IMAGE_COUNT} and ${MAX_IMAGE_COUNT} images. Received: ${files.length}.`,
      code: 'INVALID_IMAGE_COUNT',
    });
  }

  // 5. Construct Image Objects
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.protocol;
  const images: ReportImage[] = files.map((file, idx) => ({
    id: `${clientReportId}-img-${idx + 1}`,
    filename: file.filename,
    originalName: file.originalname,
    size: file.size,
    mimetype: file.mimetype,
    url: `${protocol}://${host}/uploads/${file.filename}`,
  }));

  // 6. Save Report
  const newReport = store.create({
    clientReportId,
    description: description.trim(),
    images,
  });

  console.log(`[REPORT CREATED] ID: ${newReport.id} (Client ID: ${clientReportId}) with ${images.length} images.`);
  return res.status(201).json(newReport);
};

export const resetReports = (_req: Request, res: Response) => {
  store.reset();
  return res.json({
    success: true,
    message: 'Start over executed: All reports and uploaded images have been wiped.',
  });
};

