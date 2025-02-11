import { Component, OnInit } from '@angular/core';
import { TranslateService, LangChangeEvent } from '@ngx-translate/core';
import { Router } from '@angular/router';

import { QuestService } from '../../services/quest.service';
import { NavService } from '../../services/nav.service';
import { ToolService } from '../../services/tool.service';
import { AuthService } from '../../services/auth.service';
import { SessionService } from '../../services/session.service';

@Component({
  selector: 'app-quest-list',
  templateUrl: './quest.list.component.html',
  styleUrls: ['./quest.list.component.css']
})
export class QuestListComponent implements OnInit {
  rawQuests = [];
  quests = [];
  searchText = '';
  sort = 'lastRelease';
  order = 'desc';
  filters = {
    type: []
  };
  isFilterChecked = {
    type: []
  };
  isCollapsedType = false;
  questTypes = [
    'story',
    'event',
    'hard_quest_unit',
    'multi',
    'character_quest',
    'esper_quest',
    'arena',
    'raid',
    'rank_pvp',
    'free_pvp',
    'friend_pvp',
    'gvg',
    'tuto',
    'beginner',
    'guild_quest',
    'selection',
    'draft_pvp',
    'hard_quest_vc',
    'tower',
    'guild_raid'
  ];

  constructor(
    private questService: QuestService,
    private translateService: TranslateService,
    private navService: NavService,
    private authService: AuthService,
    private router: Router,
    private sessionService: SessionService,
    private toolService: ToolService
  ) {
    this.translateService.onLangChange.subscribe((event: LangChangeEvent) => {
      this.translateQuests();
    });
  }

  ngOnInit() {
    this.navService.setSEO('Quests', 'Find all quests from wotv in one place. Can you beat them all ?');

    const questsFilters = this.sessionService.get('questsFilters');
    if (questsFilters) {
      this.filters = JSON.parse(questsFilters);
    }
    this.filterChecked();

    this.getQuests();
  }

  async getQuests() {
    const result = await this.questService.getQuestsForListing(this.filters, this.sort, this.order);

    this.quests = result.quests;
    this.rawQuests = result.rawQuests;

    this.translateQuests();
  }

  filterQuests() {
    this.quests = this.questService.filterQuests(this.rawQuests, this.filters, this.sort, this.order);
  }

  private translateQuests() {
    this.quests.forEach(quest => {
      quest.name = this.toolService.getName(quest);
    });
  }

  getRoute(route) {
    return this.navService.getRoute(route);
  }

  getFilteredQuests() {
    if (this.searchText !== '') {
      const text = this.searchText.toLowerCase();
      return this.quests.filter(quest => {
        return quest.name.toLowerCase().includes(text) || quest.slug.toLowerCase().includes(text);
      });
    } else {
      return this.quests;
    }
  }

  filterList(type, value) {
    if (this.filters[type].indexOf(value) === -1) {
      this.filters[type].push(value);
    } else {
      this.filters[type].splice(this.filters[type].indexOf(value), 1);
    }

    this.sessionService.set('questsFilters', JSON.stringify(this.filters));
    this.filterChecked();

    this.filterQuests();
  }

  filterChecked() {
    this.questTypes.forEach(type => {
      if (this.filters.type.indexOf(type) === -1) {
        this.isFilterChecked.type[type] = false;
      } else {
        this.isFilterChecked.type[type] = true;
      }
    });
  }

  formatType(type) {
    return this.questService.formatType(type);
  }
}
