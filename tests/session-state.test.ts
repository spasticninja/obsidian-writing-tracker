import { describe, expect, it } from "vitest";
import {
	calculateActiveSessionMetrics,
	completeSession,
	createActiveSession,
	sanitizeProjectWordCount,
} from "../src/session-state";
import { createEmptyProject } from "../src/settings";

describe("createActiveSession", () => {
	it("captures the active project and current word count", () => {
		const project = createEmptyProject();
		project.id = "project-1";
		project.currentWordCount = 1200;

		const startedAt = new Date("2026-04-06T10:00:00.000Z");
		const session = createActiveSession(project, startedAt);

		expect(session.projectId).toBe("project-1");
		expect(session.startingWordCount).toBe(1200);
		expect(session.startedAt).toBe("2026-04-06T10:00:00.000Z");
		expect(session.id).toBeTruthy();
	});
});

describe("completeSession", () => {
	it("calculates duration and words written from the session boundaries", () => {
		const project = createEmptyProject();
		project.id = "project-1";
		project.startingWordCount = 0;
		project.currentWordCount = 1200;

		const activeSession = {
			id: "session-1",
			projectId: project.id,
			startedAt: "2026-04-06T10:00:00.000Z",
			startingWordCount: 1200,
		};

		const completed = completeSession(
			project,
			activeSession,
			1500,
			new Date("2026-04-06T11:15:00.000Z"),
		);

		expect(completed.durationMs).toBe(4500000);
		expect(completed.endingWordCount).toBe(1500);
		expect(completed.wordsWritten).toBe(300);
	});

	it("does not allow ending below the project starting word count", () => {
		const project = createEmptyProject();
		project.id = "project-1";
		project.startingWordCount = 500;
		project.currentWordCount = 800;

		const completed = completeSession(
			project,
			{
				id: "session-2",
				projectId: project.id,
				startedAt: "2026-04-06T10:00:00.000Z",
				startingWordCount: 800,
			},
			200,
			new Date("2026-04-06T10:30:00.000Z"),
		);

		expect(completed.endingWordCount).toBe(500);
		expect(completed.wordsWritten).toBe(0);
	});
});

describe("calculateActiveSessionMetrics", () => {
	it("reports elapsed time and words written for the active session", () => {
		const project = createEmptyProject();
		project.id = "project-1";
		project.startingWordCount = 0;
		project.currentWordCount = 1850;

		const metrics = calculateActiveSessionMetrics(
			project,
			{
				id: "session-3",
				projectId: project.id,
				startedAt: "2026-04-06T10:00:00.000Z",
				startingWordCount: 1200,
			},
			new Date("2026-04-06T10:45:30.000Z"),
		);

		expect(metrics.elapsedMs).toBe(2730000);
		expect(metrics.currentWordCount).toBe(1850);
		expect(metrics.wordsWritten).toBe(650);
	});
});

describe("sanitizeProjectWordCount", () => {
	it("does not allow current word count below the project starting point", () => {
		const project = createEmptyProject();
		project.startingWordCount = 800;

		expect(sanitizeProjectWordCount(project, 500)).toBe(800);
		expect(sanitizeProjectWordCount(project, 1200)).toBe(1200);
	});
});
