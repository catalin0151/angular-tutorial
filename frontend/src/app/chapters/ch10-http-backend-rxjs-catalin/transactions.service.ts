import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";


export interface Transaction {
    currency: string;
    status: 'pending' | 'cleared' | 'failed'
}

export interface ApiResponse<T> {
    items: T[];
    total: number;
    page: number;
    size: number;
}
@Injectable({ providedIn: 'root' })
export class TransactionsService {
    readonly http = inject(HttpClient);

    list({ page, search }: { page?: string | number | null, search?: string | null } = {}) {
        let url = new URL('http://localhost:3000/api/transactions');
        let searchParams = url.searchParams
        if (page) {
            searchParams.set('page', String(page))
        }
        if (search) {
            searchParams.set('search', search)
        }
        return this.http.get<ApiResponse<Transaction>>(url.toString())
    }
}