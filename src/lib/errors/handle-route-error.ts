import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "./app-error";
import { logger } from "./logger";

export function handleRouteError(error: unknown) {
  if (error instanceof SyntaxError) {
    logger.warn("Request JSON parsing failed.", { message: error.message });

    return NextResponse.json(
      {
        ok: false,
        error: "Bad Request",
        message: "Request body must be valid JSON."
      },
      { status: 400 }
    );
  }

  if (error instanceof ZodError) {
    logger.warn("Request validation failed.", { issues: error.issues });

    return NextResponse.json(
      {
        ok: false,
        error: "Bad Request",
        message: "Payload validation failed.",
        issues: error.issues
      },
      { status: 400 }
    );
  }

  if (error instanceof AppError) {
    logger.warn(error.message, { details: error.details, statusCode: error.statusCode });

    return NextResponse.json(
      {
        ok: false,
        error: error.statusCode >= 500 ? "Internal Server Error" : "Bad Request",
        message: error.message,
        details: error.details
      },
      { status: error.statusCode }
    );
  }

  logger.error("Unexpected route error.", {
    error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error
  });

  return NextResponse.json(
    {
      ok: false,
      error: "Internal Server Error",
      message: "Unexpected error while processing request."
    },
    { status: 500 }
  );
}
