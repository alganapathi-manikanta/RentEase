export const notFound = (req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
};

export const errorHandler = (error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error.name === 'ValidationError' ? 400 : error.statusCode || 500;
  const message = status === 500 ? 'Something went wrong. Please try again.' : (error.message || 'Something went wrong. Please try again.');
  if (status === 500) console.error('[SERVER ERROR]', error);
  res.status(status).json({ success: false, message });
};
