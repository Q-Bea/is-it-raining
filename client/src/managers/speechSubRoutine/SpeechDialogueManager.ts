//Responsible for converting an input list of property requests into a relevant dialogue string

import type SpeechRequestHandler from "../SpeechRequestHandler";
import {indexOf, max, sample} from "lodash";
import { ValidAudioFileName } from "./SpeechFileManager";

export type KnownProperties =
    "Raining"|
    "Windy"|
    "Cold"|
    "Future"|
    "RecentlyAsked"|
    "*"

export interface DialogueObject {
    text: string
    properties: KnownProperties[]
    fileName: ValidAudioFileName
}

export default class SpeechDialogueManager {
    protected RequestHandler: SpeechRequestHandler;

    constructor(RequestHandler: SpeechRequestHandler) {
        this.RequestHandler = RequestHandler;
    }

    getDialogueObjects(): DialogueObject[] {
        const dialogue = this.RequestHandler.Main.config.fallbackSettings.dialogue;

        const downloadedDialogue = this.RequestHandler.Main.StorageManager.instances.get(this.RequestHandler.Main.config.motherDownloadedConfigFilename)?.getJSON("dialogues") as DialogueObject[]|undefined;

        if (downloadedDialogue) {
            for (const object of downloadedDialogue) {
                const existing = dialogue.find(existingObject => existingObject.fileName === object.fileName);

                if (existing) {
                    existingObject.properties = object.properties;
                    existingObject.text = object.text;
                    continue;
                } else {
                    dialogue.push(object);
                }
            }
        }

        return dialogue;
    }

    requestDialogueObject(requiredProperties: KnownProperties[]): DialogueObject|undefined {
        const availableDialogue = this.getDialogueObjects();

        //In case there is multiple with the same score, which is when we pick randomly
        const scores: Map<number, number> = new Map();

        //There is a special case for audio with 0 properties. Because they could match anything otherwise,
        //Now, they can only be picked for requests that also have 0 requirements
        //Because audio with properties not picked can't be chosen, this can be hardcoded

        if (requiredProperties.length === 0) {
            const noProperties = availableDialogue.filter(dialogue => dialogue.properties.length === 0)
            if (noProperties.length > 0) return sample(noProperties);

            return undefined;
        }

        if (requiredProperties.length === 1 && requiredProperties[0] === "Future") {
            const onlyFuture = availableDialogue.filter(dialogue => dialogue.properties.length === 1 && dialogue.properties[0] === "Future")
            if (onlyFuture.length > 0) return sample(onlyFuture);

            return undefined;
        }

        availableDialogue.forEach((dialogue, index) => {
            let points = 0;

            //There is also a special case for Future text, Future dialogs and current dialogs cannot mingle
            if (requiredProperties.includes("Future") && (dialogue.properties.includes("Future") === false)) return;

            //The reverse of this is covered already from that rule that dialogue with addition rules cannot be picked

            for (const property of dialogue.properties) {
                if (!requiredProperties.includes(property)) return;

                points += 1;
            }

            scores.set(index, points);
        });

        if (scores.size === 0) {
            //If there were no valid weathers we select from wildcards

            //Wildcards also cannot mix between current and future forcasts
            let wildcards;
            if (requiredProperties.includes("Future")) {
                wildcards = availableDialogue.filter(dialogue => dialogue.properties.length === 2 && dialogue.properties.includes("*") && dialogue.properties.includes("Future"))
            } else {
                wildcards = availableDialogue.filter(dialogue => dialogue.properties.length === 1 && dialogue.properties[0] === "*")
            }
            if (wildcards.length > 0) return sample(wildcards);

            return undefined;
        }

        const maxScores: [index: number, score: number][] = [];
        //Otherwise, we get the dialogue with the most points
        scores.forEach((score, index) => {
            if (maxScores.length === 0 || score > maxScores[0][1]) {
                maxScores.length = 0;
                maxScores.push([index, score]);
            } else if (score == maxScores[0][1]) {
                maxScores.push([index, score])
            }
        });

        return availableDialogue[sample(maxScores)![0]]
    }
}