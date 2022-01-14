import type SpeechRequestHandler from "../SpeechRequestHandler";
import fs from "fs";
import fsExtra from "fs-extra";
import { AudioFileType } from "../SpeechRequestHandler";

const INTERNAL_AUDIO_PATH_POST_CWD = "/audio";
const GENERATED_AUDIO_PATH_POST_CWD = INTERNAL_AUDIO_PATH_POST_CWD + "/generated";

export type ValidAudioFileName = `${string}.wav`
export default class SpeechFileManager {
    protected RequestHandler: SpeechRequestHandler;
    constructor(RequestHandler: SpeechRequestHandler) {
        this.RequestHandler = RequestHandler;
    }

    ensureValidFileName(fileName: string): ValidAudioFileName {
        if (fileName.endsWith(".wav")) return fileName as ValidAudioFileName;

        return fileName + ".wav" as ValidAudioFileName;
    }

    setupDirectories() {
        if (!fs.existsSync(this.RequestHandler.Main.ensureCorrectCWD() + INTERNAL_AUDIO_PATH_POST_CWD)) {
            fs.mkdirSync(this.RequestHandler.Main.ensureCorrectCWD() + INTERNAL_AUDIO_PATH_POST_CWD);
        }

        if (!fs.existsSync(this.RequestHandler.Main.ensureCorrectCWD() + GENERATED_AUDIO_PATH_POST_CWD)) {
            fs.mkdirSync(this.RequestHandler.Main.ensureCorrectCWD() + GENERATED_AUDIO_PATH_POST_CWD);
        }
    }

    checkIfFileExists(fileName: ValidAudioFileName, audioFileType: AudioFileType, overrideNonExistentCheck = false) {
        switch (audioFileType) {
            case AudioFileType.INTERNAL:
                return fs.existsSync(this.RequestHandler.Main.ensureCorrectCWD() + `${INTERNAL_AUDIO_PATH_POST_CWD}/${fileName}`);
                break;

            case AudioFileType.GENERATED:
                if (!overrideNonExistentCheck && !this.RequestHandler.Main.SettingsManager.getSettings().savePreviousAudioFiles) {
                    return false;
                }

                return fs.existsSync(this.RequestHandler.Main.ensureCorrectCWD() + `${GENERATED_AUDIO_PATH_POST_CWD}/${fileName}`);
                break;

            default:
                return false;
        }
    }

    getFilePathForSaving(fileName: ValidAudioFileName, audioFileType: AudioFileType) {
        switch (audioFileType) {
            case AudioFileType.INTERNAL:
                return this.RequestHandler.Main.ensureCorrectCWD() + `${INTERNAL_AUDIO_PATH_POST_CWD}/${fileName}`;
                break;

            case AudioFileType.GENERATED:
                return this.RequestHandler.Main.ensureCorrectCWD() + `${GENERATED_AUDIO_PATH_POST_CWD}/${fileName}`;
                break;

            default:
                //FIXME Maybe this can go elsewhere, it makes sense it goes here though..
                return this.RequestHandler.Main.ensureCorrectCWD() + `${GENERATED_AUDIO_PATH_POST_CWD}/${fileName}`;
        }
    }

    streamFromFile(fileName: ValidAudioFileName, audioFileType: AudioFileType) {
        if (!this.checkIfFileExists(fileName, audioFileType, true)) return undefined;
        switch (audioFileType) {
            case AudioFileType.INTERNAL:
                return fs.createReadStream(this.RequestHandler.Main.ensureCorrectCWD() + `${INTERNAL_AUDIO_PATH_POST_CWD}/${fileName}`);
                break;

            case AudioFileType.GENERATED:
                return fs.createReadStream(this.RequestHandler.Main.ensureCorrectCWD() + `${GENERATED_AUDIO_PATH_POST_CWD}/${fileName}`);
                break;

            default:
                return undefined;
        }
    }

    /**
     * If do not save is enabled, delete everything
     */
    possiblePurge() {
        if (!this.RequestHandler.Main.SettingsManager.getSettings().savePreviousAudioFiles) {
            fsExtra.emptyDirSync(this.RequestHandler.Main.ensureCorrectCWD() + `${GENERATED_AUDIO_PATH_POST_CWD}`);
        }
    }

    absolutePurge(purgeLocation: "generated"|"internal"|"both" = "generated") {
        if (purgeLocation === "generated" || purgeLocation === "both") {
            fsExtra.emptyDirSync(this.RequestHandler.Main.ensureCorrectCWD() + `${GENERATED_AUDIO_PATH_POST_CWD}`);
        }

        if (purgeLocation === "internal" || purgeLocation === "both") {
            fsExtra.emptyDirSync(this.RequestHandler.Main.ensureCorrectCWD() + `${INTERNAL_AUDIO_PATH_POST_CWD}`);
        }

        //I'm too lazy to do this correctly
        this.setupDirectories();
    }

    deleteSpecificFile(fileName: ValidAudioFileName, audioFileType: AudioFileType) {
        if (!this.checkIfFileExists(fileName, audioFileType, true)) return undefined;
        switch (audioFileType) {
            case AudioFileType.INTERNAL:
                if (fs.existsSync(this.RequestHandler.Main.ensureCorrectCWD() + `${INTERNAL_AUDIO_PATH_POST_CWD}/${fileName}`)) {
                    fs.rmSync(this.RequestHandler.Main.ensureCorrectCWD() + `${INTERNAL_AUDIO_PATH_POST_CWD}/${fileName}`);
                }
                break;

            case AudioFileType.GENERATED:
                if (fs.existsSync(this.RequestHandler.Main.ensureCorrectCWD() + `${GENERATED_AUDIO_PATH_POST_CWD}/${fileName}`)) {
                    fs.rmSync(this.RequestHandler.Main.ensureCorrectCWD() + `${GENERATED_AUDIO_PATH_POST_CWD}/${fileName}`);
                }                
                break;

            default:
                return undefined;
        }
    }
}