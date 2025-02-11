import { Component, OnInit, Input } from '@angular/core';
import { TranslateService, LangChangeEvent } from '@ngx-translate/core';
import { SimpleModalComponent } from 'ngx-simple-modal';

import { GuildService } from '../../../services/guild.service';

@Component({
  selector: 'app-builder-modal-guild',
  templateUrl: './builder.modal.guild.component.html',
  styleUrls: ['./builder.modal.guild.component.css']
})
export class BuilderModalGuildComponent extends SimpleModalComponent<null, any> implements OnInit {
  statues;
  statueNames;
  firstClickOutside = false;

  @Input() public guild;

  constructor(
    private guildService: GuildService
  ) {
    super();
  }

  ngOnInit() {
    this.statues = this.guildService.getStatues();
    this.statueNames = Object.keys(this.statues);
  }

  closeButton() {
    this.result = 'close';
    this.close();
  }

  save() {
    this.result = this.guild;
    this.close();
  }

  closeClickOuside() {
    if (!this.firstClickOutside) {
      this.firstClickOutside = true;
    } else {
      this.result = 'close';
      this.close();
    }
  }
}
