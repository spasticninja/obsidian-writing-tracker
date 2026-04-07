import { createSessionId } from "./settings";
import { ActiveWritingSession, WritingProject, WritingSession } from "./types";

export interface ActiveSessionMetrics {
	elapsedMs: number;
	currentWordCount: number;
	wordsWritten: number;
}

export function createActiveSession(project: WritingProject, startedAt = new Date()): ActiveWritingSession {
	return {
		id: createSessionId(),
		projectId: project.id,
		startedAt: startedAt.toISOString(),
		startingWordCount: project.currentWordCount,
	};
}

export function completeSession(
	project: WritingProject,
	activeSession: ActiveWritingSession,
	endingWordCount: number,
	endedAt = new Date(),
): WritingSession {
	const sanitizedEndingWordCount = Math.max(endingWordCount, project.startingWordCount);
	const endedAtIso = endedAt.toISOString();

	return {
		id: activeSession.id,
		projectId: project.id,
		startedAt: activeSession.startedAt,
		endedAt: endedAtIso,
		durationMs: Math.max(
			0,
			endedAt.getTime() - new Date(activeSession.startedAt).getTime(),
		),
		startingWordCount: activeSession.startingWordCount,
		endingWordCount: sanitizedEndingWordCount,
		wordsWritten: Math.max(sanitizedEndingWordCount - activeSession.startingWordCount, 0),
	};
}

export function calculateActiveSessionMetrics(
	project: WritingProject,
	activeSession: ActiveWritingSession,
	now = new Date(),
): ActiveSessionMetrics {
	const elapsedMs = Math.max(0, now.getTime() - new Date(activeSession.startedAt).getTime());
	const currentWordCount = Math.max(project.currentWordCount, project.startingWordCount);

	return {
		elapsedMs,
		currentWordCount,
		wordsWritten: Math.max(currentWordCount - activeSession.startingWordCount, 0),
	};
}

export function sanitizeProjectWordCount(project: WritingProject, value: number): number {
	return Math.max(project.startingWordCount, value);
}
