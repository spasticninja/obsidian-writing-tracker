import { createSessionId } from "./settings";
import { ActiveWritingSession, WritingProject, WritingSession } from "./types";

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
