import type SpeechRequestHandler from "../SpeechRequestHandler";

export default class SpeechFileManager {
    RequestHandler: SpeechRequestHandler
    constructor(RequestHandler: SpeechRequestHandler) {
        this.RequestHandler = RequestHandler;
    }
}