import LocalStorageInstanceManager, {LocalStorageInstance} from "./storageSub/LocalStorageManager";

import Main from "../";

type fileName = string

export default class StorageManager {   
    instances: Map<fileName, LocalStorageInstance>;
    Main: Main;

    LocalInterfaceManager: LocalStorageInstanceManager;
    constructor(Main: Main) {       
        this.Main = Main;

        this.LocalInterfaceManager = new LocalStorageInstanceManager(this);

        this.instances = new Map();
    }
    
    createInstance(fileNameNoExt: string, resetFile = true): LocalStorageInstance {
        const newInstance = this.LocalInterfaceManager.createInstance(fileNameNoExt, resetFile);
        this.instances.set(fileNameNoExt, newInstance);
        return newInstance;
    }

    removeInstance(fileNameNoExt: string): boolean {
        if (!this.instances.has(fileNameNoExt)) {
            return false;
        }

        this.instances.get(fileNameNoExt)!.purgeInstance();

        return this.instances.delete(fileNameNoExt);
    }
}