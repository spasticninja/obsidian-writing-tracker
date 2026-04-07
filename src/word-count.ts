import { ProjectTrackingMode } from "./types";

export function countWordsInText(text: string): number {
	const normalized = text
		.replace(/^---[\s\S]*?---\n?/m, " ")
		.replace(/`{3}[\s\S]*?`{3}/g, " ")
		.replace(/`[^`]*`/g, " ");

	const matches = normalized.match(/\b[\p{L}\p{N}'’-]+\b/gu);
	return matches?.length ?? 0;
}

export function getTrackedMarkdownPaths(
	mode: ProjectTrackingMode,
	trackedPath: string,
	allMarkdownPaths: string[],
): string[] {
	if (!trackedPath.trim() || mode === "manual") {
		return [];
	}

	if (mode === "file") {
		return allMarkdownPaths.includes(trackedPath) ? [trackedPath] : [];
	}

	const folderPrefix = trackedPath.endsWith("/") ? trackedPath : `${trackedPath}/`;
	return allMarkdownPaths.filter(
		(path) => path === trackedPath || path.startsWith(folderPrefix),
	);
}
