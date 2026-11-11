import { HttpInterceptor, HttpInterceptorFn } from "@angular/common/http";



const API_BASE_URL = 'http://localhost:3000'
export const relativeUrlBaseInterceptor: HttpInterceptorFn = (req, next) => {
    if (req.url.startsWith('/')) {
        return next(req.clone({ url: `${API_BASE_URL}${req.url}` }));
    }
    return next(req);
}