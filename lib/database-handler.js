/**
 * Handles single or multiple databases sent in PGDATABASE.
 */
function databaseHandler(config){
    let configs = []
    if (config.PGDATABASE.includes(",")) {
        let dbs = config.PGDATABASE.split(",")
        for (db of dbs){
            let newEvent = {...config, PGDATABASE: db.trim()}
            configs.push(newEvent)
        }
    } else {
        configs.push(config)
    }

    return configs
}

module.exports = databaseHandler