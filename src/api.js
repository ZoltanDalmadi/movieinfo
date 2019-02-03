const fastify = require('fastify');

const listResource = resolver => (request, reply) => {
  reply.send(resolver());
};

const singleResource = resolver => (request, reply) => {
  const result = resolver(request.params.id);
  reply.status(result ? 200 : 404).send(result);
};

module.exports = (db, logger) => {
  const movie = singleResource(db.getMovie);
  const movies = listResource(db.getMovies);
  const actor = singleResource(db.getActor);
  const actors = listResource(db.getActors);

  const app = fastify({ logger });

  app.get('/movies/:id', movie);
  app.get('/movies', movies);
  app.get('/actors/:id', actor);
  app.get('/actors', actors);

  return {
    listen: port => app.listen(port || 3000)
  };
};
