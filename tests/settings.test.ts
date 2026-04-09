import { describe, expect, it } from "vitest";
import { createEmptyProject, normalizeSettings } from "../src/settings";

describe("createEmptyProject", () => {
	it("uses the expected default writing goals", () => {
		const project = createEmptyProject();

		expect(project.trackingMode).toBe("manual");
		expect(project.trackedPath).toBe("");
		expect(project.manualWordCountAdjustment).toBe(0);
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

	it("normalizes tracking mode and tracked path for projects", () => {
		const settings = normalizeSettings({
			projects: [
				{
					id: "project-1",
					name: "Tracked draft",
					trackingMode: "file",
					trackedPath: "Drafts/chapter-one.md",
					manualWordCountAdjustment: -125,
					startingWordCount: 20000,
					currentWordCount: 21375,
					wordGoal: {
						enabled: true,
						target: 50000,
					},
					timeGoal: {
						enabled: false,
						target: 30,
					},
					notes: "",
				},
			],
		});

		expect(settings.projects[0]?.trackingMode).toBe("file");
		expect(settings.projects[0]?.trackedPath).toBe("Drafts/chapter-one.md");
		expect(settings.projects[0]?.manualWordCountAdjustment).toBe(-125);
		expect(settings.projects[0]?.startingWordCount).toBe(20000);
		expect(settings.projects[0]?.currentWordCount).toBe(21375);
	});

	it("defaults invalid tracking data and normalizes imported project values", () => {
		const settings = normalizeSettings({
			projects: [
				{
					id: "project-2",
					name: "Imported draft",
					trackingMode: "weird-mode" as never,
					trackedPath: " Drafts/imported.md ",
					manualWordCountAdjustment: 10.9,
					startingWordCount: 1200,
					currentWordCount: 200,
					wordGoal: {
						enabled: true,
						target: 50000,
					},
					timeGoal: {
						enabled: false,
						target: 30,
					},
					notes: "",
				},
			],
		});

		expect(settings.projects[0]?.trackingMode).toBe("manual");
		expect(settings.projects[0]?.trackedPath).toBe("Drafts/imported.md");
		expect(settings.projects[0]?.manualWordCountAdjustment).toBe(10);
		expect(settings.projects[0]?.currentWordCount).toBe(200);
	});
});
