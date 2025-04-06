import * as vscode from "vscode";
import {
	CONFIG_INSTANCE_URL,
	CONFIG_CACHE_TIMEOUT,
	CONFIG_RECENT_ITEMS_LIMIT,
} from "../constants";

/**
 * Service for managing extension configuration
 */
export class ConfigurationService {
	/**
	 * Get YouTrack instance URL from settings
	 */
	public getInstanceUrl(): string | undefined {
		return this.getValue<string>(CONFIG_INSTANCE_URL);
	}

	/**
	 * Set YouTrack instance URL in settings
	 */
	public async setInstanceUrl(url: string): Promise<void> {
		await this.updateValue(CONFIG_INSTANCE_URL, url);
	}

	/**
	 * Get cache timeout in minutes
	 */
	public getCacheTimeout(): number {
		return this.getValue<number>(CONFIG_CACHE_TIMEOUT, 15);
	}

	/**
	 * Get maximum number of recent items to display
	 */
	public getRecentItemsLimit(): number {
		return this.getValue<number>(CONFIG_RECENT_ITEMS_LIMIT, 10);
	}

	/**
	 * Generic method to get a configuration value
	 */
	private getValue<T>(key: string, defaultValue?: T): T {
		const config = vscode.workspace.getConfiguration();
		return config.get<T>(key, defaultValue as T);
	}

	/**
	 * Generic method to update a configuration value
	 */
	private async updateValue(key: string, value: unknown): Promise<void> {
		const config = vscode.workspace.getConfiguration();
		await config.update(key, value, vscode.ConfigurationTarget.Global);
	}
}
