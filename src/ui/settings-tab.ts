import { App, Notice, PluginSettingTab, Setting, TextComponent } from "obsidian";
import WritingTrackerPlugin from "../main";
import { createEmptyProject, sanitizeNumber } from "../settings";
import { WritingProject } from "../types";

export class WritingTrackerSettingTab extends PluginSettingTab {
	plugin: WritingTrackerPlugin;

	constructor(app: App, plugin: WritingTrackerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "Writing projects" });
		containerEl.createEl("p", {
			text: "Track starting words, current words, and optional word or day goals for each project.",
		});

		new Setting(containerEl)
			.setName("Add project")
			.setDesc("Create a new writing project to track.")
			.addButton((button) =>
				button.setButtonText("Add project").onClick(async () => {
					this.plugin.settings.projects.push(createEmptyProject());
					await this.plugin.saveSettings();
					this.display();
				}),
			);

		if (this.plugin.settings.projects.length === 0) {
			containerEl.createEl("p", {
				cls: "writing-tracker-empty-state",
				text: "No projects yet. Add a project to start tracking progress.",
			});
			return;
		}

		this.plugin.settings.projects.forEach((project, index) => {
			this.renderProject(containerEl, project, index);
		});
	}

	private renderProject(containerEl: HTMLElement, project: WritingProject, index: number): void {
		const section = containerEl.createDiv({ cls: "writing-tracker-project" });
		section.createEl("h3", { text: `Project ${index + 1}` });

		this.addTextSetting(
			section,
			"Project name",
			"Name used in the tracker.",
			project.name,
			async (value) => {
				project.name = value.trim() || "Untitled project";
				await this.persistAndRefresh();
			},
		);

		this.addNumberSetting(
			section,
			"Starting word count",
			"Word count when you began tracking this project.",
			project.startingWordCount,
			async (value) => {
				project.startingWordCount = value;
				if (project.currentWordCount < value) {
					project.currentWordCount = value;
				}
				await this.persistAndRefresh();
			},
		);

		this.addNumberSetting(
			section,
			"Current word count",
			"Update this as your draft grows.",
			project.currentWordCount,
			async (value) => {
				project.currentWordCount = Math.max(value, project.startingWordCount);
				await this.persistAndRefresh();
			},
		);

		this.addToggleNumberSetting(
			section,
			"Word goal",
			"Enable a target total word count for this project.",
			project.wordGoal.enabled,
			project.wordGoal.target,
			"words",
			async (enabled) => {
				project.wordGoal.enabled = enabled;
				await this.persistAndRefresh();
			},
			async (value) => {
				project.wordGoal.target = value;
				await this.persistAndRefresh();
			},
		);

		this.addToggleNumberSetting(
			section,
			"Time goal",
			"Enable a target duration in days for this project.",
			project.timeGoal.enabled,
			project.timeGoal.target,
			"days",
			async (enabled) => {
				project.timeGoal.enabled = enabled;
				await this.persistAndRefresh();
			},
			async (value) => {
				project.timeGoal.target = value;
				await this.persistAndRefresh();
			},
		);

		this.addTextSetting(
			section,
			"Notes",
			"Optional project details.",
			project.notes,
			async (value) => {
				project.notes = value;
				await this.persistAndRefresh();
			},
		);

		const progressSetting = new Setting(section)
			.setName("Progress")
			.setDesc(this.getProgressDescription(project));

		progressSetting.infoEl.addClass("writing-tracker-progress");

		new Setting(section)
			.setName("Delete project")
			.setDesc("Remove this project from the tracker.")
			.addButton((button) =>
				button
					.setWarning()
					.setButtonText("Delete")
					.onClick(async () => {
						this.plugin.settings.projects = this.plugin.settings.projects.filter(
							(existingProject) => existingProject.id !== project.id,
						);
						await this.plugin.saveSettings();
						new Notice(`Deleted project: ${project.name}`);
						this.display();
					}),
			);
	}

	private addTextSetting(
		containerEl: HTMLElement,
		name: string,
		description: string,
		value: string,
		onCommit: (value: string) => Promise<void>,
	): void {
		new Setting(containerEl)
			.setName(name)
			.setDesc(description)
			.addText((text) => {
				text.setValue(value);
				text.onChange((changedValue) => {
					void onCommit(changedValue);
				});
			});
	}

	private addNumberSetting(
		containerEl: HTMLElement,
		name: string,
		description: string,
		value: number,
		onCommit: (value: number) => Promise<void>,
	): void {
		new Setting(containerEl)
			.setName(name)
			.setDesc(description)
			.addText((text) => {
				configureNumberInput(text, value);
				text.onChange((changedValue) => {
					void onCommit(sanitizeNumberInput(changedValue, value));
				});
			});
	}

	private addToggleNumberSetting(
		containerEl: HTMLElement,
		name: string,
		description: string,
		enabled: boolean,
		target: number,
		suffix: string,
		onToggle: (value: boolean) => Promise<void>,
		onTargetChange: (value: number) => Promise<void>,
	): void {
		new Setting(containerEl)
			.setName(name)
			.setDesc(description)
			.addToggle((toggle) =>
				toggle.setValue(enabled).onChange((value) => {
					void onToggle(value);
				}),
			)
			.addText((text) => {
				configureNumberInput(text, target, suffix);
				text.setDisabled(!enabled);
				text.onChange((value) => {
					void onTargetChange(sanitizeNumberInput(value, target));
				});
			});
	}

	private getProgressDescription(project: WritingProject): string {
		const wordsWritten = Math.max(project.currentWordCount - project.startingWordCount, 0);
		const parts = [`${wordsWritten} words written`];

		if (project.wordGoal.enabled) {
			const percent = getPercent(project.currentWordCount, project.wordGoal.target);
			parts.push(`${project.currentWordCount}/${project.wordGoal.target} words (${percent}%)`);
		}

		if (project.timeGoal.enabled) {
			parts.push(`${project.timeGoal.target} day goal`);
		}

		return parts.join(" • ");
	}

	private async persistAndRefresh(): Promise<void> {
		await this.plugin.saveSettings();
		this.display();
	}
}

function configureNumberInput(text: TextComponent, value: number, placeholder?: string): void {
	text.inputEl.type = "number";
	text.setValue(String(value));
	if (placeholder) {
		text.setPlaceholder(placeholder);
	}
}

function sanitizeNumberInput(value: string, fallback: number): number {
	return sanitizeNumber(Number.parseInt(value, 10), fallback);
}

function getPercent(current: number, target: number): number {
	if (target <= 0) {
		return 0;
	}

	return Math.min(100, Math.floor((current / target) * 100));
}
