# event-manager

**Step 1: **Open terminal or cmd from inside the repo.
**Step 2: **Run `npm install` to install all dependencies tracked inside `package.json` file.
_(Next step is only for running in `localhost`.)_
**Step 2.5: **Create a file named `.env` and place `key=value` pair inside it.
_Example:_
Inside `.env` file...
`SESSION_SECRET=value1`
`CLOUDINARY_CLOUD_NAME=value2`
`CLOUDINARY_KEY=value3`
`CLOUDINARY_SECRET=value4`
_(Use the same keys with real values)_
**Step 3: **Run `mongoDB` daemon to be able to connect to database.
**Step 4: **Run `node app.js`.
**Step 5: **Open browser and query `localhost:3000/<a route present inside the app.js file>`.
