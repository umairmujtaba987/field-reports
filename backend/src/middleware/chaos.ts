import { Request, Response, NextFunction } from 'express';
import { ChaosConfig } from '../types';

export const chaosConfig: ChaosConfig = {
  enabled: process.env.CHAOS_ENABLED === 'true',
  delayMs: Number(process.env.CHAOS_DELAY_MS || 0),
  failureRate: Number(process.env.CHAOS_FAILURE_RATE || 0),
  dropRate: Number(process.env.CHAOS_DROP_RATE || 0),
  hangRate: Number(process.env.CHAOS_HANG_RATE || 0),
  errorCode: Number(process.env.CHAOS_ERROR_CODE || 500),
};

export const chaosMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // Never disrupt the chaos control or reset endpoints themselves
  if (req.path.startsWith('/api/chaos') || req.path === '/api/reset') {
    return next();
  }

  // 1. Check for explicit request headers (highest priority)
  const headerDelay = req.header('x-chaos-delay');
  const headerDrop = req.header('x-chaos-drop');
  const headerHang = req.header('x-chaos-hang');
  const headerError = req.header('x-chaos-error');

  // Explicit Drop: Abruptly terminate TCP socket
  if (headerDrop === 'true' || headerDrop === '1') {
    console.warn(`[CHAOS] [Header] Dropping connection abruptly on ${req.method} ${req.path}`);
    req.socket.destroy();
    return;
  }

  // Explicit Hang: Hold connection open, never answer
  if (headerHang === 'true' || headerHang === '1') {
    console.warn(`[CHAOS] [Header] Hanging request indefinitely on ${req.method} ${req.path}`);
    // Intentionally do not call next() or res.send()
    return;
  }

  // Explicit Error status code
  if (headerError) {
    const code = parseInt(headerError, 10) || 500;
    console.warn(`[CHAOS] [Header] Returning forced error ${code} on ${req.method} ${req.path}`);
    return res.status(code).json({
      error: `Chaos simulation forced error (${code})`,
      path: req.path,
    });
  }

  // Explicit Delay
  if (headerDelay) {
    const ms = parseInt(headerDelay, 10);
    if (!isNaN(ms) && ms > 0) {
      console.log(`[CHAOS] [Header] Delaying response by ${ms}ms on ${req.method} ${req.path}`);
      await new Promise((resolve) => setTimeout(resolve, ms));
    }
  }

  // 2. Global Chaos Simulation (if enabled)
  if (chaosConfig.enabled) {
    // Latency simulation (e.g. 2G simulation)
    if (chaosConfig.delayMs > 0) {
      console.log(`[CHAOS] [Global] Delaying response by ${chaosConfig.delayMs}ms`);
      await new Promise((resolve) => setTimeout(resolve, chaosConfig.delayMs));
    }

    // Dropped connection simulation
    if (chaosConfig.dropRate > 0 && Math.random() < chaosConfig.dropRate) {
      console.warn(`[CHAOS] [Global] Simulating dropped connection on ${req.method} ${req.path}`);
      req.socket.destroy();
      return;
    }

    // Hanging connection simulation
    if (chaosConfig.hangRate > 0 && Math.random() < chaosConfig.hangRate) {
      console.warn(`[CHAOS] [Global] Simulating hanging request on ${req.method} ${req.path}`);
      return;
    }

    // Server error simulation
    if (chaosConfig.failureRate > 0 && Math.random() < chaosConfig.failureRate) {
      const code = chaosConfig.errorCode || 500;
      console.warn(`[CHAOS] [Global] Simulating server failure (${code}) on ${req.method} ${req.path}`);
      return res.status(code).json({
        error: `Chaos simulation random failure (${code})`,
        path: req.path,
      });
    }
  }

  return next();
};

