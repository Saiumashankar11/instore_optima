# Global Exception Handling

## Overview
Centralized exception handling for the entire API using middleware. All exceptions are caught and returned as standardized JSON responses with appropriate HTTP status codes.

## Status
✅ **Implemented and Integrated in PaymentController**

## Testing with Swagger

### 1. Run the API
- Press `F5` in Visual Studio to start the API
- Swagger UI opens automatically at `http://localhost:5000/swagger`

### 2. Test Endpoints in Swagger

Available test endpoints:
- **GET** `/api/payment/{id}` - Returns 404 if payment not found
- **GET** `/api/payment/order/{orderId}` - Returns 404 if no payment for order
- **POST** `/api/payment` - Returns 400 for validation errors
- **PUT** `/api/payment/{id}` - Returns 404 if not found
- **DELETE** `/api/payment/{id}` - Returns 404 if not found

### 3. Example: Test 404 Error
1. In Swagger, click **GET** `/api/payment/{id}`
2. Enter an invalid ID (e.g., 99999)
3. Click **Try it out**
4. Response will be:
```json
{
  "success": false,
  "message": "Payment with ID '99999' not found.",
  "errorCode": "RESOURCE_NOT_FOUND",
  "statusCode": 404,
  "timestamp": "2024-01-15T10:30:00Z",
  "traceId": "0HN1GJ8K5L2M",
  "errors": null
}
```

## Available Exception Types

All exceptions return a standardized error response:
```json
{
  "success": false,
  "message": "Error description",
  "errorCode": "ERROR_CODE",
  "statusCode": 400,
  "timestamp": "2024-01-15T10:30:00Z",
  "traceId": "0HN1GJ8K5L2M",
  "errors": null
}
```

### Exception Mapping

| Exception | HTTP Status | Error Code |
|-----------|------------|-----------|
| ResourceNotFoundException | 404 | RESOURCE_NOT_FOUND |
| ValidationException | 400 | VALIDATION_ERROR |
| UnauthorizedException | 401 | UNAUTHORIZED |
| ConflictException | 409 | CONFLICT |
| ApplicationException | 500 | CUSTOM |
| Unhandled Exception | 500 | INTERNAL_SERVER_ERROR |

## Usage in Controllers

Already integrated in **PaymentController**. To add to other controllers:

### Throw Resource Not Found
```csharp
var payment = await _repository.GetByIdAsync(id);
if (payment == null)
    throw new ResourceNotFoundException("Payment", id);
```

### Throw Validation Error
```csharp
if (amount <= 0)
    throw new ValidationException(new Dictionary<string, string[]>
    {
        { "Amount", new[] { "Amount must be greater than 0" } }
    });
```

### Throw Conflict
```csharp
if (existingItem != null)
    throw new ConflictException("Item already exists");
```

## Features

✅ Consistent JSON error responses  
✅ Automatic HTTP status code mapping  
✅ Request tracing with TraceId  
✅ Field-level validation errors  
✅ Centralized logging  
✅ No manual error handling needed in controllers  
✅ Integrated in PaymentController

## Implementation Files

- **Middleware**: `src/instore_optima.Api/Middleware/GlobalExceptionHandlingMiddleware.cs`
- **Exceptions**: `src/instore_optima.Api/Exceptions/` (5 custom exception classes)
- **Error DTO**: `src/instore_optima.Api/DTOs/ErrorResponseDto.cs`
- **Updated Controller**: `src/instore_optima.Api/Controllers/PaymentController.cs`
- **Registration**: `src/instore_optima.Api/Program.cs`
