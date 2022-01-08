//Responsible for converting an input list of property requests into a relevant dialogue string

import type SpeechRequestHandler from "../SpeechRequestHandler";
import {sample} from "lodash";
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
                if(!dialogue.find(existingObject => { 
                    if (existingObject.fileName === object.fileName) {
                        existingObject.properties = object.properties;
                        existingObject.text = object.text;
                        return true;
                    }
                })) {
                    dialogue.push(object);
                }
            }
        }

        return dialogue;
    }

    requestDialogueObject(requiredProperties: KnownProperties[]): DialogueObject|undefined {
        const availableDialogue = this.getDialogueObjects();

        //In case there is multiple with the same score, which is when we pick randomly
        const contested: number[] = [];

        let bestMatch:[bestID: number, score: number]|null = null;

        availableDialogue.forEach((dialogue, index) => {
            let points = 0;
            let invalid = false;
            //There is a special case for audio with 0 properties. Because they could match anything otherwise,
            //Now, they can only be picked for requests that also have 0 requirements

            //There is also a special case for Future text, Future dialogs and current dialogs cannot mingle
            if (requiredProperties.includes("Future") && dialogue.properties.includes("Future") === false) return;

            //The reverse of this is covered already from that rule that dialogue with addition rules cannot be picked

            if (dialogue.properties.length === 0 && requiredProperties.length === 0) {
                if (bestMatch !== null) bestMatch = null;
                contested.push(index);
                return
            } else {
                for (const property of dialogue.properties) {
                    if (requiredProperties.includes(property)) {
                        points += 1;
                    } else {
                        invalid = true;
                        break;
                    }
                }
            }

            //Dialogue contained a property isn't represented by the current weather
            if (invalid) return;

            if (bestMatch === null || bestMatch[1] < points) {
                bestMatch = [index, points];
                contested.length = 0;
            } else {
                if (bestMatch && bestMatch[1] === points) {
                    contested.push(bestMatch[0]);
                    bestMatch = [index, points];
                }
            }
        });

        if (bestMatch) {
            contested.push(bestMatch[0]);
        } 
        
        if (contested.length >= 1) {
            return availableDialogue[sample(contested)!];
        } else {
            const wildcards = availableDialogue.filter(dialogue => dialogue.properties.length === 1 && dialogue.properties[0] === "*")
            if (wildcards.length > 0) return sample(wildcards);

            return undefined;
        }
    }
}