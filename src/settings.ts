import { WritingProject, WritingTrackerSettings } from "./types";

export const DEFAULT_SETTINGS: WritingTrackerSettings = {
	projects: [],
};

export function createEmptyProject(): WritingProject {
	return {
		id: createProjectId(),
		name: "Untitled project",
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

	return {
		projects,
	};
}

export function normalizeProject(project: Partial<WritingProject> | null | undefined): WritingProject {
	const baseProject = createEmptyProject();

	return {
		id: project?.id?.trim() || createProjectId(),
		name: project?.name?.trim() || baseProject.name,
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

function createProjectId(): string {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return crypto.randomUUID();
	}

	return `project-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
