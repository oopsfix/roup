'use strict';

const GitWrap = require('./GitWrap');
const fsConstants = require('fs').constants;
const {statSync} = require('fs');
const fs = require('fs/promises');
const path = require('path');
const EventEmmiter = require('events');

class FileVersionFactory extends EventEmmiter {
    
    listEntries = [];
    config = {};
    errors = [];
    statusMessage = null;
    result = {
        conflictFiles: [],
        copiedFiles: [],
        copiedNewFiles: [],
        diffedFiles: 0,
        rotorLastCommit: ''
    };
    
    constructor(listEntries = [], config) {
        super();
        this.config = config;
        this.listEntries = this.makeNormalizePaths(listEntries);
        this.gitRotor = GitWrap.makeSession(config.pathRotorRepository);
        this.gitProject = GitWrap.makeSession(config.pathProject);
    }
    
    makeNormalizePaths(paths) {
        return paths.map((path) => {
            return path
                .replace(new RegExp(`^${this.config.pathRotorRepository}/`), '')
                .replace(new RegExp(`^${this.config.pathRotorRepository}`), '')
        });
    }
    
    async createTmpDir() {
        try {
            await fs.access(this.config.pathTmpDir, fsConstants.F_OK);
            await fs.rm(this.config.pathTmpDir, {recursive: true})
        } catch (err) {
            if (err.code == 'ENOENT') {
                try {
                    await fs.mkdir(this.config.pathTmpDir);
                } catch (err) {
                    throw err;
                }
            } else {
                throw err;
            }
        }
    }
    
    async recursiveCopyFile(pathTo, pathIn) {
        try {
            await fs.cp(pathTo, pathIn, {recursive: true});
        } catch (err) {
            this.errors.push(err);
        }
    }
    
    async makeBaseFiles() {
        try {
            let res = await this.gitRotor.checkoutCommit(this.config.lastIdCommit);
        } catch (err) {
            err.message += ' -> call method makeBaseFiles() checkoutCommit';
            throw err;
        }
        
        for (const entry of this.listEntries) {
            this.emit('statusMessage', 'Copying the base a file for '+ entry);
            
            await this.recursiveCopyFile(
                path.join(this.config.pathRotorRepository, entry),
                path.join(this.config.pathTmpDir, entry +'.base')
            );
        }
    }
    
    async makeNewFiles() {
        try {
            await this.gitRotor.checkoutLastCommit();
        } catch (err) {
            err.message += ' -> call method makeNewFiles() checkoutLastCommit';
            throw err;
        }
        
        for (const entry of this.listEntries) {
            this.emit('statusMessage', 'copying the new a file for '+ entry);
            
            await this.recursiveCopyFile(
                path.join(this.config.pathRotorRepository, entry),
                path.join(this.config.pathTmpDir, entry +'.new')
            );
        }
    }
    
    async makeCurrentFiles() {
        for (const entry of this.listEntries) {
            this.emit('statusMessage', 'copying current a file for '+ entry);
            
            await this.recursiveCopyFile(
                path.join(this.config.pathProject, entry),
                path.join(this.config.pathTmpDir, entry)
            );
        }
    }
    
    exceptNewEntries() {
        this.listEntries = this.listEntries.map((entry) => {
            try {
                statSync(
                    path.join(
                        this.config.pathProject,
                        entry
                    )
                );
                
                return entry;
            } catch (err) {
                this.result.copiedNewFiles.push(entry);
                
                return null;
            }
        }).filter((entry) => entry !== null);
    }
    
    exceptEntriesDerectories() {
        this.listEntries = this.listEntries.map((entry) => {
            return statSync(
                path.join(
                    this.config.pathRotorRepository,
                    entry
                )
            ).isDirectory() ? null : entry;
        }).filter((entry) => entry !== null);
    }
    
    exceptIgnoreEntries() {
        const ignores = [
            '.gitkeep'
        ];
        
        this.listEntries = this.listEntries.filter((entry) => {
            return !ignores.includes(
                path.basename(entry)
            );
        });
    }
    
    async filterDiffFiles(realeseFiles = false) {
        this.emit('statusMessage', 'Starting comparing files');
        this.result.diffedFiles = 0;
        
        const diffedFiles = [];
        
        let i = 0;
        for (let entry of this.listEntries) {
            try {
                this.emit('statusMessage', 'Comparing ' + entry);
                
                let res = null;
                if (realeseFiles) {
                    res = await this.gitProject.runGit([
                        'diff',
                        path.join(this.config.pathTmpDir, entry),
                        entry
                    ]);
                } else {
                    res = await this.gitRotor.runGit([
                        'diff',
                        entry,
                        '../' + entry
                    ]);
                }
                
                if (res.code === 1) {
                    diffedFiles.push(i);
                }
            } catch (err) {
                throw err;
            }
            i++;
        }
        
        this.listEntries = this.listEntries.filter((entry, i) => diffedFiles.includes(i));
        this.result.diffedFiles = diffedFiles.length;
        
        this.emit('statusMessage', `Found diffed files: ${diffedFiles.length}`);
        return this;
    }
    
    async makeRealeseFile(entry) {
        try {
            const res = await this.gitProject.runGit([
                'merge-file',
                path.join(this.config.pathTmpDir, entry),
                path.join(this.config.pathTmpDir, `${entry}.base`),
                path.join(this.config.pathTmpDir, `${entry}.new`),
            ]);
            
            return res.code;
        } catch (err) {
            throw err;
        }
    }
    
    async makeMergingFiles() {
        for (const entry of this.listEntries) {
            this.emit('statusMessage', 'Merging a file: ' + entry);
            try {
                const exitCode = await this.makeRealeseFile(entry);
                if (exitCode > 0) {
                    this.result.conflictFiles.push(entry);
                }
            } catch (err) {
                throw err;
            }
        }
    }
    
    async copyingProduction() {
        for (const entry of this.listEntries) {
            try {
                this.emit('statusMessage', 'Copying ' + entry);
                const res = await fs.cp(
                    path.join(this.config.pathTmpDir, entry),
                    path.join(this.config.pathProject, entry)
                );
                this.result.copiedFiles.push(entry);
            } catch (err) {
                throw err;
            }
        }
        
        for (const entry of this.result.copiedNewFiles) {
            try {
                this.emit('statusMessage', 'Copying new entry ' + entry);
                await fs.cp(
                    path.join(this.config.pathRotorRepository, entry),
                    path.join(this.config.pathProject, entry),
                    {recursive: true}
                );
            } catch (err) {
                throw err;
            }
        }
    }
    
    async run() {
        await this.createTmpDir();
        
        this.exceptIgnoreEntries();
        this.exceptEntriesDerectories();
        this.exceptNewEntries();
        
        await this.filterDiffFiles();
        this.emit('statusMessage', 'Starting copying the base version files');
        await this.makeBaseFiles();
        this.emit('statusMessage', 'Starting copying the new versions files');
        await this.makeNewFiles();
        this.emit('statusMessage', 'Starting copying the current files');
        await this.makeCurrentFiles();
        this.emit('statusMessage', 'Starting merging files');
        await this.makeMergingFiles();
        this.emit('statusMessage', 'Starting diffing a new files to project');
        await this.filterDiffFiles(true);
        this.emit('statusMessage', 'Starting copying to project');
        await this.copyingProduction();
        
        this.result.rotorLastCommit = await this.gitRotor.getCommitHead();
        
        return this.result;
    }
}

module.exports = FileVersionFactory;