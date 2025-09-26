import { Router, Request, Response } from 'express';
import { Notification } from '../models/index';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Check if database is available
const isDatabaseAvailable = async () => {
  try {
    await Notification.findOne({ limit: 1 });
    return true;
  } catch (error) {
    return false;
  }
};

// Get unread notification count
router.get('/unread-count', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    let count = 0;
    const dbAvailable = await isDatabaseAvailable();
    
    if (dbAvailable) {
      try {
        count = await Notification.count({
          where: {
            user_id: req.user!.id,
            is_read: false
          }
        });
      } catch (dbError) {
        console.warn('Database query failed for notification count:', dbError.message);
        count = 0;
      }
    }
    
    res.json({
      success: true,
      count
    });
    
  } catch (error) {
    console.error('Get notification count error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get user notifications
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, unread_only = false } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const whereClause: any = {
      user_id: req.user!.id
    };

    if (unread_only === 'true') {
      whereClause.is_read = false;
    }

    const { count, rows: notifications } = await Notification.findAndCountAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit: Number(limit),
      offset
    });

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: count,
          pages: Math.ceil(count / Number(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get unread notification count
router.get('/unread-count', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const count = await Notification.count({
      where: {
        user_id: req.user!.id,
        is_read: false
      }
    });

    res.json({
      success: true,
      data: { count }
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Mark notification as read
router.put('/:id/read', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOne({
      where: {
        id,
        user_id: req.user!.id
      }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    await notification.update({
      is_read: true,
      read_at: new Date()
    });

    res.json({
      success: true,
      message: 'Notification marked as read'
    });

  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Mark all notifications as read
router.put('/mark-all-read', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await Notification.update(
      {
        is_read: true,
        read_at: new Date()
      },
      {
        where: {
          user_id: req.user!.id,
          is_read: false
        }
      }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });

  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete notification
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOne({
      where: {
        id,
        user_id: req.user!.id
      }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    await notification.destroy();

    res.json({
      success: true,
      message: 'Notification deleted'
    });

  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Server-Sent Events for real-time notifications
router.get('/stream', authenticateToken, (req: AuthRequest, res: Response) => {
  // Set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Connected to notification stream' })}\n\n`);

  // Keep connection alive with heartbeat
  const heartbeat = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`);
  }, 30000);

  // Store connection for sending notifications
  // In a production environment, you would store this in Redis or similar
  const userId = req.user!.id;
  if (!global.sseConnections) {
    global.sseConnections = new Map();
  }
  global.sseConnections.set(userId, res);

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    global.sseConnections?.delete(userId);
  });

  req.on('error', () => {
    clearInterval(heartbeat);
    global.sseConnections?.delete(userId);
  });
});

// Helper function to send real-time notification
export const sendRealTimeNotification = (userId: string, notification: any) => {
  if (global.sseConnections?.has(userId)) {
    const connection = global.sseConnections.get(userId);
    try {
      connection.write(`data: ${JSON.stringify({ 
        type: 'notification', 
        data: notification 
      })}\n\n`);
    } catch (error) {
      console.error('Error sending real-time notification:', error);
      global.sseConnections?.delete(userId);
    }
  }
};

export default router;