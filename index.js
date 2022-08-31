const backup = require("./lib/pgdump");
const restore = require("./lib/pgrestore");

module.exports.backup = backup;
module.exports.restore = restore;
