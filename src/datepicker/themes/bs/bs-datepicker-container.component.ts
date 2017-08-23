import { Component, EventEmitter, Input, Output } from '@angular/core';

import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/debounceTime';
import 'rxjs/add/operator/distinctUntilChanged';
import 'rxjs/add/observable/combineLatest';

import { Observable } from 'rxjs/Observable';
import { getFullYear, getMonth } from '../../../bs-moment/utils/date-getters';
import {
  BsDatepickerViewMode,
  BsNavigationEvent,
  DatepickerRenderOptions,
  DayHoverEvent,
  DaysCalendarViewModel,
  DayViewModel,
  MonthHoverEvent,
  MonthsCalendarViewModel,
  MonthViewModel,
  YearHoverEvent,
  YearsCalendarViewModel,
  YearViewModel
} from '../../models/index';
import { BsDatepickerActions } from '../../reducer/bs-datepicker.actions';
import { BsDatepickerStore } from '../../reducer/bs-datepicker.store';
import { BsCustomDates } from './bs-custom-dates-view.component';

@Component({
  selector: 'bs-datepicker-container',
  providers: [BsDatepickerStore],
  template: `
    <!-- days calendar view mode -->
    <div class="bs-datepicker theme-green" *ngIf="viewMode">
      <div class="bs-datepicker-container">

        <!--calendars-->
        <div class="bs-calendar-container" [ngSwitch]="viewMode">
          <!--days calendar-->
          <div *ngSwitchCase="'day'">
            <bs-days-calendar-view
              *ngFor="let calendar of (daysCalendar | async)"
              [class.bs-datepicker-multiple]="(daysCalendar | async).length > 1"
              [calendar]="calendar"
              [options]="options | async"
              (onNavigate)="navigateTo($event)"
              (onViewMode)="changeViewMode($event)"
              (onHover)="dayHoverHandler($event)"
              (onSelect)="daySelectHandler($event)"
            ></bs-days-calendar-view>
          </div>

          <!--months calendar-->
          <div *ngSwitchCase="'month'">
            <bs-month-calendar-view
              *ngFor="let calendar of (monthsCalendar | async)"
              [calendar]="calendar"
              (onNavigate)="navigateTo($event)"
              (onViewMode)="changeViewMode($event)"
              (onHover)="monthHoverHandler($event)"
              (onSelect)="monthSelectHandler($event)"
            ></bs-month-calendar-view>
          </div>

          <!--years calendar-->
          <div *ngSwitchCase="'year'">
            <bs-years-calendar-view
              *ngFor="let calendar of (yearsCalendar | async)"
              [calendar]="calendar"
              (onNavigate)="navigateTo($event)"
              (onViewMode)="changeViewMode($event)"
              (onHover)="yearHoverHandler($event)"
              (onSelect)="yearSelectHandler($event)"
            ></bs-years-calendar-view>
          </div>

        </div>

        <!--apply\cancel buttons-->
        <div class="bs-datepicker-buttons">
          <button class="btn btn-success">Apply</button>
          <button class="btn btn-default">Cancel</button>
        </div>

      </div>

      <!--custom dates or date ranges picker-->
      <div class="bs-datepicker-custom-range">
        <bs-custom-date-view [ranges]="_customRangesFish"></bs-custom-date-view>
      </div>
    </div>`,
  host: {
    '(click)': '_stopPropagation($event)',
    style: 'position: absolute; display: block;'
  }
})
export class BsDatepickerContainerComponent {
  @Input()
  set value(value: Date) {
    this._bsDatepickerStore.dispatch(this._actions.select(value));
  }

  @Output() valueChange = new EventEmitter<Date>();

  viewMode: BsDatepickerViewMode;
  daysCalendar: Observable<DaysCalendarViewModel[]>;
  monthsCalendar: Observable<MonthsCalendarViewModel[]>;
  yearsCalendar: Observable<YearsCalendarViewModel[]>;
  options: Observable<DatepickerRenderOptions>;

  /** @deperecated */
  _customRangesFish: BsCustomDates[] = [
    {label: 'today', value: new Date()},
    {label: 'today1', value: new Date()},
    {label: 'today2', value: new Date()},
    {label: 'today3', value: new Date()}
  ];

  constructor(private _bsDatepickerStore: BsDatepickerStore,
              private _actions: BsDatepickerActions) {
    // data binding state <--> model
    // days calendar
    this.daysCalendar = this._bsDatepickerStore.select(state => state.flaggedMonths)
      .filter(months => !!months);

    // month calendar
    this.monthsCalendar = this._bsDatepickerStore.select(state => state.flaggedMonthsCalendar)
      .filter(months => !!months);

    // year calendar
    this.yearsCalendar = this._bsDatepickerStore.select(state => state.yearsCalendarFlagged)
      .filter(years => !!years);

    this.options = this._bsDatepickerStore.select(state => state.renderOptions)
      .filter(options => !!options);

    // this.viewMode = this._bsDatepickerStore.select(state => state.viewMode);

    // set render options
    this._bsDatepickerStore.dispatch(this._actions.renderOptions({
      displayMonths: 1,
      showWeekNumbers: true
    }));

    // on selected date change
    this._bsDatepickerStore.select(state => state.selectedDate)
      .subscribe(date => this.valueChange.emit(date));

    // TODO: extract effects
    Observable.combineLatest(
      this._bsDatepickerStore.select(state => state.viewMode),
      this._bsDatepickerStore.select(state => state.viewDate)
    )
      .map(latest => ({viewMode: latest[0], viewDate: +latest[1]}))
      .distinctUntilChanged()
      // .debounce(1)
      .subscribe((latest: any) => {
        this._bsDatepickerStore.dispatch(this._actions.calculate());
        this.viewMode = latest.viewMode;
      });
    // recalculate on view mode change
    this._bsDatepickerStore.select(state => state.viewMode);
    // .subscribe(() => this._bsDatepickerStore.dispatch(this._actions.calculate()));

    // calculate month model on view model change
    this._bsDatepickerStore
      .select(state => state.viewDate);
    // .subscribe(() => this._bsDatepickerStore.dispatch(this._actions.calculate()));

    // format calendar values on month model change
    this._bsDatepickerStore
      .select(state => state.monthsModel)
      .filter(monthModel => !!monthModel)
      .subscribe(month =>
        this._bsDatepickerStore.dispatch(this._actions.format()));

    // flag day values
    this._bsDatepickerStore
      .select(state => state.formattedMonths)
      .filter(month => !!month)
      .subscribe(month =>
        this._bsDatepickerStore.dispatch(this._actions.flag()));

    // flag day values
    this._bsDatepickerStore.select(state => state.selectedDate)
      .filter(selectedDate => !!selectedDate)
      .subscribe(selectedDate =>
        this._bsDatepickerStore.dispatch(this._actions.flag()));

    // monthsCalendar
    this._bsDatepickerStore
      .select(state => state.monthsCalendar)
      .filter(state => !!state)
      .subscribe(() => this._bsDatepickerStore.dispatch(this._actions.flag()));

    // years calendar
    this._bsDatepickerStore
      .select(state => state.yearsCalendarModel)
      .filter(state => !!state)
      .subscribe(() => this._bsDatepickerStore.dispatch(this._actions.flag()));

    // on hover
    this._bsDatepickerStore.select(state => state.hoveredDate)
      .filter(hoveredDate => !!hoveredDate)
      .subscribe(hoveredDate =>
        this._bsDatepickerStore.dispatch(this._actions.flag()));
  }

  changeViewMode(event: BsDatepickerViewMode): void {
    this._bsDatepickerStore.dispatch(this._actions.changeViewMode(event));
  }

  navigateTo(event: BsNavigationEvent): void {
    this._bsDatepickerStore.dispatch(this._actions.navigateStep(event.step));
  }

  dayHoverHandler(event: DayHoverEvent): void {
    if (event.day.isOtherMonth) {
      return;
    }
    this._bsDatepickerStore.dispatch(this._actions.hoverDay(event));
    event.day.isHovered = event.isHovered;
  }

  monthHoverHandler(event: MonthHoverEvent): void {
    event.month.isHovered = event.isHovered;
  }

  daySelectHandler(day: DayViewModel): void {
    if (day.isOtherMonth) {
      return;
    }
    this._bsDatepickerStore.dispatch(this._actions.select(day.date));
  }

  monthSelectHandler(event: MonthViewModel): void {
    this._bsDatepickerStore.dispatch(this._actions.navigateTo({
      unit: {month: getMonth(event.date)},
      viewMode: 'day'
    }));
  }

  yearSelectHandler(event: YearViewModel): void {
    this._bsDatepickerStore.dispatch(this._actions.navigateTo({
      unit: {year: getFullYear(event.date)},
      viewMode: 'month'
    }));
  }

  yearHoverHandler(event: YearHoverEvent): void {
    event.year.isHovered = event.isHovered;
  }

  _stopPropagation(event: any): void {
    event.stopPropagation();
  }
}
