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

class TaskQueue {
  constructor(afterTasks) {
    this.tasks = [];
    this.running = false;
    this.afterTasks = afterTasks;
  }

  push(task) {
    this.tasks.push(task);
    if (!this.running) {
      return this.run();
    }

    return Promise.resolve();
  }

  async run() {
    this.running = true;
    let task = this.tasks.shift();

    while (task) {
      await task();
      task = this.tasks.shift();
    }

    await this.afterTasks();

    if (this.tasks.length) {
      this.run();
    }

    this.running = false;
  }
}

module.exports = (db, moviedb, imageDownload, logger, config) => {
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
      .then(movie => imageDownload(movie, config.imagesFolder))
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

  const tq = new TaskQueue(() => cleanup(config.imagesFolder));

  return {
    start: () => {
      logger.info('Syncing...');
      return tq.push(() => sync(config.watchedFolder));
    },
    watch: () => {
      logger.info('Watching folder...');
      return watch(config.watchedFolder, () => tq.push(() => sync(config.watchedFolder)));
    }
  };
};

// const dirName = process.argv[3];

// if (!isMovieInDB(dirName)) {
// } else {
//   logger.info(`Movie is already in DB at path: ${dirName}`);
// }
