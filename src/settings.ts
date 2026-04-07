import {
	ActiveWritingSession,
	ProjectTrackingMode,
	WritingProject,
	WritingSession,
	WritingTrackerSettings,
} from "./types";

export const DEFAULT_SETTINGS: WritingTrackerSettings = {
	projects: [],
	activeProjectId: null,
	activeSession: null,
	sessions: [],
};

export function createEmptyProject(): WritingProject {
	return {
		id: createProjectId(),
		name: "Untitled project",
		trackingMode: "manual",
		trackedPath: "",
		manualWordCountAdjustment: 0,
		startingWordCount: 0,
		currentWordCount: 0,
		wordGoal: {
			enabled: true,
			target: 50000,
		},
		timeGoal: {
			enabled: false,
			target: 30,
		},
		notes: "",
	};
}

export function normalizeSettings(data: Partial<WritingTrackerSettings> | null | undefined): WritingTrackerSettings {
	const projects = (data?.projects ?? []).map(normalizeProject);
	const activeProjectId = normalizeActiveProjectId(data?.activeProjectId, projects);

	return {
		projects,
		activeProjectId,
		activeSession: normalizeActiveSession(data?.activeSession, projects),
		sessions: (data?.sessions ?? []).map(normalizeSession).filter((session) =>
			projects.some((project) => project.id === session.projectId),
		),
	};
}

export function normalizeProject(project: Partial<WritingProject> | null | undefined): WritingProject {
	const baseProject = createEmptyProject();

	return {
		id: project?.id?.trim() || createProjectId(),
		name: project?.name?.trim() || baseProject.name,
		trackingMode: normalizeTrackingMode(project?.trackingMode),
		trackedPath: typeof project?.trackedPath === "string" ? project.trackedPath.trim() : "",
		manualWordCountAdjustment: sanitizeInteger(
			project?.manualWordCountAdjustment,
			baseProject.manualWordCountAdjustment,
		),
		startingWordCount: sanitizeNumber(project?.startingWordCount, 0),
		currentWordCount: sanitizeNumber(
			project?.currentWordCount,
			sanitizeNumber(project?.startingWordCount, 0),
		),
		wordGoal: {
			enabled: project?.wordGoal?.enabled ?? baseProject.wordGoal.enabled,
			target: sanitizeNumber(project?.wordGoal?.target, baseProject.wordGoal.target),
		},
		timeGoal: {
			enabled: project?.timeGoal?.enabled ?? baseProject.timeGoal.enabled,
			target: sanitizeNumber(project?.timeGoal?.target, baseProject.timeGoal.target),
		},
		notes: project?.notes ?? "",
	};
}

export function sanitizeNumber(value: unknown, fallback: number): number {
	if (typeof value === "number" && Number.isFinite(value)) {
		return Math.max(0, Math.floor(value));
	}

	return fallback;
}

export function sanitizeInteger(value: unknown, fallback: number): number {
	if (typeof value === "number" && Number.isFinite(value)) {
		return Math.floor(value);
	}

	return fallback;
}

export function isAutomaticTrackingMode(mode: ProjectTrackingMode): boolean {
	return mode === "file" || mode === "folder";
}

export function createSessionId(): string {
	return createProjectId();
}

function normalizeSession(session: Partial<WritingSession> | null | undefined): WritingSession {
	return {
		id: session?.id?.trim() || createSessionId(),
		projectId: session?.projectId?.trim() || "",
		startedAt: normalizeTimestamp(session?.startedAt),
		endedAt: normalizeTimestamp(session?.endedAt),
		durationMs: sanitizeNumber(session?.durationMs, 0),
		startingWordCount: sanitizeNumber(session?.startingWordCount, 0),
		endingWordCount: sanitizeNumber(session?.endingWordCount, 0),
		wordsWritten: sanitizeNumber(session?.wordsWritten, 0),
	};
}

function normalizeActiveSession(
	session: Partial<ActiveWritingSession> | null | undefined,
	projects: WritingProject[],
): ActiveWritingSession | null {
	if (!session?.projectId || !projects.some((project) => project.id === session.projectId)) {
		return null;
	}

	return {
		id: session?.id?.trim() || createSessionId(),
		projectId: session.projectId,
		startedAt: normalizeTimestamp(session?.startedAt),
		startingWordCount: sanitizeNumber(session?.startingWordCount, 0),
	};
}

function normalizeActiveProjectId(
	activeProjectId: string | null | undefined,
	projects: WritingProject[],
): string | null {
	if (activeProjectId && projects.some((project) => project.id === activeProjectId)) {
		return activeProjectId;
	}

	return projects[0]?.id ?? null;
}

function normalizeTimestamp(value: unknown): string {
	if (typeof value === "string" && value.trim().length > 0) {
		return value;
	}

	return new Date().toISOString();
}

function normalizeTrackingMode(value: unknown): ProjectTrackingMode {
	if (value === "file" || value === "folder") {
		return value;
	}

	return "manual";
}

function createProjectId(): string {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return crypto.randomUUID();
	}

	return `project-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
