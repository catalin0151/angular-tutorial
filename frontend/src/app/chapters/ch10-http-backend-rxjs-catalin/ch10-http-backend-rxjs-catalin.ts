import { Component, computed, effect, inject, signal } from "@angular/core";
import { Transaction, TransactionsService } from "./transactions.service";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { toObservable, toSignal } from "@angular/core/rxjs-interop";
import { catchError, combineLatest, debounceTime, distinctUntilChanged, of, startWith, switchMap } from "rxjs";


@Component({
    selector: 'app-ch10-http-backend-rxjs-catalin',
    imports: [ReactiveFormsModule],
    templateUrl: './ch10-http-backend-rxjs-catalin.html',
    styleUrl: 'ch10-http-backend-rxjs-catalin.css'
})

/**
  source$.pipe(
  map(x => x * 2),              // transform each value
  filter(x => x > 10),          // skip some values
  debounceTime(300),            // emit only after 300ms of silence
  distinctUntilChanged(),       // skip consecutive repeats
  tap(x => console.log(x)),     // side effect, doesn't change the value
  startWith(''),                // emit a value immediately before the source starts
  take(5),                      // take the first 5 values, then complete
  switchMap(x => http.get(x)),  // flatten + CANCEL previous inner observable
  catchError(err => of(null)),  // recover from errors
  of(42)                        // equivalent to: an Observable that does { emit 42; complete; }
  combineLatest                 // combines observables into one array to listen to multiple changes
);
 */

export class Ch10HttpBackendRxjsCatalin {

    readonly transactions = signal<Transaction[]>([])
    readonly api = inject(TransactionsService)
    readonly errors = signal<string>('');

    readonly form = new FormGroup({
        search: new FormControl('')
    });

    readonly pageNumber = signal<number>(1);
    readonly search = toSignal(this.form.controls.search.valueChanges, { initialValue: this.form.controls.search.value })


    // One pipeline: combineLatest of two Observable-ified signals.
    readonly responseSignal = toSignal(
        combineLatest([
            toObservable(this.search).pipe(debounceTime(300), distinctUntilChanged()),
            toObservable(this.pageNumber),
        ]).pipe(
            switchMap(([search, page]) =>
                this.api.list({ search, page }).pipe(
                    catchError(err => {
                        console.warn('load failed', err);
                        return of({ items: [] as Transaction[], total: 0, page, size: 10 });
                    })
                )
            )
        ),
        { initialValue: null }
    );

    readonly response = toSignal(
        combineLatest([
            this.form.controls.search.valueChanges.pipe(
                startWith(''),                     // emit '' immediately, otherwise combineLatest waits forever
                debounceTime(300),
                distinctUntilChanged(),
            ),
            toObservable(this.pageNumber),
        ]).pipe(
            switchMap(([search, page]) =>
                this.api.list({ search, page }).pipe(
                    catchError(err => {
                        console.warn('load failed', err);
                        return of({ items: [] as Transaction[], total: 0, page, size: 10 });
                    })
                )
            )
        ),
        { initialValue: null }
    );

    readonly transactionsFromResponse = () => this.response()?.items ?? [];
    constructor() {

        // effect(() => {
        //     this.loadTransactions();
        // })
    }

    loadTransactions() {
        //this.api.list({ page: this.pageNumber(), search: this.form.controls.search.getRawValue() }).subscribe({

        this.api.list({ page: this.pageNumber(), search: this.search() }).subscribe({
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
        return JSON.stringify(this.transactionsFromResponse())
    })

    onNext() {
        this.pageNumber.update((prevValue) => prevValue + 1)
    }
    onPrevious() {
        this.pageNumber.update((prevValue) => {
            if (prevValue === 1) {
                return prevValue
            }
            return prevValue - 1;
        })
    }

}