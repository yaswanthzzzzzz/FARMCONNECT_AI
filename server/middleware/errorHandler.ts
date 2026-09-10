import type { ErrorRequestHandler, RequestHandler } from "express";
import type { ApiErrorShape } from "@shared/types";

export const notFoundHandler: RequestHandler = (_req, res) => {
  const payload: ApiErrorShape = {
    code: "NOT_FOUND",
    message: "The requested resource could not be found.",
  };
  res.status(404).json(payload);
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const requestId = `req_${Date.now().toString(36)}`;
  console.error(`[API ${requestId}]`, error);
  const payload: ApiErrorShape = {
    code: "INTERNAL_ERROR",
    message: "Something went wrong. Please try again.",
    requestId,
  };
  res.status(500).json(payload);
};
