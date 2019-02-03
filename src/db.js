const { join } = require('path');
const { existsSync, readFileSync } = require('fs');
const Database = require('better-sqlite3');

module.exports = (logger, { dbPath, dbSchema }) => {
  const dbFile = join(dbPath, 'movieinfo.db');

  const needToInit = !existsSync(dbFile);
  const db = new Database(dbFile);

  if (needToInit) {
    logger.info(`Initializing new database at "${dbPath}"`);
    const schema = readFileSync(dbSchema, 'utf8');
    db.exec(schema);
  } else {
    logger.info(`Using existing database at "${dbPath}"`);
  }

  // ACTOR ---------------------------------------------------------------------
  const actorStatement = db.prepare('SELECT * FROM actor_view WHERE id = ?');

  const actorsStatement = db.prepare('SELECT * FROM actors');

  const movieActorsStatement = db.prepare(`
    SELECT id, name, character, image FROM movie_cast
    WHERE movie_id = ?
  `);

  const actorMoviesStatement = db.prepare(`
    SELECT id, title, year, character, cover FROM actor_movies
    WHERE actor_id = ?;
  `);

  const insertActor = db.prepare(`
    INSERT OR IGNORE INTO actor
    (id, name, image_id, birthday, deathday, biography, place_of_birth)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMovieActor = db.prepare(
    'INSERT OR IGNORE INTO movie_actors (movie_id, actor_id, character) VALUES (?, ?, ?)'
  );

  // MOVIE ---------------------------------------------------------------------
  const movieStatement = db.prepare('SELECT * FROM movie_view WHERE id = ?');

  const moviesStatement = db.prepare('SELECT * FROM movies');

  const insertMovie = db.prepare(`
    INSERT OR IGNORE INTO movie
    (title, year, path, description, original_title, backdrop_id, cover_id, quality)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const deleteMovieStatement = db.prepare('DELETE FROM movie WHERE path = ?');

  const selectMoviePath = db.prepare('SELECT id FROM movie WHERE path = ?');
  const selectAllMoviePaths = db.prepare('SELECT path FROM movie').pluck();

  // GENRE ---------------------------------------------------------------------
  const movieGenresStatement = db.prepare(`
    SELECT genre.name FROM movie_genres
    JOIN genre ON genre.id = movie_genres.genre_id
    WHERE movie_id = ?
  `).pluck();

  const insertGenre = db.prepare('INSERT OR IGNORE INTO genre (id, name) values (?, ?)');
  const insertMovieGenre = db.prepare(
    'INSERT OR IGNORE INTO movie_genres (movie_id, genre_id) VALUES (?, ?)'
  );

  // IMAGE ---------------------------------------------------------------------
  const insertImage = db.prepare('INSERT OR IGNORE INTO image (url) values (?)');
  const selectAllImages = db.prepare('SELECT url FROM image').pluck();

  // FUNCTIONS -----------------------------------------------------------------
  function getActor(id) {
    const actor = actorStatement.get(id);

    if (actor) {
      actor.movies = actorMoviesStatement.all(id);
    }

    return actor;
  }

  function getMovie(id) {
    const movie = movieStatement.get(id);

    if (movie) {
      movie.genres = movieGenresStatement.all(id);
      movie.actors = movieActorsStatement.all(id);
    }

    return movie;
  }

  const getActors = () => actorsStatement.all();
  const getMovies = () => moviesStatement.all();

  function persistImage(image) {
    return insertImage.run(image).lastInsertRowid;
  }

  function persistGenre(id, name) {
    insertGenre.run(id, name);
  }

  function persistMovieGenre(movie_id, genre_id) {
    insertMovieGenre.run(movie_id, genre_id);
  }

  function persistActor(actor, image_id) {
    const info = insertActor.run(
      actor.id, actor.name, image_id,
      actor.birthday, actor.deathday, actor.biography, actor.place_of_birth
    );
    return info.changes > 0;
  }

  function persistMovieActor(movie_id, actor_id, character) {
    insertMovieActor.run(movie_id, actor_id, character);
  }

  const persistMovie = db.transaction((movie, path, quality) => {
    const { title, year, description, original_title } = movie;

    const cover_id = persistImage(movie.cover);
    const backdrop_id = persistImage(movie.backdrop);

    const info = insertMovie.run(
      title, year, path, description, original_title, backdrop_id, cover_id, quality
    );

    if (info.changes) {
      const movie_id = info.lastInsertRowid;

      for (const genre of movie.genres) {
        persistGenre(genre.id, genre.name);
        persistMovieGenre(movie_id, genre.id);
      }

      for (const actor of movie.actors) {
        const actor_image_id = persistImage(actor.image);
        persistActor(actor, actor_image_id);
        persistMovieActor(movie_id, actor.id, actor.character);
      }
    }
  });

  function deleteMovie(path) {
    return deleteMovieStatement.run(path);
  }

  function isMovieInDB(path) {
    return !!selectMoviePath.get(path);
  }

  function getAllMoviePaths() {
    return selectAllMoviePaths.all();
  }

  function getAllImages() {
    return selectAllImages.all();
  }

  return {
    persistMovie,
    deleteMovie,
    isMovieInDB,
    getMovie,
    getMovies,
    getActor,
    getActors,
    getAllMoviePaths,
    getAllImages,
  };
};
