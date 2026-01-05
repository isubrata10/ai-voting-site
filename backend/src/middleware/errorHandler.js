// Compatibility shim: re-export from error.handler.js
const { errorHandler, AppError } = require('./error.handler');
module.exports = { errorHandler, AppError };
