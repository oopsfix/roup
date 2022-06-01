'use strict';

const {spawn} = require('child_process');
const fsCommon = require('fs');
const fs = require('fs/promises');
const path = require('path');

class ContentReader {
    
    contents = [];
    
    constructor(path) {
        this.path = path;
    }
    
    async isFile() {
        return !(await fs.stat(this.path)).isDirectory();
    }
    
    async run() {
        try {
            if (await this.isFile()) {
                return [this.path];
            }
            
            const items = await fs.readdir(this.path, {
                withFileTypes: true
            });
            
            const subdirPromises = [];
            
            items.forEach((dirent, i) => {
                const entityPath = path.join(this.path, dirent.name);
                
                this.contents.push(entityPath);
                
                if (dirent.isDirectory()) {
                    subdirPromises.push(new Promise((resolve, reject) => {
                        resolve(
                            new ContentReader(entityPath).run()
                        );
                    }));
                }
            });
            
            return subdirPromises.length == 0 
            ? this.contents 
            : Promise.all(subdirPromises).then((entries) => {
                return this.contents.concat(entries.flat());
            })
        } catch (err) {
            return err;
        }
    }
}

module.exports = ContentReader;