import { App, Notice, PluginSettingTab, Setting, TextComponent, setIcon } from "obsidian";
import WritingTrackerPlugin from "../main";
import { isAutomaticTrackingMode, sanitizeInteger, sanitizeNumber } from "../settings";
import { ProjectTrackingMode, WritingProject } from "../types";

export class WritingTrackerSettingTab extends PluginSettingTab {
	plugin: WritingTrackerPlugin;
	private readonly expandedProjectIds = new Set<string>();

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

		if (this.plugin.settings.projects.length > 0) {
			const activeProject = this.plugin.getActiveProject();
			const fallbackProjectId = this.plugin.settings.projects[0]?.id;
			new Setting(containerEl)
				.setName("Active project")
				.setDesc("Sessions and sidebar actions use this project by default.")
				.addDropdown((dropdown) => {
					this.plugin.settings.projects.forEach((project) => {
						dropdown.addOption(project.id, project.name);
					});
					if (activeProject?.id) {
						dropdown.setValue(activeProject.id);
					} else if (fallbackProjectId) {
						dropdown.setValue(fallbackProjectId);
					}
					dropdown.onChange(async (value) => {
						await this.plugin.setActiveProject(value);
					});
				});
		}

		new Setting(containerEl)
			.setName("Add project")
			.setDesc("Create a new writing project to track.")
			.addButton((button) =>
				button.setButtonText("Add project").onClick(async () => {
					await this.plugin.createProject();
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
		const accordion = section.createEl("details", { cls: "writing-tracker-project-accordion" });
		if (this.expandedProjectIds.has(project.id)) {
			accordion.open = true;
			this.expandedProjectIds.add(project.id);
		}

		const summary = accordion.createEl("summary", { cls: "writing-tracker-project-summary" });
		const chevronEl = summary.createSpan({ cls: "writing-tracker-project-summary-chevron" });
		const updateChevron = () => {
			setIcon(chevronEl, accordion.open ? "chevron-up" : "chevron-down");
		};
		updateChevron();

		accordion.addEventListener("toggle", () => {
			if (accordion.open) {
				this.expandedProjectIds.add(project.id);
			} else {
				this.expandedProjectIds.delete(project.id);
			}
			updateChevron();
		});
		const summaryHeading = summary.createDiv({ cls: "writing-tracker-project-summary-heading" });
		const titleEl = summaryHeading.createEl("span", {
			cls: "writing-tracker-project-summary-title",
			text: project.name || `Project ${index + 1}`,
		});
		if (this.plugin.settings.activeProjectId === project.id) {
			summaryHeading.createEl("span", {
				cls: "writing-tracker-project-summary-badge",
				text: "Active",
			});
		}

		const summaryMeta = summary.createDiv({ cls: "writing-tracker-project-summary-meta" });
		summaryMeta.setText(this.getProjectSummary(project));

		const body = accordion.createDiv({ cls: "writing-tracker-project-body" });
		const progressSetting = new Setting(body)
			.setName("Progress")
			.setDesc(this.getProgressDescription(project));

		progressSetting.infoEl.addClass("writing-tracker-progress");
		const updateProgress = () => {
			progressSetting.setDesc(this.getProgressDescription(project));
			summaryMeta.setText(this.getProjectSummary(project));
			titleEl.setText(project.name || `Project ${index + 1}`);
		};

		this.addTextSetting(
			body,
			"Project name",
			"Name used in the tracker.",
			project.name,
			async (value) => {
				project.name = value.trim() || "Untitled project";
				await this.persistSettings();
			},
		);

		this.addNumberSetting(
			body,
			"Starting word count",
			"Word count when you began tracking this project.",
			project.startingWordCount,
			async (value) => {
				project.startingWordCount = value;
				if (project.currentWordCount < value) {
					project.currentWordCount = value;
				}
				updateProgress();
				await this.persistSettings();
			},
		);

		this.addNumberSetting(
			body,
			"Current word count",
			project.trackingMode === "manual"
				? "Update this as your draft grows."
				: "Calculated as starting word count plus words in the selected source.",
			project.currentWordCount,
			async (value) => {
				project.currentWordCount = Math.max(value, project.startingWordCount);
				updateProgress();
				await this.persistSettings();
			},
			project.trackingMode !== "manual",
		);

		this.addTrackingModeSetting(body, project);
		if (isAutomaticTrackingMode(project.trackingMode)) {
			this.addTrackingPathSetting(body, project, updateProgress);
			this.addSignedNumberSetting(
				body,
				"Manual adjustment",
				"Optional correction added to or subtracted from the tracked source total.",
				project.manualWordCountAdjustment,
				async (value) => {
					project.manualWordCountAdjustment = value;
					await this.plugin.recalculateProjectWordCount(project);
					updateProgress();
				},
			);
		}

		this.addToggleNumberSetting(
			body,
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
				updateProgress();
				await this.persistSettings();
			},
		);

		this.addToggleNumberSetting(
			body,
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
				updateProgress();
				await this.persistSettings();
			},
		);

		this.addTextSetting(
			body,
			"Notes",
			"Optional project details.",
			project.notes,
			async (value) => {
				project.notes = value;
				await this.persistSettings();
			},
		);

		new Setting(body)
			.setName("Session history")
			.setDesc(this.getSessionHistoryDescription(project.id));

		new Setting(body)
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
						this.plugin.settings.sessions = this.plugin.settings.sessions.filter(
							(session) => session.projectId !== project.id,
						);
						this.expandedProjectIds.delete(project.id);
						if (this.plugin.settings.activeSession?.projectId === project.id) {
							this.plugin.settings.activeSession = null;
						}
						if (this.plugin.settings.activeProjectId === project.id) {
							this.plugin.settings.activeProjectId = this.plugin.settings.projects[0]?.id ?? null;
						}
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
		disabled = false,
	): void {
		new Setting(containerEl)
			.setName(name)
			.setDesc(description)
			.addText((text) => {
				configureNumberInput(text, value);
				text.setDisabled(disabled);
				text.onChange((changedValue) => {
					void onCommit(sanitizeNumberInput(changedValue, value));
				});
			});
	}

	private addTrackingModeSetting(containerEl: HTMLElement, project: WritingProject): void {
		new Setting(containerEl)
			.setName("Tracking mode")
			.setDesc("Choose whether word count is entered manually or calculated from notes.")
			.addDropdown((dropdown) => {
				dropdown.addOption("manual", "Manual");
				dropdown.addOption("file", "Single note");
				dropdown.addOption("folder", "Folder");
				dropdown.setValue(project.trackingMode);
				dropdown.onChange(async (value) => {
					await this.plugin.updateProjectTracking(
						project.id,
						value as ProjectTrackingMode,
						project.trackedPath,
					);
					this.display();
				});
			});
	}

	private addTrackingPathSetting(
		containerEl: HTMLElement,
		project: WritingProject,
		updateProgress: () => void,
	): void {
		const setting = new Setting(containerEl)
			.setClass("writing-tracker-tracking-path-setting")
			.setName(project.trackingMode === "file" ? "Tracked note" : "Tracked folder")
			.setDesc(
				project.trackingMode === "file"
					? "Set the note whose words should be added on top of the starting word count."
					: "Set the folder whose Markdown words should be added on top of the starting word count.",
			)
			.addText((text) => {
				text.inputEl.addClass("writing-tracker-tracking-path-input");
				text.setPlaceholder(project.trackingMode === "file" ? "Path/to/note.md" : "Path/to/folder");
				text.setValue(project.trackedPath);
				text.onChange(async (value) => {
					project.trackedPath = value.trim();
					await this.plugin.updateProjectTracking(project.id, project.trackingMode, project.trackedPath);
					updateProgress();
				});
			})
			.addButton((button) =>
				button.setButtonText("Use active note").onClick(async () => {
					const activeFile = this.app.workspace.getActiveFile();
					if (!activeFile) {
						new Notice("Open a note first.");
						return;
					}

					const nextPath =
						project.trackingMode === "file" ? activeFile.path : activeFile.parent?.path ?? "";
					if (!nextPath) {
						new Notice("Could not determine a folder from the active note.");
						return;
					}

					project.trackedPath = nextPath;
					await this.plugin.updateProjectTracking(project.id, project.trackingMode, nextPath);
					this.display();
				}),
			)
			.addButton((button) =>
				button.setButtonText("Recount").onClick(async () => {
					await this.plugin.updateProjectTracking(project.id, project.trackingMode, project.trackedPath);
					this.display();
				}),
			);

		setting.controlEl.addClass("writing-tracker-tracking-path-controls");
		Array.from(setting.controlEl.querySelectorAll("button")).forEach((button) => {
			button.addClass("writing-tracker-tracking-path-button");
		});
	}

	private addSignedNumberSetting(
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
				text.inputEl.type = "number";
				text.setValue(String(value));
				text.onChange((changedValue) => {
					void onCommit(sanitizeSignedNumberInput(changedValue, value));
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

		if (project.trackingMode === "manual") {
			parts.push("manual tracking");
		} else if (project.trackedPath) {
			parts.push(`${project.trackingMode}: + tracked words from ${project.trackedPath}`);
			if (project.manualWordCountAdjustment !== 0) {
				parts.push(`${project.manualWordCountAdjustment} adjustment`);
			}
		} else {
			parts.push(`${project.trackingMode}: source not set`);
		}

		if (project.wordGoal.enabled) {
			const percent = getPercent(project.currentWordCount, project.wordGoal.target);
			parts.push(`${project.currentWordCount}/${project.wordGoal.target} words (${percent}%)`);
		}

		if (project.timeGoal.enabled) {
			parts.push(`${project.timeGoal.target} day goal`);
		}

		return parts.join(" • ");
	}

	private getProjectSummary(project: WritingProject): string {
		const parts = [`${project.currentWordCount} words`];

		if (project.wordGoal.enabled) {
			parts.push(`${getPercent(project.currentWordCount, project.wordGoal.target)}% of goal`);
		}

		return parts.join(" • ");
	}

	private getSessionHistoryDescription(projectId: string): string {
		const sessions = this.plugin.getSessionsForProject(projectId);
		if (sessions.length === 0) {
			return "No completed sessions yet.";
		}

		const totalWords = sessions.reduce((sum, session) => sum + session.wordsWritten, 0);
		return `${sessions.length} sessions recorded • ${totalWords} words logged`;
	}

	private async persistSettings(): Promise<void> {
		await this.plugin.saveSettings();
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

function sanitizeSignedNumberInput(value: string, fallback: number): number {
	return sanitizeInteger(Number.parseInt(value, 10), fallback);
}

function getPercent(current: number, target: number): number {
	if (target <= 0) {
		return 0;
	}

	return Math.min(100, Math.floor((current / target) * 100));
}
