import { Component, OnInit, ViewChild } from '@angular/core';
import { UntypedFormGroup, UntypedFormControl } from '@angular/forms';
import { SimpleModalService } from 'ngx-simple-modal';
import { TranslateService, LangChangeEvent } from '@ngx-translate/core';

import { CardService } from '../../services/card.service';
import { NavService } from '../../services/nav.service';
import { ToolService } from '../../services/tool.service';
import { SessionService } from '../../services/session.service';

import { SharedSearchOptionsModalComponent } from '../../shared/searchOptionsModal/shared.searchOptionsModal.component';

@Component({
  selector: 'app-card-list',
  templateUrl: './card.list.component.html',
  styleUrls: ['./card.list.component.css']
})
export class CardListComponent implements OnInit {
  rawCards = [];
  cards = [];
  searchText = '';
  sort = 'releaseDate';
  order = 'desc';
  filters = {
    rarity: [],
    limited: [],
    element: [],
    cost: [],
    onlyActiveSkill: false,
  };
  version = 'GL';

  isFilterChecked = {
    rarity: [],
    element: [],
    cost: [],
    limited: []
  };
  collapsed = {
    rarity: true,
    element: true,
    limited: true,
    cost: true,
    skill: true
  };

  rarities = [
    'UR',
    'MR',
    'SR',
    'R',
    'N'
  ];

  elements = [
    'fire',
    'ice',
    'wind',
    'earth',
    'lightning',
    'water',
    'light',
    'dark'
  ];

  costs = [];

  filtersCount = 0;

  @ViewChild('SearchBar') ngselect;
  searchForm: UntypedFormGroup;

  constructor(
    private cardService: CardService,
    private translateService: TranslateService,
    private navService: NavService,
    private simpleModalService: SimpleModalService,
    private sessionService: SessionService,
    private toolService: ToolService
  ) {
    this.translateService.onLangChange.subscribe((event: LangChangeEvent) => {
      this.translateCards();
    });

    this.version = this.navService.getVersion();
  }

  async ngOnInit() {
    this.navService.setSEO('Cards', 'Find all cards from wotv in one place. Search them by name, skill and multiples filters.');

    await this.getCards();

    this.searchForm = new UntypedFormGroup({
      searchOptions: new UntypedFormControl()
    });
  }

  async getCards() {
    const options = {};

    if (this.searchForm) {
      for (const option of this.searchForm.get('searchOptions').value) {
        const optionTable = option.label.substring(1).split('=');
        if (!options[optionTable[0]]) {
          options[optionTable[0]] = [];
        }
        options[optionTable[0]].push(optionTable[1]);
      }
    }

    let result = null;

    if (Object.keys(options).length === 0) {
      result = await this.cardService.getCardsForListingWithCosts(this.filters, this.sort, this.order);
    } else {
      result = await this.cardService.getCardsForListingWithCosts(this.filters, this.sort, this.order, options);
    }

    this.cards = result.cards;
    this.rawCards = result.rawCards;

    if (Object.keys(options).length === 0) {
      this.costs = result.costs;

      const cardsFilters = this.sessionService.get('cardsFilters');
      if (cardsFilters) {
        this.filters = JSON.parse(cardsFilters);

        if (!this.filters.cost) {
          this.filters.cost = [];
        }
      }

      const cardsCollapsed = this.sessionService.get('cardsCollapsed');
      if (cardsCollapsed) {
        this.collapsed = JSON.parse(cardsCollapsed);

        if (this.collapsed.cost === undefined) {
          this.collapsed.cost = true;
        }
      }

      this.filterChecked();
    }

    this.filterCards();
  }

  filterCards() {
    this.cards = this.cardService.filterCards(this.rawCards, this.filters, this.sort, this.order);
    this.countFilters();
  }

  countFilters() {
    this.filtersCount = this.filters.cost.length
      + this.filters.element.length
      + this.filters.limited.length
      + this.filters.rarity.length
      + (this.filters.onlyActiveSkill ? 1 : 0);
  }

  private translateCards() {
    this.cards.forEach(card => {
      card.name = this.toolService.getName(card);
    });
  }

  getRoute(route) {
    return this.navService.getRoute(route);
  }

  getFilteredCards() {
    if (this.searchText !== '') {
      const text = this.searchText.toLowerCase();
      return this.cards.filter(card => {
        return card.name.toLowerCase().includes(text) || card.slug.toLowerCase().includes(text);
      });
    } else {
      return this.cards;
    }
  }

  filterList(type, value) {
    if (this.filters[type].indexOf(value) === -1) {
      this.filters[type].push(value);
    } else {
      this.filters[type].splice(this.filters[type].indexOf(value), 1);
    }

    this.sessionService.set('cardsFilters', JSON.stringify(this.filters));

    this.filterCards();
  }

  filterChecked() {
    this.rarities.forEach(rarity => {
      if (this.filters.rarity.indexOf(rarity) === -1) {
        this.isFilterChecked.rarity[rarity] = false;
      } else {
        this.isFilterChecked.rarity[rarity] = true;
      }
    });

    ['true', 'false'].forEach(limited => {
      if (this.filters.limited.indexOf(limited === 'true' ? true : false) === -1) {
        this.isFilterChecked.limited[limited] = false;
      } else {
        this.isFilterChecked.limited[limited] = true;
      }
    });

    this.elements.forEach(element => {
      if (this.filters.element.indexOf(element) === -1) {
        this.isFilterChecked.element[element] = false;
      } else {
        this.isFilterChecked.element[element] = true;
      }
    });

    this.costs.forEach(cost => {
      if (this.filters.cost && this.filters.cost.indexOf(cost) === -1) {
        this.isFilterChecked.cost[cost] = false;
      } else {
        this.isFilterChecked.cost[cost] = true;
      }
    });
  }

  toogleCollapse(section) {
    this.collapsed[section] = !this.collapsed[section];
    this.sessionService.set('cardsCollapsed', JSON.stringify(this.collapsed));
  }

  async toggleOnlyActiveSkill() {
    this.filters.onlyActiveSkill = !this.filters.onlyActiveSkill;

    this.filterCards();
    this.sessionService.set('cardsFilters', JSON.stringify(this.filters));
  }

  onSearchBarClose() {
    this.ngselect.searchTerm = this.searchText;
    this.ngselect.searchInput.nativeElement.value = this.searchText;
    this.getFilteredCards();
  }

  onSearchBarAdd($event) {
    const labelTable = $event.label.split('=');

    if ($event.label[0] !== '!' || labelTable.length !== 2 || labelTable[1] === '') {
      this.searchForm.get('searchOptions').value.pop();
      this.searchForm.get('searchOptions').patchValue(this.searchForm.get('searchOptions').value);

      if ($event.label[0] !== '!') {
        this.searchText = $event.label;
      }
    } else {
      this.getCards();
    }
  }

  onSearchBarUpdateTerm($event) {
    if ($event.term[0] !== '!') {
      this.searchText = $event.term;
      this.getFilteredCards();
    }
  }

  openSearchOptionsModal() {
    this.simpleModalService.addModal(SharedSearchOptionsModalComponent);
  }
}
