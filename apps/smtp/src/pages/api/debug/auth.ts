import { NextApiRequest, NextApiResponse } from "next";
import { AuthDebugger } from "../../../modules/debug/auth-debugger";
import { createLogger } from "../../../logger";

const logger = createLogger("DebugAuthApi");

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const saleorApiUrl = req.headers['saleor-api-url'] as string | undefined;
    
    logger.info("Debug auth endpoint called", { 
      saleorApiUrl,
      headers: Object.keys(req.headers)
    });

    // Get comprehensive auth debug info
    const authDebugInfo = await AuthDebugger.debugAuthState(saleorApiUrl, req.headers);
    
    // Check APL health
    const aplHealth = await AuthDebugger.checkAplHealth();
    
    const response = {
      timestamp: new Date().toISOString(),
      requestInfo: {
        method: req.method,
        url: req.url,
        userAgent: req.headers['user-agent'],
        origin: req.headers.origin
      },
      authDebugInfo,
      aplHealth,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        aplType: process.env.APL,
        hasSecretKey: !!process.env.SECRET_KEY,
        allowedDomainPattern: process.env.ALLOWED_DOMAIN_PATTERN
      }
    };

    logger.info("Debug auth response prepared", { 
      authDataExists: authDebugInfo.authDataExists,
      aplHealthy: aplHealth.isHealthy,
      totalAplEntries: authDebugInfo.aplStats.totalEntries
    });

    res.status(200).json(response);
  } catch (error) {
    logger.error("Error in debug auth endpoint", { error });
    
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}