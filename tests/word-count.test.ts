import { describe, expect, it } from "vitest";
import {
	countWordsInText,
	getProjectTotalFromTrackedWords,
	getTrackedMarkdownPaths,
} from "../src/word-count";

describe("countWordsInText", () => {
	it("counts words while ignoring frontmatter and code fences", () => {
		const text = `---
title: Draft
---

Hello world from the tracker.

\`\`\`ts
const ignored = true;
\`\`\`

Final paragraph here.`;

		expect(countWordsInText(text)).toBe(8);
	});
});

describe("getTrackedMarkdownPaths", () => {
	it("returns only the tracked file in file mode", () => {
		const paths = ["Drafts/one.md", "Drafts/two.md"];

		expect(getTrackedMarkdownPaths("file", "Drafts/two.md", paths)).toEqual(["Drafts/two.md"]);
	});

	it("returns all files inside the tracked folder in folder mode", () => {
		const paths = ["Novel/ch1.md", "Novel/Scenes/ch2.md", "Notes/idea.md"];

		expect(getTrackedMarkdownPaths("folder", "Novel", paths)).toEqual([
			"Novel/ch1.md",
			"Novel/Scenes/ch2.md",
		]);
	});

	it("returns no paths for manual mode", () => {
		expect(getTrackedMarkdownPaths("manual", "Novel", ["Novel/ch1.md"])).toEqual([]);
	});
});

describe("getProjectTotalFromTrackedWords", () => {
	it("adds tracked words on top of the project starting word count", () => {
		expect(getProjectTotalFromTrackedWords(20000, 1500)).toBe(21500);
	});

	it("applies manual adjustment on top of tracked words", () => {
		expect(getProjectTotalFromTrackedWords(20000, 1500, -125)).toBe(21375);
	});

	it("never returns less than the starting word count", () => {
		expect(getProjectTotalFromTrackedWords(20000, -500, -250)).toBe(20000);
	});
});
