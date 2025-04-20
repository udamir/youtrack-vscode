import type * as vscode from "vscode"
import * as crypto from "node:crypto"
import * as logger from "../../utils/logger"
import { EXTENSION_NAME, SECURE_STORAGE_KEY_BASE_URL, SECURE_STORAGE_KEY_TOKEN } from "./vscode.consts"

/**
 * Service for securely storing and retrieving YouTrack credentials
 */
export class SecureStorageService {
  private secrets: vscode.SecretStorage
  private globalState: vscode.Memento

  /**
   * Create a new instance of the SecureStorageService
   * @param context VS Code extension context
   */
  constructor(context: vscode.ExtensionContext) {
    this.secrets = context.secrets
    this.globalState = context.globalState
  }

  /**
   * Store YouTrack permanent token securely
   * @param token YouTrack permanent token
   */
  public async storeToken(token: string): Promise<void> {
    try {
      await this.secrets.store(SECURE_STORAGE_KEY_TOKEN, token)
      logger.debug("YouTrack token stored securely")
    } catch (error) {
      logger.error("Failed to store YouTrack token securely", error)
      throw new Error("Failed to store credentials securely")
    }
  }

  /**
   * Retrieve the stored YouTrack token
   * @returns The stored token or undefined if not found
   */
  public async getToken(): Promise<string | undefined> {
    try {
      return await this.secrets.get(SECURE_STORAGE_KEY_TOKEN)
    } catch (error) {
      logger.error("Failed to retrieve YouTrack token", error)
      return undefined
    }
  }

  /**
   * Store YouTrack instance base URL
   * @param baseUrl YouTrack instance URL
   */
  public async storeBaseUrl(baseUrl: string): Promise<void> {
    try {
      await this.secrets.store(SECURE_STORAGE_KEY_BASE_URL, baseUrl)
      logger.debug("YouTrack base URL stored")
    } catch (error) {
      logger.error("Failed to store YouTrack base URL", error)
      throw new Error("Failed to store YouTrack base URL")
    }
  }

  /**
   * Retrieve the stored YouTrack instance URL
   * @returns The stored URL or undefined if not found
   */
  public getBaseUrl(): string | undefined {
    return this.globalState.get<string>(SECURE_STORAGE_KEY_BASE_URL)
  }

  /**
   * Clear all stored credentials
   */
  public async clearCredentials(): Promise<void> {
    try {
      await this.secrets.delete(SECURE_STORAGE_KEY_TOKEN)
      await this.globalState.update(SECURE_STORAGE_KEY_BASE_URL, undefined)
      logger.debug("YouTrack credentials cleared")
    } catch (error) {
      logger.error("Failed to clear YouTrack credentials", error)
      throw new Error("Failed to clear credentials")
    }
  }

  /**
   * Encrypt sensitive data for in-memory storage
   * This provides an additional layer of security for data in memory
   *
   * @param data Data to encrypt
   * @returns Encrypted data
   */
  public encryptData(data: string): string {
    try {
      // Generate a random initialization vector
      const iv = crypto.randomBytes(16)

      // Use a derived key from the machine-id or another semi-stable identifier
      // For simplicity, we're using a fixed key here, but in production,
      // you would want to derive this from something machine-specific
      const key = crypto.scryptSync(EXTENSION_NAME, "salt", 32)

      // Create cipher
      const cipher = crypto.createCipheriv("aes-256-cbc", key, iv)

      // Encrypt the data
      let encrypted = cipher.update(data, "utf8", "hex")
      encrypted += cipher.final("hex")

      // Return the IV and encrypted data
      return `${iv.toString("hex")}:${encrypted}`
    } catch (error) {
      logger.error("Failed to encrypt data", error)
      throw new Error("Failed to encrypt sensitive data")
    }
  }

  /**
   * Decrypt sensitive data from in-memory storage
   *
   * @param encryptedData Encrypted data
   * @returns Decrypted data
   */
  public decryptData(encryptedData: string): string {
    try {
      // Split the IV and encrypted data
      const parts = encryptedData.split(":")
      if (parts.length !== 2) {
        throw new Error("Invalid encrypted data format")
      }

      const iv = Buffer.from(parts[0], "hex")
      const encryptedText = parts[1]

      // Use the same derived key as in encryption
      const key = crypto.scryptSync(EXTENSION_NAME, "salt", 32)

      // Create decipher
      const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv)

      // Decrypt the data
      let decrypted = decipher.update(encryptedText, "hex", "utf8")
      decrypted += decipher.final("utf8")

      return decrypted
    } catch (error) {
      logger.error("Failed to decrypt data", error)
      throw new Error("Failed to decrypt sensitive data")
    }
  }
}
