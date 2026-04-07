import { describe, expect, it } from "vitest";
import { createEmptyProject, normalizeSettings } from "../src/settings";

describe("createEmptyProject", () => {
	it("uses the expected default writing goals", () => {
		const project = createEmptyProject();

		expect(project.wordGoal.enabled).toBe(true);
		expect(project.wordGoal.target).toBe(50000);
		expect(project.timeGoal.enabled).toBe(false);
		expect(project.timeGoal.target).toBe(30);
		expect(project.currentWordCount).toBe(0);
	});
});

describe("normalizeSettings", () => {
	it("fills in the expanded settings shape", () => {
		const settings = normalizeSettings(undefined);

		expect(settings.projects).toEqual([]);
		expect(settings.activeProjectId).toBeNull();
		expect(settings.activeSession).toBeNull();
		expect(settings.sessions).toEqual([]);
	});

	it("drops active state that points at missing projects", () => {
		const settings = normalizeSettings({
			projects: [],
			activeProjectId: "missing-project",
			activeSession: {
				id: "session-1",
				projectId: "missing-project",
				startedAt: "2026-04-06T12:00:00.000Z",
				startingWordCount: 50,
			},
			sessions: [
				{
					id: "session-2",
					projectId: "missing-project",
					startedAt: "2026-04-06T12:00:00.000Z",
					endedAt: "2026-04-06T12:30:00.000Z",
					durationMs: 1800000,
					startingWordCount: 50,
					endingWordCount: 100,
					wordsWritten: 50,
				},
			],
		});

		expect(settings.activeProjectId).toBeNull();
		expect(settings.activeSession).toBeNull();
		expect(settings.sessions).toEqual([]);
	});

	it("keeps active project and related sessions when the project exists", () => {
		const project = createEmptyProject();
		project.name = "Draft";

		const settings = normalizeSettings({
			projects: [project],
			activeProjectId: project.id,
			activeSession: {
				id: "session-1",
				projectId: project.id,
				startedAt: "2026-04-06T12:00:00.000Z",
				startingWordCount: 10,
			},
			sessions: [
				{
					id: "session-2",
					projectId: project.id,
					startedAt: "2026-04-06T12:00:00.000Z",
					endedAt: "2026-04-06T12:30:00.000Z",
					durationMs: 1800000,
					startingWordCount: 10,
					endingWordCount: 210,
					wordsWritten: 200,
				},
			],
		});

		expect(settings.activeProjectId).toBe(project.id);
		expect(settings.activeSession?.projectId).toBe(project.id);
		expect(settings.sessions).toHaveLength(1);
		expect(settings.sessions[0]?.wordsWritten).toBe(200);
	});
});
