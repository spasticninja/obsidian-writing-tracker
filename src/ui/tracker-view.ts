import { ItemView, Setting, WorkspaceLeaf } from "obsidian";
import { calculateActiveSessionMetrics } from "../session-state";
import { sanitizeNumber } from "../settings";
import WritingTrackerPlugin from "../main";
import { WritingProject } from "../types";

export const WRITING_TRACKER_VIEW_TYPE = "writing-tracker-sidebar";

export class WritingTrackerView extends ItemView {
	plugin: WritingTrackerPlugin;
	private intervalId: number | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: WritingTrackerPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return WRITING_TRACKER_VIEW_TYPE;
	}

	getDisplayText(): string {
		return "Writing Tracker";
	}

	getIcon(): string {
		return "pencil";
	}

	async onOpen(): Promise<void> {
		this.render();
	}

	async onClose(): Promise<void> {
		this.clearTimer();
		this.contentEl.empty();
	}

	render(): void {
		this.clearTimer();

		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("writing-tracker-view");

		contentEl.createEl("h2", { text: "Writing Tracker" });
		contentEl.createEl("p", {
			text: "Choose a project, then start or stop writing sessions from this panel.",
		});

		if (this.plugin.settings.projects.length === 0) {
			contentEl.createEl("p", {
				cls: "writing-tracker-empty-state",
				text: "Create a project in the plugin settings before starting a session.",
			});
			return;
		}

		const activeProject = this.plugin.getActiveProject();
		if (!activeProject) {
			contentEl.createEl("p", {
				cls: "writing-tracker-empty-state",
				text: "Select an active project in the Writing Tracker settings.",
			});
			return;
		}

		new Setting(contentEl)
			.setName("Active project")
			.setDesc("Sessions will be recorded against this project.")
			.addDropdown((dropdown) => {
				this.plugin.settings.projects.forEach((project) => {
					dropdown.addOption(project.id, project.name);
				});
				dropdown.setValue(activeProject.id);
				dropdown.onChange(async (value) => {
					await this.plugin.setActiveProject(value);
				});
			});

		const projectProgressSetting = new Setting(contentEl).setName("Project progress");
		const updateProjectProgress = () => {
			const totalWordsWritten = Math.max(
				activeProject.currentWordCount - activeProject.startingWordCount,
				0,
			);
			projectProgressSetting.setDesc(
				`${activeProject.currentWordCount} current words • ${totalWordsWritten} words written overall`,
			);
		};
		updateProjectProgress();

		if (activeProject.trackingMode === "manual") {
			this.renderCurrentWordCountControls(contentEl, activeProject, updateProjectProgress);
		}

		if (this.plugin.settings.activeSession) {
			this.renderActiveSession(contentEl, activeProject, updateProjectProgress);
		} else {
			new Setting(contentEl)
				.setName("Start session")
				.setDesc("Use the active project and current word count as the session baseline.")
				.addButton((button) =>
					button
						.setCta()
						.setButtonText("Start session")
						.onClick(async () => {
							await this.plugin.startSession();
						}),
				);
		}

		const sessionsForProject = this.plugin
			.getSessionsForProject(activeProject.id)
			.slice(-5)
			.reverse();

		contentEl.createEl("h3", { text: "Recent sessions" });
		if (sessionsForProject.length === 0) {
			contentEl.createEl("p", {
				cls: "writing-tracker-empty-state",
				text: "No completed sessions yet for this project.",
			});
			return;
		}

		const list = contentEl.createEl("ul", { cls: "writing-tracker-session-list" });
		sessionsForProject.forEach((session) => {
			const item = list.createEl("li");
			item.setText(
				`${formatTimestamp(session.startedAt)} • ${formatDuration(session.durationMs)} • ${session.wordsWritten} words`,
			);
		});
	}

	private renderCurrentWordCountControls(
		containerEl: HTMLElement,
		activeProject: WritingProject,
		updateProjectProgress: () => void,
	): void {
		new Setting(containerEl)
			.setName("Current word count")
			.setDesc("Update this while you write or after writing elsewhere.")
			.addText((text) => {
				text.inputEl.type = "number";
				text.setValue(String(activeProject.currentWordCount));
				text.onChange(async (value) => {
					const nextValue = sanitizeNumber(Number.parseInt(value, 10), activeProject.currentWordCount);
					activeProject.currentWordCount = Math.max(nextValue, activeProject.startingWordCount);
					updateProjectProgress();
					await this.plugin.updateProjectCurrentWordCount(activeProject.id, activeProject.currentWordCount, false);
				});
			})
			.addButton((button) =>
				button.setButtonText("+100").onClick(async () => {
					await this.plugin.adjustProjectCurrentWordCount(activeProject.id, 100);
				}),
			)
			.addButton((button) =>
				button.setButtonText("+500").onClick(async () => {
					await this.plugin.adjustProjectCurrentWordCount(activeProject.id, 500);
				}),
			);
	}

	private renderActiveSession(
		containerEl: HTMLElement,
		activeProject: WritingProject,
		updateProjectProgress: () => void,
	): void {
		const activeSession = this.plugin.settings.activeSession;
		if (!activeSession) {
			return;
		}

		const sessionProject = this.plugin.getProjectById(activeSession.projectId);
		const sessionSetting = new Setting(containerEl).setName("Active session");
		const updateSessionDetails = () => {
			const metrics = calculateActiveSessionMetrics(activeProject, activeSession);
			sessionSetting.setDesc(
				`${sessionProject?.name ?? "Unknown project"} • started ${formatTimestamp(
					activeSession.startedAt,
				)} • ${formatDuration(metrics.elapsedMs)} elapsed • ${metrics.wordsWritten} session words`,
			);
			updateProjectProgress();
		};
		updateSessionDetails();
		this.intervalId = window.setInterval(() => {
			updateSessionDetails();
		}, 1000);

		new Setting(containerEl)
			.setName("Stop session")
			.setDesc("Stop the current session and record the latest word count.")
			.addButton((button) =>
				button
					.setCta()
					.setButtonText("Stop session")
					.onClick(async () => {
						await this.plugin.openStopSessionModal();
					}),
			);
	}

	private clearTimer(): void {
		if (this.intervalId !== null) {
			window.clearInterval(this.intervalId);
			this.intervalId = null;
		}
	}
}

function formatTimestamp(value: string): string {
	const date = new Date(value);
	return date.toLocaleString();
}

function formatDuration(durationMs: number): string {
	const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	if (hours > 0) {
		return `${hours} hr ${minutes} min`;
	}

	if (minutes > 0) {
		return `${minutes} min ${seconds} sec`;
	}

	return `${seconds} sec`;
}
