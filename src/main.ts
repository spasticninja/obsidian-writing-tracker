import { Notice, Plugin } from "obsidian";
import { createEmptyProject, DEFAULT_SETTINGS, normalizeSettings } from "./settings";
import { WritingTrackerSettings } from "./types";
import { WritingTrackerSettingTab } from "./ui/settings-tab";

export default class WritingTrackerPlugin extends Plugin {
	settings: WritingTrackerSettings = DEFAULT_SETTINGS;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.addSettingTab(new WritingTrackerSettingTab(this.app, this));
		this.registerCommands();
	}

	private registerCommands(): void {
		this.addCommand({
			id: "add-writing-project",
			name: "Create writing project",
			callback: async () => {
				this.settings.projects.push(createEmptyProject());
				await this.saveSettings();
				new Notice("Added a new writing project. Edit it in Writing Tracker settings.");
			},
		});
	}

	async loadSettings(): Promise<void> {
		const loadedData = await this.loadData();
		this.settings = normalizeSettings(loadedData);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
