import { HttpInterceptorFn } from '@angular/common/http';

export const rateLimitInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req);
};
