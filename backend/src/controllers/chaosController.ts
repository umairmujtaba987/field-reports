import { Request, Response } from 'express';
import { chaosConfig } from '../middleware/chaos';

export const getChaos = (_req: Request, res: Response) => {
  return res.json({
    chaosConfig,
    instructions: {
      headersSupported: {
        'x-chaos-delay': 'Delay in ms, e.g. "4000" for 4s delay',
        'x-chaos-drop': '"true" to terminate socket immediately mid-stream',
        'x-chaos-hang': '"true" to hold socket without answering',
        'x-chaos-error': 'HTTP status code, e.g. "500" or "503"',
      },
      globalConfig: 'POST /api/chaos with { enabled, delayMs, dropRate, failureRate, hangRate, errorCode }',
    },
  });
};

export const updateChaos = (req: Request, res: Response) => {
  const { enabled, delayMs, failureRate, dropRate, hangRate, errorCode } = req.body;

  if (typeof enabled === 'boolean') chaosConfig.enabled = enabled;
  if (typeof delayMs === 'number') chaosConfig.delayMs = delayMs;
  if (typeof failureRate === 'number') chaosConfig.failureRate = Math.min(Math.max(failureRate, 0), 1);
  if (typeof dropRate === 'number') chaosConfig.dropRate = Math.min(Math.max(dropRate, 0), 1);
  if (typeof hangRate === 'number') chaosConfig.hangRate = Math.min(Math.max(hangRate, 0), 1);
  if (typeof errorCode === 'number') chaosConfig.errorCode = errorCode;

  console.log('[CHAOS CONFIG UPDATED]', chaosConfig);
  return res.json({
    success: true,
    message: 'Chaos configuration updated successfully.',
    chaosConfig,
  });
};

