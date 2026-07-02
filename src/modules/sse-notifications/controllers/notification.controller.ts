import { Request, Response } from 'express';
import { AuthenticatedRequest } from '@common/types';
import { notificationService } from '../services/notification.service';

export class NotificationController {

  getWashingStatus = async (req: Request, res: Response) => {
    // ── SSE headers ──
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    const flushResponse = () => {
      if (typeof (res as any).flush === 'function') {
        (res as any).flush();
      }
    };
    flushResponse();

    const { id: userId } = (req as AuthenticatedRequest).user;

    // Resolve filter params based on role
    let branchId: string | undefined;

    try {
      branchId = await notificationService.resolveUserBranch(userId);
    } catch (err) {
      console.error('SSE: failed to resolve user context', err);
    }

    // Send initial data immediately
    try {
      if (branchId) {
        const data = await notificationService.getWashingStatus(branchId);
        res.write(`data: ${JSON.stringify({ type: 'washing_status', data })}\n\n`);
      }
      flushResponse();
    } catch (err) {
      console.error('SSE: initial fetch failed', err);
    }

    // Poll every 5 seconds
    const POLL_INTERVAL_MS = 5_000;
    const intervalId = setInterval(async () => {
      try {
        if (branchId) {
          const data = await notificationService.getWashingStatus(branchId);
          res.write(`data: ${JSON.stringify({ type: 'washing_status', data })}\n\n`);
        }
        flushResponse();
      } catch (err) {
        console.error('SSE: poll failed', err);
      }
    }, POLL_INTERVAL_MS);

    // Clean up on disconnect
    req.on('close', () => {
      clearInterval(intervalId);
      console.log('❌ SSE client disconnected');
      res.end();
    });
  };
}

export const notificationController = new NotificationController();
