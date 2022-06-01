'use strict';

const {spawn} = require('child_process');

class GitWrap {
    
    constructor(pathCwd) {
        this.pathCwd = pathCwd;
    }
    
    static makeSession(pathCwd) {
        return new GitWrap(pathCwd);
    }
    
    async runGit(args = []) {
        const git = spawn('git', args, {cwd: this.pathCwd});
        
        let outputData  = '';
        let outputError = '';
        
        git.stdout.on('data', (data) => {
            outputData += data;
        }); 
        git.stderr.on('data', (data) => {
            outputError += data;
        }); 
        
        return new Promise((resolve, reject) => {
            git.on('close', (code) => {
                resolve({
                    code,
                    outputData,
                    outputError
                });
            });
            git.on('error', (err) => {
                reject(err);
            })
        });
    }
    
    async getCommitHead() {
        try {
            const output = await (await this.runGit(['rev-parse', 'HEAD']));
            
            return output.outputData.trim();
        } catch (err) {
            throw err;
        }
    }
    
    async checkoutCommit(commitId) {
        if (await this.getCommitHead() != commitId) {
            try {
                const res = await this.runGit(['checkout', commitId]);
                
                if (res.outputError.includes("You are in 'detached HEAD'")) {
                    return true;
                }
                if (res.outputError.includes('fatal: reference is not a tree')) {
                    throw new Error(`commit ${commitId} not found`);
                }
            } catch (err) {
                throw err;
            }
        }
        return false;
    }
    
    async checkoutLastCommit() {
        try {
            const res = await this.runGit(['checkout', 'master']);
            
            if (
                res.outputError.includes("Switched to branch 'master'")
                ||
                res.outputError.includes("Already on 'master'")
            ) {
                return true;
            } else {
                throw new Error('Error switch on master ' + res.outputError + res.outputData);
            }
        } catch (err) {
            throw err;
        }
    }
}

module.exports = GitWrap;