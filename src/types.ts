export interface WritingGoal {
	enabled: boolean;
	target: number;
}

export type ProjectTrackingMode = "manual" | "file" | "folder";

export interface WritingSession {
	id: string;
	projectId: string;
	startedAt: string;
	endedAt: string;
	durationMs: number;
	startingWordCount: number;
	endingWordCount: number;
	wordsWritten: number;
}

export interface ActiveWritingSession {
	id: string;
	projectId: string;
	startedAt: string;
	startingWordCount: number;
}

export interface WritingProject {
	id: string;
	name: string;
	trackingMode: ProjectTrackingMode;
	trackedPath: string;
	startingWordCount: number;
	currentWordCount: number;
	wordGoal: WritingGoal;
	timeGoal: WritingGoal;
	notes: string;
}

export interface WritingTrackerSettings {
	projects: WritingProject[];
	activeProjectId: string | null;
	activeSession: ActiveWritingSession | null;
	sessions: WritingSession[];
}
