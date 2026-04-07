export interface WritingGoal {
	enabled: boolean;
	target: number;
}

export interface WritingProject {
	id: string;
	name: string;
	startingWordCount: number;
	currentWordCount: number;
	wordGoal: WritingGoal;
	timeGoal: WritingGoal;
	notes: string;
}

export interface WritingTrackerSettings {
	projects: WritingProject[];
}
