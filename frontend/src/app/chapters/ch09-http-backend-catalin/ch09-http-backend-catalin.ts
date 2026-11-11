import { Component, computed, inject, signal } from "@angular/core";
import { Transaction, TransactionsService } from "./transactions.service";


@Component({
    selector: 'app-ch09-http-backend-catalin',
    imports: [],
    templateUrl: './ch09-http-backend-catalin.html',
    styleUrl: 'ch09-http-backend-catalin.css'
})


export class Ch09HttpBackendCatalin {

    readonly transactions = signal<Transaction[]>([])
    readonly api = inject(TransactionsService)
    readonly errors = signal<string>('');


    constructor() {
        this.loadTransactions();
    }

    loadTransactions() {
        this.api.list().subscribe({
            next: (res) => {
                let items: Transaction[] = res.items;
                this.transactions.set(items)
            },
            error: (err) => {
                let message = err.message;
                this.errors.set(message);
            }
        })
    }

    transactionsAsString = computed(() => {
        return JSON.stringify(this.transactions())
    })


}