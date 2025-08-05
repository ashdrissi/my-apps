import { APL, AuthData } from "@saleor/app-sdk/APL";
import { promises as fs } from "fs";
import { createLogger } from "../logger";

const logger = createLogger("MultiDomainFileAPL");

export class MultiDomainFileAPL implements APL {
  private filePath: string;

  constructor(filePath: string = ".saleor-app-auth.json") {
    this.filePath = filePath;
  }

  async get(saleorApiUrl: string): Promise<AuthData | undefined> {
    try {
      logger.debug(`Getting auth data for URL: ${saleorApiUrl}`);
      
      const fileContent = await fs.readFile(this.filePath, "utf-8");
      const authData = JSON.parse(fileContent);

      // Check if it's multi-domain format (object with URLs as keys)
      if (typeof authData === "object" && authData[saleorApiUrl]) {
        logger.debug(`Found auth data in multi-domain format for: ${saleorApiUrl}`);
        return authData[saleorApiUrl];
      }

      // Check if it's single-domain format and matches the URL
      if (authData.saleorApiUrl === saleorApiUrl) {
        logger.debug(`Found auth data in single-domain format for: ${saleorApiUrl}`);
        return authData;
      }

      logger.debug(`No auth data found for: ${saleorApiUrl}`);
      return undefined;
    } catch (error) {
      logger.error(`Error reading auth file: ${error}`);
      return undefined;
    }
  }

  async set(authData: AuthData): Promise<void> {
    try {
      logger.debug(`Setting auth data for URL: ${authData.saleorApiUrl}`);
      
      let existingData: Record<string, AuthData> = {};

      // Try to read existing data
      try {
        const fileContent = await fs.readFile(this.filePath, "utf-8");
        const parsedData = JSON.parse(fileContent);

        // If it's already in multi-domain format, use it
        if (typeof parsedData === "object" && !parsedData.saleorApiUrl) {
          existingData = parsedData;
        } else if (parsedData.saleorApiUrl) {
          // Convert single-domain format to multi-domain format
          existingData[parsedData.saleorApiUrl] = parsedData;
        }
      } catch (error) {
        logger.debug("No existing auth file found, creating new one");
      }

      // Add or update the auth data for this URL
      existingData[authData.saleorApiUrl] = authData;

      // Write back to file
      await fs.writeFile(this.filePath, JSON.stringify(existingData, null, 2));
      logger.debug(`Auth data saved for: ${authData.saleorApiUrl}`);
    } catch (error) {
      logger.error(`Error writing auth file: ${error}`);
      throw error;
    }
  }

  async delete(saleorApiUrl: string): Promise<void> {
    try {
      logger.debug(`Deleting auth data for URL: ${saleorApiUrl}`);
      
      const fileContent = await fs.readFile(this.filePath, "utf-8");
      const authData = JSON.parse(fileContent);

      // If it's multi-domain format
      if (typeof authData === "object" && !authData.saleorApiUrl) {
        delete authData[saleorApiUrl];
        await fs.writeFile(this.filePath, JSON.stringify(authData, null, 2));
      } else if (authData.saleorApiUrl === saleorApiUrl) {
        // If it's single-domain format and matches, delete the entire file
        await fs.unlink(this.filePath);
      }

      logger.debug(`Auth data deleted for: ${saleorApiUrl}`);
    } catch (error) {
      logger.error(`Error deleting auth data: ${error}`);
      throw error;
    }
  }

  async getAll(): Promise<AuthData[]> {
    try {
      logger.debug("Getting all auth data");
      
      const fileContent = await fs.readFile(this.filePath, "utf-8");
      const authData = JSON.parse(fileContent);

      // If it's multi-domain format
      if (typeof authData === "object" && !authData.saleorApiUrl) {
        return Object.values(authData);
      }

      // If it's single-domain format
      if (authData.saleorApiUrl) {
        return [authData];
      }

      return [];
    } catch (error) {
      logger.error(`Error reading all auth data: ${error}`);
      return [];
    }
  }

  async isReady(): Promise<boolean> {
    // APL is always ready for file operations
    return true;
  }

  async isConfigured(): Promise<boolean> {
    try {
      const fileContent = await fs.readFile(this.filePath, "utf-8");
      const authData = JSON.parse(fileContent);
      
      // Check if we have any auth data
      if (typeof authData === "object" && !authData.saleorApiUrl) {
        return Object.keys(authData).length > 0;
      }
      
      return !!authData.saleorApiUrl;
    } catch {
      // If file doesn't exist, APL is still configured (ready to accept data)
      return true;
    }
  }
}