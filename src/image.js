const fs = require('fs');
const path = require('path');
const axios = require('axios');

module.exports = logger => {
  const downloadImage = async (url, imagesDir) => {
    const fileName = url.substring(url.lastIndexOf('/') + 1);
    const filePath = path.join(imagesDir, fileName);

    if (!fs.existsSync(filePath)) {
      try {
        logger.info(`Downloading "${fileName}"...`);
        const { data } = await axios(url, { responseType: 'stream' });
        data.pipe(fs.createWriteStream(filePath));
        logger.info(`Successfully downloaded "${fileName}"`);
      } catch (err) {
        logger.error(`Could not download "${fileName}"!`);
      }
    }

    return fileName;
  };

  const downloadActorImages = (actors, imagesDir) => {
    return Promise.all(actors.map(async actor => ({
      ...actor,
      image: await downloadImage(actor.image, imagesDir)
    })));
  };

  return async (movie, imagesDir) => ({
    ...movie,
    cover: await downloadImage(movie.cover, imagesDir),
    backdrop: await downloadImage(movie.backdrop, imagesDir),
    actors: await downloadActorImages(movie.actors, imagesDir)
  });
};
