function sendError(res, status, error, message, details) {
  const body = { error, message };

  if (details?.length) {
    body.details = details;
  }

  return res.status(status).json(body);
}

function validationDetail(field, code, message) {
  return { field, code, message };
}

function sendValidationError(res, details) {
  return sendError(
    res,
    400,
    "invalid_request",
    "La requête contient des champs invalides. Consultez details pour savoir quoi corriger.",
    details,
  );
}

module.exports = { sendError, sendValidationError, validationDetail };
