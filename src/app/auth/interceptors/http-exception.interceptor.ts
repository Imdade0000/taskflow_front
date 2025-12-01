import { HttpInterceptorFn } from '@angular/common/http';

export const httpExceptionInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req);
};
