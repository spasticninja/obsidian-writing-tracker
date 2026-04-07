import { Notice, Plugin, WorkspaceLeaf } from "obsidian";
import { createEmptyProject, DEFAULT_SETTINGS, normalizeSettings } from "./settings";
import { completeSession, createActiveSession } from "./session-state";
import { WritingProject, WritingSession, WritingTrackerSettings } from "./types";
import { WritingTrackerSettingTab } from "./ui/settings-tab";
import { StopSessionModal } from "./ui/stop-session-modal";
import { WRITING_TRACKER_VIEW_TYPE, WritingTrackerView } from "./ui/tracker-view";

export default class WritingTrackerPlugin extends Plugin {
	settings: WritingTrackerSettings = DEFAULT_SETTINGS;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.registerView(
			WRITING_TRACKER_VIEW_TYPE,
			(leaf) => new WritingTrackerView(leaf, this),
		);

		this.addSettingTab(new WritingTrackerSettingTab(this.app, this));
		this.registerCommands();

		this.app.workspace.onLayoutReady(() => {
			void this.ensureTrackerView();
		});
	}

	async onunload(): Promise<void> {
		await this.app.workspace.detachLeavesOfType(WRITING_TRACKER_VIEW_TYPE);
	}

	getProjectById(projectId: string): WritingProject | undefined {
		return this.settings.projects.find((project) => project.id === projectId);
	}

	getActiveProject(): WritingProject | undefined {
		if (this.settings.activeProjectId) {
			return this.getProjectById(this.settings.activeProjectId);
		}

		return this.settings.projects[0];
	}

	getSessionsForProject(projectId: string): WritingSession[] {
		return this.settings.sessions.filter((session) => session.projectId === projectId);
	}

	async setActiveProject(projectId: string): Promise<void> {
		if (!this.getProjectById(projectId)) {
			return;
		}

		this.settings.activeProjectId = projectId;
		await this.saveSettings();
	}

	async startSession(): Promise<void> {
		if (this.settings.activeSession) {
			new Notice("A writing session is already running.");
			return;
		}

		const project = this.getActiveProject();
		if (!project) {
			new Notice("Create a writing project before starting a session.");
			return;
		}

		this.settings.activeSession = {
			...createActiveSession(project),
		};

		await this.saveSettings();
		new Notice(`Started session for ${project.name}.`);
	}

	async openStopSessionModal(): Promise<void> {
		const activeSession = this.settings.activeSession;
		if (!activeSession) {
			new Notice("No active writing session to stop.");
			return;
		}

		const project = this.getProjectById(activeSession.projectId);
		if (!project) {
			new Notice("The active project for this session no longer exists.");
			return;
		}

		new StopSessionModal(this.app, {
			currentWordCount: project.currentWordCount,
			projectName: project.name,
			onSubmit: async (endingWordCount) => {
				await this.stopSession(endingWordCount);
			},
		}).open();
	}

	async stopSession(endingWordCount: number): Promise<void> {
		const activeSession = this.settings.activeSession;
		if (!activeSession) {
			new Notice("No active writing session to stop.");
			return;
		}

		const project = this.getProjectById(activeSession.projectId);
		if (!project) {
			this.settings.activeSession = null;
			await this.saveSettings();
			new Notice("Stopped session, but the associated project was missing.");
			return;
		}

		const session: WritingSession = completeSession(project, activeSession, endingWordCount);
		project.currentWordCount = session.endingWordCount;

		this.settings.sessions.push(session);
		this.settings.activeSession = null;
		await this.saveSettings();

		new Notice(
			`Stopped session for ${project.name}. Logged ${session.wordsWritten} words.`,
		);
	}

	async createProject(): Promise<void> {
		const project = createEmptyProject();
		this.settings.projects.push(project);
		this.settings.activeProjectId ??= project.id;
		await this.saveSettings();
		new Notice("Added a new writing project. Edit it in Writing Tracker settings.");
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		this.refreshViews();
	}

	async ensureTrackerView(): Promise<void> {
		const leaves = this.app.workspace.getLeavesOfType(WRITING_TRACKER_VIEW_TYPE);
		if (leaves.length > 0) {
			this.refreshViews();
			return;
		}

		const leaf = this.app.workspace.getRightLeaf(false);
		if (!leaf) {
			return;
		}

		await leaf.setViewState({
			type: WRITING_TRACKER_VIEW_TYPE,
			active: false,
		});
		this.refreshViews();
	}

	async loadSettings(): Promise<void> {
		const loadedData = await this.loadData();
		this.settings = normalizeSettings(loadedData);
	}

	private refreshViews(): void {
		this.app.workspace.getLeavesOfType(WRITING_TRACKER_VIEW_TYPE).forEach((leaf) => {
			const view = leaf.view;
			if (view instanceof WritingTrackerView) {
				view.render();
			}
		});
	}

	private registerCommands(): void {
		this.addCommand({
			id: "open-writing-tracker-sidebar",
			name: "Open writing tracker sidebar",
			callback: async () => {
				await this.ensureTrackerView();
				const leaf = this.getTrackerLeaf();
				if (leaf) {
					this.app.workspace.revealLeaf(leaf);
				}
			},
		});

		this.addCommand({
			id: "add-writing-project",
			name: "Create writing project",
			callback: async () => {
				await this.createProject();
			},
		});

		this.addCommand({
			id: "start-writing-session",
			name: "Start writing session",
			callback: async () => {
				await this.startSession();
			},
		});

		this.addCommand({
			id: "stop-writing-session",
			name: "Stop writing session",
			callback: async () => {
				await this.openStopSessionModal();
			},
		});
	}

	private getTrackerLeaf(): WorkspaceLeaf | null {
		return this.app.workspace.getLeavesOfType(WRITING_TRACKER_VIEW_TYPE)[0] ?? null;
	}
}
