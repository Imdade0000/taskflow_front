import { HttpInterceptorFn } from '@angular/common/http';

export const transformInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req);
};
