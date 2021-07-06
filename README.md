# event-manager

1. Open terminal or cmd from inside the repo.
2. Run `npm install` to install all dependencies tracked inside `package.json` file.
   _(Next step is only for running in `localhost`.)_
3. Create a file named `.env` and place `key=value` pair inside it.
   _Example:_
   Inside `.env` file...

```
DB_PATH=mongodb://localhost:27017/<database_name>
SESSION_SECRET=value1
CLOUDINARY_CLOUD_NAME=value2
CLOUDINARY_KEY=value3
CLOUDINARY_SECRET=value4
MAPBOX_KEY=value5
```

_(Use the same keys with real values.)_ 4. Run `mongoDB` daemon to be able to connect to database. 5. Run `node app.js`. 6. Open browser and query `localhost:3000/<a route present inside the app.js file>`.
