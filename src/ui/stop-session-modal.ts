import { App, Modal, Setting } from "obsidian";
import { sanitizeNumber } from "../settings";

interface StopSessionModalOptions {
	currentWordCount: number;
	projectName: string;
	sessionStartingWordCount: number;
	trackingMode: "manual" | "file" | "folder";
	startingWordCount: number;
	trackedWordCount: number;
	manualWordCountAdjustment: number;
	onSubmit: (endingWordCount: number) => Promise<void>;
}

export class StopSessionModal extends Modal {
	private endingWordCount: number;
	private readonly options: StopSessionModalOptions;

	constructor(app: App, options: StopSessionModalOptions) {
		super(app);
		this.options = options;
		this.endingWordCount = options.currentWordCount;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h2", { text: "Stop writing session" });
		contentEl.createEl("p", {
			text: `Review the final project total for ${this.options.projectName} before ending this session.`,
		});
		contentEl.createEl("p", {
			text:
				this.options.trackingMode === "manual"
					? `This is the full project total. The session started at ${this.options.sessionStartingWordCount} words, and the difference will be logged for the session.`
					: `This project total is calculated automatically. The session started at ${this.options.sessionStartingWordCount} words, and the difference will be logged for the session.`,
		});

		if (this.options.trackingMode === "manual") {
			new Setting(contentEl)
				.setName("Final project total")
				.setDesc("Enter the total project word count after this session, not just the words written this session.")
				.addText((text) => {
					text.inputEl.type = "number";
					text.setValue(String(this.endingWordCount));
					text.onChange((value) => {
						this.endingWordCount = sanitizeNumber(Number.parseInt(value, 10), this.endingWordCount);
					});
				});
		} else {
			new Setting(contentEl)
				.setName("Starting word count")
				.setDesc(`${this.options.startingWordCount} words`);

			new Setting(contentEl)
				.setName(this.options.trackingMode === "file" ? "Tracked note words" : "Tracked folder words")
				.setDesc(`${this.options.trackedWordCount} words`);

			if (this.options.manualWordCountAdjustment !== 0) {
				new Setting(contentEl)
					.setName("Manual adjustment")
					.setDesc(`${this.options.manualWordCountAdjustment} words`);
			}

			new Setting(contentEl)
				.setName("Final project total")
				.setDesc(`${this.options.currentWordCount} words`);
		}

		new Setting(contentEl)
			.addButton((button) =>
				button.setButtonText("Cancel").onClick(() => {
					this.close();
				}),
			)
			.addButton((button) =>
				button
					.setCta()
					.setButtonText("Stop session")
					.onClick(async () => {
						await this.options.onSubmit(this.endingWordCount);
						this.close();
					}),
			);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
