//Responsible for converting an input list of property requests into a relevant dialogue string

import type SpeechRequestHandler from "../SpeechRequestHandler";
import {sample} from "lodash";
import { ValidAudioFileName } from "./SpeechFileManager";

export enum KnownProperties {
    Raining = 1,
    Windy = 2,
    Cold = 3,
    Future = 4,
    RecentlyAsked = 5
}

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

            for (const property of dialogue.properties) {
                if (requiredProperties.includes(property)) {
                    points += 1;
                } else {
                    invalid = true;
                    break;
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
            if (contested.length > 1) {
                return availableDialogue[sample(contested)!];
            }
        } else {
            return undefined;
        }
    }
}