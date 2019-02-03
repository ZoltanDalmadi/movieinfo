PRAGMA foreign_keys = off;
BEGIN TRANSACTION;

-- Table: actor
CREATE TABLE actor (
    id             INTEGER PRIMARY KEY AUTOINCREMENT
                           UNIQUE
                           NOT NULL,
    name           TEXT    NOT NULL,
    image_id       INTEGER REFERENCES image (id) ON DELETE CASCADE,
    birthday       TEXT,
    deathday       TEXT,
    biography      TEXT,
    place_of_birth TEXT
);

-- Table: genre
CREATE TABLE genre (
    id   INTEGER PRIMARY KEY
                 NOT NULL
                 UNIQUE,
    name TEXT    UNIQUE
                 NOT NULL
);

-- Table: image
CREATE TABLE image (
    id  INTEGER PRIMARY KEY AUTOINCREMENT
                UNIQUE
                NOT NULL,
    url TEXT    NOT NULL
                UNIQUE
);

-- Table: movie
CREATE TABLE movie (
    id             INTEGER PRIMARY KEY AUTOINCREMENT
                           NOT NULL
                           UNIQUE,
    title          TEXT    NOT NULL,
    year           INTEGER NOT NULL,
    path           TEXT    UNIQUE
                           NOT NULL,
    description    TEXT,
    original_title TEXT,
    backdrop_id    INTEGER REFERENCES image (id)
                           NOT NULL,
    cover_id       INTEGER REFERENCES image (id)
                           NOT NULL,
    quality        TEXT    NOT NULL
);

-- Table: movie_actors
CREATE TABLE movie_actors (
    movie_id  INTEGER NOT NULL
                      REFERENCES movie (id) ON DELETE CASCADE,
    actor_id  INTEGER NOT NULL
                      REFERENCES actor (id),
    character TEXT    NOT NULL
);

-- Table: movie_genres
CREATE TABLE movie_genres (
    movie_id INTEGER NOT NULL
                     REFERENCES movie (id) ON DELETE CASCADE,
    genre_id INTEGER NOT NULL
                     REFERENCES genre (id)
);

-- Trigger: ACTOR_CLEANUP
CREATE TRIGGER ACTOR_CLEANUP
         AFTER DELETE
            ON actor
BEGIN
    DELETE FROM image
          WHERE id = OLD.image_id;
END;

-- Trigger: MOVIE_CLEANUP
CREATE TRIGGER MOVIE_CLEANUP
         AFTER DELETE
            ON movie
BEGIN
    DELETE FROM image
          WHERE image.id = OLD.cover_id;
    DELETE FROM image
          WHERE image.id = OLD.backdrop_id;
    DELETE FROM actor
          WHERE id NOT IN (
        SELECT id
          FROM actor
               JOIN
               movie_actors ON actor_id = actor.id
    );
END;

-- View: actor_movies
CREATE VIEW actor_movies AS
    SELECT movie_actors.actor_id,
           movie.id,
           movie.title,
           movie.year,
           movie_actors.character,
           image.url AS cover
      FROM movie_actors
           JOIN
           movie ON movie.id = movie_actors.movie_id
           JOIN
           image ON image.id = movie.cover_id
     ORDER BY movie.title;

-- View: actor_view
CREATE VIEW actor_view AS
    SELECT actor.id,
           actor.name,
           actor.birthday,
           actor.deathday,
           actor.place_of_birth,
           actor.biography,
           image.url AS image
      FROM actor
           JOIN
           image ON actor.image_id = image.id;

-- View: actors
CREATE VIEW actors AS
    SELECT actor.id,
           actor.name,
           image.url AS image
      FROM actor
           JOIN
           image ON image.id = actor.image_id;

-- View: movie_cast
CREATE VIEW movie_cast AS
    SELECT movie_actors.movie_id,
           actor.id,
           actor.name,
           movie_actors.character,
           image.url AS image
      FROM movie_actors
           JOIN
           actor ON actor.id = movie_actors.actor_id
           JOIN
           image ON image.id = actor.image_id;

-- View: movie_view
CREATE VIEW movie_view AS
    SELECT movie.id,
           movie.title,
           movie.year,
           movie.original_title,
           movie.description,
           backdrop.url AS backdrop,
           cover.url AS cover
      FROM movie
           JOIN
           image AS backdrop ON backdrop.id = movie.backdrop_id
           JOIN
           image AS cover ON cover.id = movie.cover_id
     ORDER BY movie.title;

-- View: movies
CREATE VIEW movies AS
    SELECT movie.id,
           movie.title,
           movie.original_title,
           movie.year,
           movie.quality,
           image.url AS cover
      FROM movie
           JOIN
           image ON image.id = movie.cover_id
     ORDER BY movie.title;

COMMIT TRANSACTION;
PRAGMA foreign_keys = on;
