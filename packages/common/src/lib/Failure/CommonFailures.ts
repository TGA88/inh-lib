import { BaseFailure } from "./BaseFailure";

 class ParseFail extends BaseFailure {
  constructor(message?: string, details?: unknown) {
    super(
      'PARSE_FAIL',
      message || 'Failed to parse request data',
      422,
      details
    );
  }
}

 class ValidationFail extends BaseFailure {
  constructor(message?: string, details?: unknown) {
    super(
      'VALIDATION_FAIL',
      message || 'Validation failed',
      422,
      details
    );
  }
}

 class GetFail extends BaseFailure {
  constructor(message?: string, details?: unknown) {
    super(
      'GET_FAIL',
      message || 'Failed to retrieve data',
      400,
      details
    );
  }
}

 class CreateFail extends BaseFailure {
  constructor(message?: string, details?: unknown) {
    super(
      'CREATE_FAIL',
      message || 'Failed to create resource',
      400,
      details
    );
  }
}

 class UpdateFail extends BaseFailure {
  constructor(message?: string, details?: unknown) {
    super(
      'UPDATE_FAIL',
      message || 'Failed to update resource',
      400,
      details
    );
  }
}

 class DeleteFail extends BaseFailure {
  constructor(message?: string, details?: unknown) {
    super(
      'DELETE_FAIL',
      message || 'Failed to delete resource',
      400,
      details
    );
  }
}

 class NotFoundFail extends BaseFailure {
  constructor(resource?: string, details?: unknown) {
    super(
      'NOT_FOUND',
      resource ? `${resource} not found` : 'Resource not found',
      404,
      details
    );
  }
}

 class UnauthorizedFail extends BaseFailure {
  constructor(message?: string, details?: unknown) {
    super(
      'UNAUTHORIZED',
      message || 'Unauthorized access',
      401,
      details
    );
  }
}

 class ForbiddenFail extends BaseFailure {
  constructor(message?: string, details?: unknown) {
    super(
      'FORBIDDEN',
      message || 'Access forbidden',
      403,
      details
    );
  }
}

 class ConflictFail extends BaseFailure {
  constructor(message?: string, details?: unknown) {
    super(
      'CONFLICT',
      message || 'Resource conflict',
      409,
      details
    );
  }
}

 class InternalFail extends BaseFailure {
  constructor(message?: string, details?: unknown) {
    super(
      'INTERNAL_ERROR',
      message || 'Internal server error',
      500,
      details
    );
  }
}

 class ServiceUnavailableFail extends BaseFailure {
  constructor(message?: string, details?: unknown) {
    super(
      'SERVICE_UNAVAILABLE',
      message || 'Service temporarily unavailable',
      503,
      details
    );
  }
}

 class BadRequestFail extends BaseFailure {
  constructor(message?: string, details?: unknown) {
    super(
      'BAD_REQUEST',
      message || 'Bad request',
      400,
      details
    );
  }
}

// Backward-compatible grouped export (optional usage: CommonFailures.ParseFail)
export const CommonFailures = {
  ParseFail,
  ValidationFail,
  GetFail,
  CreateFail,
  UpdateFail,
  DeleteFail,
  NotFoundFail,
  UnauthorizedFail,
  ForbiddenFail,
  ConflictFail,
  InternalFail,
  ServiceUnavailableFail,
  BadRequestFail
};