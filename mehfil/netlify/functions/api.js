const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');
const apiRouter = require('../../server/routes/api');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Support both /api/* and root mount from Netlify redirects
app.use('/api', apiRouter);
app.use('/', apiRouter);

module.exports.handler = serverless(app);
