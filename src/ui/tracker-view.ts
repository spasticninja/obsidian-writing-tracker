import { ItemView, Setting, WorkspaceLeaf } from "obsidian";
import WritingTrackerPlugin from "../main";

export const WRITING_TRACKER_VIEW_TYPE = "writing-tracker-sidebar";

export class WritingTrackerView extends ItemView {
	plugin: WritingTrackerPlugin;

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
		this.contentEl.empty();
	}

	render(): void {
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

		const totalWordsWritten = Math.max(activeProject.currentWordCount - activeProject.startingWordCount, 0);
		new Setting(contentEl)
			.setName("Project progress")
			.setDesc(
				`${activeProject.currentWordCount} current words • ${totalWordsWritten} words written overall`,
			);

		if (this.plugin.settings.activeSession) {
			const activeSession = this.plugin.settings.activeSession;
			const sessionProject = this.plugin.getProjectById(activeSession.projectId);

			new Setting(contentEl)
				.setName("Active session")
				.setDesc(
					`${sessionProject?.name ?? "Unknown project"} • started ${formatTimestamp(
						activeSession.startedAt,
					)}`,
				);

			new Setting(contentEl)
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
}

function formatTimestamp(value: string): string {
	const date = new Date(value);
	return date.toLocaleString();
}

function formatDuration(durationMs: number): string {
	const totalMinutes = Math.max(1, Math.round(durationMs / 60000));
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;

	if (hours === 0) {
		return `${minutes} min`;
	}

	if (minutes === 0) {
		return `${hours} hr`;
	}

	return `${hours} hr ${minutes} min`;
}
