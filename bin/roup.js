#!/usr/bin/env node

'use strict';

const {
    ContentReader,
    FileVersionFactory,
    stat
} = require('../index');
const path = require('path');
const {writeFileSync} = require('fs');

module.exports = async (CONFIG) => {
    console.log('Starting upgrade...');
    
    let workers = [];
    for (let trackEntry of CONFIG.trackContents) {
        
        const pathTrackEntry = path.join(
                CONFIG.pathRotorRepository,
                trackEntry
        );
        
        console.log('Reading', pathTrackEntry);
        
        const entries = await new ContentReader(pathTrackEntry).run();
        
        console.log('Found', entries.length, 'entries');
        
        const factoryFiles = new FileVersionFactory(entries, CONFIG);
        
        factoryFiles.on('statusMessage', (message) => {
            console.log(message);
        });
        
        const promiseFactoryFiles = factoryFiles.run();
        
        workers.push(promiseFactoryFiles);
        
        const result = await promiseFactoryFiles;
        
        stat(result);
    }
    
    Promise.all(workers).then(() => {
        console.log('Upgrade completed');
        
        const st = stat();
        
        writeFileSync(CONFIG.log, JSON.stringify(st, null, 2));
        
        console.log(`
        Обновлены файлы (${st.copiedFiles.length}):
        ${st.copiedFiles.length ? st.copiedFiles.join('\n') : ''}
        Файлы с конфликтом при слиянии, обязательно посмотрите ${st.conflictFiles.length}:
        ${st.conflictFiles.length ? st.conflictFiles.join('\n') : ''}
        Новые файлы ${st.copiedNewFiles.length}:
        ${st.copiedNewFiles.length ? st.copiedNewFiles.join('\n') : ''}
        `.trim().replaceAll(/^\s*|\t*/gm, ''));
    });
};
    
process
  .on('unhandledRejection', (reason, p) => {
    console.error(reason.toString(), 'Unhandled Rejection at Promise', p.toString());
    console.dir(p);
  })
  .on('uncaughtException', err => {
    console.error(err, 'Uncaught Exception thrown');
    process.exit(1);
 });