import * as vscode from "vscode";
import { COMMAND_CONNECT } from "./constants";
import * as logger from "./utils/logger";
import { YouTrackService } from "./services/youtrack-client";
import { ConfigurationService } from "./services/configuration";

// Service instances
const youtrackService = new YouTrackService();
const configService = new ConfigurationService();

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext): void {
	// Initialize logger
	logger.initializeLogger();
	logger.info("YouTrack integration extension is now active!");

	// Initialize YouTrack client
	youtrackService
		.initialize(context)
		.then((initialized) => {
			if (initialized) {
				logger.info("YouTrack client initialized successfully");
			} else {
				logger.info(
					"YouTrack client not initialized. User needs to provide credentials.",
				);
			}
		})
		.catch((error) => {
			logger.error("Failed to initialize YouTrack client", error);
		});

	// Register the connect command
	const connectCommand = vscode.commands.registerCommand(
		COMMAND_CONNECT,
		async () => {
			const baseUrl = await vscode.window.showInputBox({
				prompt: "Enter YouTrack instance URL",
				placeHolder: "https://youtrack.example.com",
				value: configService.getInstanceUrl(),
			});

			if (!baseUrl) {
				return; // User cancelled
			}

			const token = await vscode.window.showInputBox({
				prompt: "Enter permanent token for YouTrack",
				password: true,
			});

			if (!token) {
				return; // User cancelled
			}

			// Try to connect with provided credentials
			const success = await youtrackService.setCredentials(
				baseUrl,
				token,
				context,
			);

			if (success) {
				await configService.setInstanceUrl(baseUrl);
				vscode.window.showInformationMessage(
					"Successfully connected to YouTrack!",
				);
				logger.info(`Connected to YouTrack instance at ${baseUrl}`);
			} else {
				vscode.window.showErrorMessage(
					"Failed to connect to YouTrack. Please check credentials and try again.",
				);
			}
		},
	);

	// Add command to the context subscriptions
	context.subscriptions.push(connectCommand);
}

// This method is called when your extension is deactivated
export function deactivate(): void {
	logger.info("YouTrack integration extension is now deactivated!");
}
