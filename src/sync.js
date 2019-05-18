const { watch, readdirSync, unlinkSync } = require('fs');
const { join } = require('path');

function deduceTermAndYear(dirname) {
  const matches = dirname.match(/^(.*)\.([0-9]{4})\./i);
  return matches ? [matches[1].replace(/\./g, ' '), matches[2]] : [];
}

function deduceQuality(dirname) {
  const lowerDir = dirname.toLowerCase();
  return lowerDir.includes('1080p')
    ? '1080p'
    : lowerDir.includes('720p')
      ? '720p'
      : 'SD';
}

const tasks = [];
let running = false;
let afterTasks;

const push = task => {
  tasks.push(task);
  if (!running) {
    return run();
  }

  return Promise.resolve();
};

const run = () => {
  if (!tasks.length) {
    running = false;
    return afterTasks();
  }

  running = true;
  const task = tasks.shift();
  return task().then(run);
};

module.exports = (db, moviedb, imageDownload, logger, config) => {
  const { dbPath, watchedFolder } = config;
  const imagesFolder = join(dbPath, 'images');

  function removeMovie(movieFolder) {
    logger.info(`Removing movie folder ${movieFolder}...`);
    return Promise.resolve(db.deleteMovie(movieFolder));
  }

  async function cleanup(imagesFolder) {
    const folderContents = readdirSync(imagesFolder);
    const dbContents = db.getAllImages();
    const needToDelete = folderContents.filter(f => !dbContents.includes(f));

    needToDelete
      .map(f => join(imagesFolder, f))
      .forEach(p => {
        logger.info(`Removing ${p}...`);
        unlinkSync(p);
      });
  }

  function fetchMovie(movieFolder) {
    const [term, year] = deduceTermAndYear(movieFolder);
    const quality = deduceQuality(movieFolder);

    return moviedb(term, year)
      .then(movie => imageDownload(movie, imagesFolder))
      .then(movie => db.persistMovie(movie, movieFolder, quality))
      .catch(console.error);
  }

  async function sync(watchedFolder) {
    const folderContents = readdirSync(watchedFolder);
    const dbContents = db.getAllMoviePaths();

    const needToInsert = folderContents.filter(f => !dbContents.includes(f));
    const needToDelete = dbContents.filter(f => !folderContents.includes(f));

    for (const movie of needToInsert) {
      await fetchMovie(movie);
    }

    await Promise.all(needToDelete.map(removeMovie));
  }

  afterTasks = () => cleanup(imagesFolder);

  return {
    start() {
      logger.info('Syncing...');
      return push(() => sync(watchedFolder));
    },
    watch() {
      logger.info('Watching folder...');
      return watch(watchedFolder, () => push(() => sync(watchedFolder)));
    }
  };
};
