const logger = require('pino')();
const apiLogger = logger.child({ module: 'api' });
const moviedbLogger = logger.child({ module: 'moviedb' });
const syncLogger = logger.child({ module: 'sync' });
const imageDownloaderLogger = logger.child({ module: 'image_downloader' });

const config = {
  imagesFolder: './images',
  watchedFolder: './watched'
};

const db = require('./src/db');
const api = require('./src/api')(db, apiLogger);
const moviedb = require('./src/moviedb')(moviedbLogger);
const imageDownload = require('./src/image')(imageDownloaderLogger);
const sync = require('./src/sync')(db, moviedb, imageDownload, syncLogger, config);

sync.start()
  .then(() => {
    sync.watch();
    api.listen(3000);
  });
