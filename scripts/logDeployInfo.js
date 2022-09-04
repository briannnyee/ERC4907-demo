const fs = require("fs");

async function logDeployInfo(fname, info) {
    const data = JSON.stringify(info, null, 2);

    fs.writeFile(fname, data, (err) => {
        if (err) throw err;
        // console.log('Data written to file');
    });
}

module.exports = logDeployInfo;