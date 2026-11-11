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

    list() {
        return this.http.get<ApiResponse<Transaction>>('/api/transactions')
    }
}