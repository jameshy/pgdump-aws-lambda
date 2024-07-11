/**
 * Parse database names from config.PGDATABASE
 */
function parseDatabaseNames(config) {
    if (!config.PGDATABASE) {
        throw new Error("PGDATABASE was not provided")
    }
    // we support two types of string:
    //  a) single database name e.g. "dbone"
    //  b) multiple database names e.g. "dbone, dbtwo"
    const dbnames = config.PGDATABASE.split(",").map(s => s.trim()).filter(s => s)
    return Array.from(new Set(dbnames))
}

module.exports = parseDatabaseNames