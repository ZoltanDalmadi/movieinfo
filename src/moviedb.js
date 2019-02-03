const { stringify } = require('querystring');
const axios = require('axios');

// const BASE_URL = 'https://api.themoviedb.org/3';
const BASE_URL = 'http://localhost:8080/moviedb';
const ENDPOINT_MOVIE = `${BASE_URL}/search/movie`;
const ENDPOINT_GENRES = `${BASE_URL}/genre/movie/list`;
const ENDPOINT_CONFIGURATION = `${BASE_URL}/configuration`;

const ENDPOINT_MOVIE_CREDITS = movie_id => `${BASE_URL}/movie/${movie_id}/credits`;
const ENDPOINT_PERSON = person_id => `${BASE_URL}/person/${person_id}`;
const API_KEY = '3709d7c83bb78de89f9087776b362df0';
const LANG = 'hu-HU';

function transformMovieData(data, config) {
  const movie = data.results[0];

  return {
    id: movie.id,
    title: movie.title,
    year: Number(movie.release_date.substr(0, 4)),
    description: movie.overview,
    original_title: movie.original_title,
    cover: config.images.base_url + 'original' + movie.poster_path,
    backdrop: config.images.base_url + 'original' + movie.backdrop_path,
    genres: movie.genre_ids
  };
}

function transformGenres(data, movieGenres) {
  return movieGenres.map(genre_id => data.genres.find(genre => genre.id === genre_id));
}

function transformMovieActors(data, config) {
  return data.cast.slice(0, 5).map(castMember => ({
    id: castMember.id,
    name: castMember.name,
    character: castMember.character,
    image: config.images.base_url + 'original' + castMember.profile_path
  }));
}

function transformActorDetails(data) {
  return {
    birthday: data.birthday,
    deathday: data.deathday,
    biography: data.biography,
    place_of_birth: data.place_of_birth
  };
}

module.exports = logger => {
  function getMovie(query, year, config) {
    const queryString = stringify({ api_key: API_KEY, language: LANG, query, year });
    const url = `${ENDPOINT_MOVIE}?${queryString}`;

    logger.info(`Searching for "${query} ${year}..."`);

    return axios.get(url)
      .then(({ data }) => transformMovieData(data, config));
  }

  function getMovieGenres(movie) {
    const queryString = stringify({ api_key: API_KEY, language: LANG });
    const url = `${ENDPOINT_GENRES}?${queryString}`;

    logger.info(`Getting genres of "${movie.title}"...`);

    return axios.get(url)
      .then(({ data }) => transformGenres(data, movie.genres));
  }

  function getActorDetails(actor) {
    const queryString = stringify({ api_key: API_KEY });
    const url = `${ENDPOINT_PERSON(actor.id)}?${queryString}`;

    logger.info(`Getting details of actor "${actor.name}"...`);

    return axios.get(url)
      .then(({ data }) => ({ ...actor, ...transformActorDetails(data) }));
  }

  function getMovieActors(movie, config) {
    const queryString = stringify({ api_key: API_KEY });
    const url = `${ENDPOINT_MOVIE_CREDITS(movie.id)}?${queryString}`;

    logger.info(`Getting actors of "${movie.title}"...`);

    return axios.get(url)
      .then(({ data }) => transformMovieActors(data, config))
      .then(actors => Promise.all(actors.map(getActorDetails)));
  }

  function getConfiguration() {
    const queryString = stringify({ api_key: API_KEY });
    const url = `${ENDPOINT_CONFIGURATION}?${queryString}`;

    logger.info('Getting configuration...');

    return axios.get(url)
      .then(({ data }) => data);
  }

  return async (term, year) => {
    const config = await getConfiguration();

    const movie = await getMovie(term, year, config);
    movie.genres = await getMovieGenres(movie);
    movie.actors = await getMovieActors(movie, config);

    return movie;
  };
};
