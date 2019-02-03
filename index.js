const logger = require('pino')();
const dbLogger = logger.child({ module: 'db' });
const apiLogger = logger.child({ module: 'api' });
const moviedbLogger = logger.child({ module: 'moviedb' });
const syncLogger = logger.child({ module: 'sync' });
const imageDownloaderLogger = logger.child({ module: 'image_downloader' });

// TODO: read this from yaml
const config = {
  dbPath: '.',
  dbSchema: './db_schema.sql',
  port: 3000,
  watchedFolder: './watched',
  moviedb: {
    apiKey: '3709d7c83bb78de89f9087776b362df0'
  }
};

// init modules
const db = require('./src/db')(dbLogger, config);
const api = require('./src/api')(db, apiLogger);
const moviedb = require('./src/moviedb')(moviedbLogger, config);
const imageDownload = require('./src/image')(imageDownloaderLogger);
const sync = require('./src/sync')(db, moviedb, imageDownload, syncLogger, config);

sync.start()
  .then(() => {
    sync.watch();
    api.listen(config.port);
  });
