'use strict';

module.exports = function stat(resultData) {
    if (!stat.statData) {
        stat.statData = resultData;
        
        return stat.statData;
    } else if (resultData) {
        for (const key in resultData) {
            if (Array.isArray(resultData[key])) {
                stat.statData[key] = stat.statData[key].concat(resultData[key]);
            }
            if (typeof resultData[key] == 'number') {
                stat.statData[key] += resultData[key];
            }
        }
    }
    
    return stat.statData;
};