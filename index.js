'use strict';

const classMap = [
    'ContentReader',
    'FileVersionFactory',
    'stat'
].map((cl, i) => {
    return {[cl]: require(`./src/${cl}`)}
}).forEach((item, i) => {
    const className = Object.keys(item)[0];
    exports[className] = item[className];
});

exports.bin = require('./bin/roup');