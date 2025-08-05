import { createLogger } from "../../logger";
import { saleorApp } from "../../saleor-app";

const logger = createLogger("AuthDebugger");

export interface AuthDebugInfo {
  aplType: string;
  saleorApiUrl: string | undefined;
  authDataExists: boolean;
  authData: any;
  aplStats: {
    totalEntries: number;
    entries: Array<{ domain: string, hasToken: boolean, appId: string | undefined }>;
  };
  headers: {
    saleorApiUrl: string | undefined;
    authorization: string | undefined;
  };
}

export class AuthDebugger {
  static async debugAuthState(
    saleorApiUrl: string | undefined,
    headers: { [key: string]: string | string[] | undefined }
  ): Promise<AuthDebugInfo> {
    logger.info("Starting auth debug analysis", { saleorApiUrl });

    const authData = saleorApiUrl ? await saleorApp.apl.get(saleorApiUrl) : null;
    
    // Get all APL entries for debugging
    const allEntries = await this.getAllAplEntries();
    
    const debugInfo: AuthDebugInfo = {
      aplType: process.env.APL ?? "file",
      saleorApiUrl,
      authDataExists: !!authData,
      authData: authData ? {
        hasToken: !!authData.token,
        tokenLength: authData.token ? authData.token.length : 0,
        appId: authData.appId,
        saleorApiUrl: authData.saleorApiUrl,
        domain: authData.domain
      } : null,
      aplStats: {
        totalEntries: allEntries.length,
        entries: allEntries.map(entry => ({
          domain: entry.domain || entry.saleorApiUrl || 'unknown',
          hasToken: !!entry.token,
          appId: entry.appId
        }))
      },
      headers: {
        saleorApiUrl: headers['saleor-api-url'] as string | undefined,
        authorization: headers['authorization-bearer'] as string | undefined
      }
    };

    logger.info("Auth debug info gathered", debugInfo);
    
    return debugInfo;
  }

  private static async getAllAplEntries(): Promise<any[]> {
    try {
      // Try to get all entries from APL
      // Note: This is a bit hacky since APL doesn't expose a "getAll" method
      // We'll try to iterate through common patterns
      const entries: any[] = [];
      
      // Check if we can access the internal storage
      if ('getAll' in saleorApp.apl) {
        // @ts-ignore - some APL implementations might have getAll
        const allData = await saleorApp.apl.getAll();
        return Array.isArray(allData) ? allData : Object.values(allData || {});
      }
      
      return entries;
    } catch (error) {
      logger.warn("Could not retrieve all APL entries", { error });
      return [];
    }
  }

  static async checkAplHealth(): Promise<{
    isHealthy: boolean;
    aplType: string;
    canWrite: boolean;
    canRead: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    const aplType = process.env.APL ?? "file";
    let canWrite = false;
    let canRead = false;

    try {
      // Test write
      const testData = {
        domain: "test-domain-" + Date.now(),
        token: "test-token",
        saleorApiUrl: "https://test.saleor.cloud/graphql/",
        appId: "test-app-id"
      };
      
      await saleorApp.apl.set(testData);
      canWrite = true;
      
      // Test read
      const retrieved = await saleorApp.apl.get(testData.saleorApiUrl);
      canRead = !!retrieved;
      
      // Clean up test data
      await saleorApp.apl.delete(testData.saleorApiUrl);
      
    } catch (error) {
      errors.push(`APL test failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      isHealthy: canWrite && canRead && errors.length === 0,
      aplType,
      canWrite,
      canRead,
      errors
    };
  }

  static logAuthFailureDetails(
    saleorApiUrl: string | undefined,
    context: any,
    additionalInfo?: Record<string, any>
  ): void {
    logger.error("Authentication failure details", {
      saleorApiUrl,
      context: {
        hasSaleorApiUrl: !!context.saleorApiUrl,
        hasToken: !!context.token,
        hasAppId: !!context.appId,
        ssr: context.ssr
      },
      additionalInfo,
      timestamp: new Date().toISOString()
    });
  }
}