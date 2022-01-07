//Responsible for converting an input list of property requests into a relevant dialogue string

import type SpeechRequestHandler from "../SpeechRequestHandler";

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
    fileName: string
}

export default class SpeechDialogueManager {
    RequestHandler: SpeechRequestHandler
    constructor(RequestHandler: SpeechRequestHandler) {
        this.RequestHandler = RequestHandler;
    }

    getDialogueObjects() {
        this.RequestHandler.Main.StorageManager.instances.get(this.RequestHandler.Main.config.motherDownloadedConfigFilename)?.getJSON("dialogues")
    }

    requestDialogueObject(requiredProperties: KnownProperties[]) {

    }
}