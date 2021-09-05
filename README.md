# event-manager

1. Open terminal or cmd from inside the repo.
2. Run `npm install` to install all dependencies tracked inside `package.json` file.
   _(Next step is only for running in `localhost`.)_
3. Create a file named `.env` and place `key=value` pair inside it.
   _Example:_
   Inside `.env` file...

```
DB_PATH=value0 | mongodb://localhost:27017/<database_name>
SESSION_SECRET=value1
SERVER_DOMAIN=value2 | http://localhost:3001
MAPBOX_KEY=value3
```

_(Use the same keys with real values.)_

4. Run `mongoDB` daemon to be able to connect to database. 5. Run `npm run` or `npm start`.
