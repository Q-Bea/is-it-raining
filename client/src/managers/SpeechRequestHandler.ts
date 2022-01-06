import Main, { BaseManager } from "./..";
import SpeechFileManager from "./speechSubRoutine/SpeechFileManager";
import SpeechServicesAPI from "./speechSubRoutine/SpeechServicesAPI";


export default class SpeechRequestHandler extends BaseManager {
    FileManager: SpeechFileManager
    ServiceAPI: SpeechServicesAPI 
    constructor(Main: Main) {
        super(Main);

        this.FileManager = new SpeechFileManager(this);
        this.ServiceAPI = new SpeechServicesAPI(this);
    }

    setup() {
        this.ServiceAPI.setupDirectories();
    }
}