import { App, Modal, Setting } from "obsidian";
import { sanitizeNumber } from "../settings";

interface StopSessionModalOptions {
	currentWordCount: number;
	projectName: string;
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
			text: `Save the final word count for ${this.options.projectName}.`,
		});

		new Setting(contentEl)
			.setName("Ending word count")
			.setDesc("This value is used to update the project and calculate words written.")
			.addText((text) => {
				text.inputEl.type = "number";
				text.setValue(String(this.endingWordCount));
				text.onChange((value) => {
					this.endingWordCount = sanitizeNumber(Number.parseInt(value, 10), this.endingWordCount);
				});
			});

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
