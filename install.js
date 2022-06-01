'use strict';

const {copyFileSync} = require('fs');
const path = require('path');

const roupFile = path.join(process.env.INIT_CWD, 'roup.js');

copyFileSync(
    path.join(__dirname, './bin/upgrader.js.dist'),
    roupFile
);

console.log('created', roupFile);