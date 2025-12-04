npx dotenvx run --env-file=.env.local -- npm run delete:scenarios -- -f
npx dotenvx run --env-file=.env.local -- npm run seed:library -- -f
npx dotenvx run --env-file=.env.local -- npm run seed:content -- -f
npx dotenvx run --env-file=.env.local -- npm run seed:scenarios -- -f
npx dotenvx run --env-file=.env.local -- npm run seed:images -- -f
npx dotenvx run --env-file=.env.local -- npm run seed:static-images -- -f