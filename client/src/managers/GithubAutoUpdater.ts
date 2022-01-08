//Check the git status to see if this build is behind, if it is, git pull, tsc, and reboot
import Main, { BaseManager } from "..";
import { exec } from "child_process";

export default class GithubAutoUpdateManager extends BaseManager {
    gitUrl: string
    constructor(Main: Main) {
        super(Main);

        this.gitUrl = "git@github.com:Quantum158/is-it-raining.git";
    }

    private async checkUpToDate(): Promise<boolean> {
        return new Promise(async (resolve) => {
            console.log("Checking if up to date...")
            const fetch = exec("git fetch", (err, stdout, stderr) => {
                return;
            })
            fetch.on("close", () => {
                exec("git status", (err, stdout, stderr) => {
                    if (err) {
                        // node couldn't execute the command
                        console.error("Couldn't check status, oh well.")
                        resolve(true);
                        return
                    }
                    
                    // the *entire* stdout and stderr (buffered)
                    resolve(this.getStatusFromRaw(stdout))
                    // console.log(`stderr: ${stderr}`);
                })
            })
        })
    }

    private getStatusFromRaw(stdout: string): boolean {
        const toDateString = stdout.split("\n")[1];

        if (toDateString.includes("up to date")) {
            console.log("Congrats! You are up to date. No action is needed.")
            return true;
        }

        console.log("You are not up to date! Updating recommended...")
        return false;
    }

    private async pull() {
        return new Promise(async (resolve) => {
            console.log("Forcefully downloading latest update...")
            exec("git pull --force", (err, stdout, stderr) => {
                if (err) {
                    // node couldn't execute the command
                    console.log("Could not update! Oh well...")
                    console.error(err);
                    resolve(false);
                    return;
                }
                
                // the *entire* stdout and stderr (buffered)
                resolve(this.getPullStatus(stdout));
                // console.log(`stderr: ${stderr}`);
            })
        })
    }

    private getPullStatus(stdout: string) {
        if (stdout.split("\n")[0].includes("Already up to date")) return true;

        if (stdout.split("\n")[0].includes("Updating")) return true;

        return false;
    }

    private ensureCorrectCWD() {
        if (process.cwd().endsWith("client")) return process.cwd();

        else return process.cwd() + "/client";
    }

    private runTSC() {
        return new Promise(async (resolve) => {
            console.log("Running TSC!")
            exec("tsc", {cwd: this.ensureCorrectCWD()}, (err, stdout, stderr) => {
                if (err) {
                    // node couldn't execute the command
                    console.log("Could not compile!")
                    console.error(err);
                    resolve(false);
                    return;
                }
                
                // the *entire* stdout and stderr (buffered)
                resolve(true);
                // console.log(`stderr: ${stderr}`);
            })
        })
    }

    async fullUpdateRoutine() {
        const res = await this.checkUpToDate()
        if (!res) {
            if (await this.pull()) {
                console.log("Successfully downloaded latest build. Recompiling and restarting!")
                if (await this.runTSC()) {
                    console.log("Successfully compiled! Rebooting...")
                    process.kill(0);
                }
            }

        }
    }
}
