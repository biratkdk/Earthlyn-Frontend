interface ApiErrorResponse {
  response?: {
    data?: {
      message?: string | string[];
    };
    status?: number;
  };
  message?: string;
}

export function getErrorMessage(
  error: unknown,
  fallback = "Something went wrong",
) {
  if (typeof error === "object" && error !== null) {
    const apiError = error as ApiErrorResponse;
    const message = apiError.response?.data?.message;

    if (Array.isArray(message)) {
      return message.join(", ");
    }

    if (message) {
      return message;
    }

    if (apiError.message) {
      return apiError.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export function getApiErrorStatus(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  return (error as ApiErrorResponse).response?.status;
}
