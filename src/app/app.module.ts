import { BrowserModule } from '@angular/platform-browser';
import { NgModule, ErrorHandler } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { LocalStorageModule } from 'angular-2-local-storage';
import { Angulartics2Module } from 'angulartics2';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { LocalStorageService } from 'angular-2-local-storage';
import { ClipboardModule } from 'ngx-clipboard';
import { UiSwitchModule } from 'ngx-ui-switch';
import { environment } from '../environments/environment';
import { AngularFireModule } from '@angular/fire/compat';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgClickOutsideDirective } from 'ng-click-outside2';
import { SimpleModalModule, defaultSimpleModalOptions } from 'ngx-simple-modal';
import { NgxPopperjsModule } from 'ngx-popperjs';
import { BarRatingModule } from 'ngx-bar-rating';

import { AppRoutingModule } from './app-routing.module';

import { AppComponent } from './app.component';

import { NavComponent } from './nav/nav.component';
import { FooterComponent } from './footer/footer.component';
import { HomeComponent } from './home/home.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { LoginComponent } from './auth/login.component';

import { UnitService } from './services/unit.service';
import { NavService } from './services/nav.service';
import { SkillService } from './services/skill.service';
import { EquipmentService } from './services/equipment.service';
import { CardService } from './services/card.service';
import { EsperService } from './services/esper.service';
import { JobService } from './services/job.service';
import { GridService } from './services/grid.service';
import { GuildService } from './services/guild.service';
import { ThemeService } from './services/theme.service';
import { RaidService } from './services/raid.service';
import { TeamService } from './services/team.service';
import { ItemService } from './services/item.service';
import { AuthService } from './services/auth.service';
import { ToolService } from './services/tool.service';
import { MasterRanksService } from './services/mr.service';
import { TitleService } from './services/title.service';
import { RangeService } from './services/range.service';
import { IndexService } from './services/index.service';
import { QuestService } from './services/quest.service';
import { SimulatorService } from './services/simulator.service';
import { OtherUnitService } from './services/otherunit.service';
import { ApiService } from './services/api.service';
import { HomeService } from './services/home.service';
import { UserService } from './services/user.service';
import { MateriaService } from './services/materia.service';
import { InventoryService } from './services/inventory.service';
import { SessionService } from './services/session.service';

import { SharedModule } from './shared/shared.module';
import { ServiceWorkerModule } from '@angular/service-worker';

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
export function createTranslateLoader(http: HttpClient) {
  return new TranslateHttpLoader(http, 'assets/i18n/', '.json');
}

@NgModule({
  declarations: [
    AppComponent,
    NavComponent,
    FooterComponent,
    HomeComponent,
    PageNotFoundComponent,
    LoginComponent
  ],
  imports: [
    BrowserModule.withServerTransition({appId: 'app-root'}),
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    AppRoutingModule,
    LocalStorageModule.forRoot({
      prefix: 'wotv-calc',
      storageType: 'localStorage'
    }),
    Angulartics2Module.forRoot(),
    HttpClientModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: (createTranslateLoader),
        deps: [HttpClient]
      }
    }),
    NgSelectModule,
    ClipboardModule,
    UiSwitchModule,
    AngularFireModule.initializeApp(environment.firebaseConfig),
    AngularFireAuthModule,
    NgClickOutsideDirective,
    SimpleModalModule.forRoot({container: 'modal-container'}, {...defaultSimpleModalOptions, ...{
      closeOnEscape: true,
      animationDuration: 1,
      autoFocus: false
    }}),
    NgxPopperjsModule,
    BarRatingModule,
    SharedModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: environment.production,
      registrationStrategy: 'registerWhenStable:30000'
    })
  ],
  providers: [
    UnitService,
    NavService,
    EquipmentService,
    SkillService,
    CardService,
    EsperService,
    JobService,
    GridService,
    GuildService,
    ThemeService,
    RaidService,
    TeamService,
    ItemService,
    AuthService,
    ToolService,
    MasterRanksService,
    TitleService,
    RangeService,
    IndexService,
    QuestService,
    SimulatorService,
    OtherUnitService,
    ApiService,
    HomeService,
    UserService,
    MateriaService,
    InventoryService,
    SessionService
  ],
  bootstrap: [
    AppComponent
  ]
})

export class AppModule { }
