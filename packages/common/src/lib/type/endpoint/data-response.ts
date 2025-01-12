
export type DataResponse<T>={
    statusCode:number,
    isSuccess:boolean,
    traceId?:string,
    codeResult:'SUCCESS' | string,
    message:string,
    dataResult:T,
}
// // Example Create Response with dataResonse type at Endpoint Layer to convert as Fastify HttpReponse 
// // Data models
// interface User {
//     id: number;
//     name: string;
//     email: string;
//   }
  
//   interface ValidationError {
//     field: string;
//     message: string;
//   }
  
//   interface PaginatedData<T> {
//     items: T[];
//     pagination: {
//       page: number;
//       perPage: number;
//       total: number;
//       totalPages: number;
//     }
//   }
  
//   // Success Case Examples
//   const getUserResponse: DataResponse<User> = {
//     statusCode: 200,
//     isSuccess: true,
//     codeResult: 'SUCCESS',
//     message: 'User retrieved successfully',
//     dataResult: {
//       id: 123,
//       name: 'John Doe',
//       email: 'john@example.com'
//     }
//   };
  
//   const getProductsResponse: DataResponse<PaginatedData<Product>> = {
//     statusCode: 200,
//     isSuccess: true,
//     codeResult: 'SUCCESS',
//     message: 'Products retrieved successfully',
//     dataResult: {
//       items: [
//         { id: 1, name: 'Product A', price: 100 },
//         { id: 2, name: 'Product B', price: 200 }
//       ],
//       pagination: {
//         page: 1,
//         perPage: 10,
//         total: 45,
//         totalPages: 5
//       }
//     }
//   };
  
//   // Error Case Examples
//   const validationErrorResponse: DataResponse<ValidationError[]> = {
//     statusCode: 400,
//     isSuccess: false,
//     codeResult: 'VALIDATION_ERROR',
//     message: 'Invalid input data',
//     dataResult: [
//       {
//         field: 'email',
//         message: 'Invalid email format'
//       },
//       {
//         field: 'age',
//         message: 'Age must be greater than 18'
//       }
//     ]
//   };
  
//   const notFoundResponse: DataResponse<{resourceId: string, resourceType: string}> = {
//     statusCode: 404,
//     isSuccess: false,
//     codeResult: 'RESOURCE_NOT_FOUND',
//     message: 'Product not found',
//     dataResult: {
//       resourceId: 'PRD-123',
//       resourceType: 'product'
//     }
//   };
  
//   const serverErrorResponse: DataResponse<{traceId: string}> = {
//     statusCode: 500,
//     isSuccess: false,
//     codeResult: 'INTERNAL_SERVER_ERROR',
//     message: 'An unexpected error occurred',
//     dataResult: {
//       traceId: 'ERR-123-456'
//     }
//   };