import { Injectable } from '@angular/core';
import { LocalStorageService } from 'angular-2-local-storage';

import { Materia } from '../entities/materia';

import { SkillService } from './skill.service';
import { ApiService } from './api.service';
import { NavService } from './nav.service';
import { AuthService } from './auth.service';
import { ToolService } from './tool.service';

@Injectable()
export class MateriaService {
  private sre = /^\s+|\s+$/g;
  materia;

  private skillLvTbl = [0, 50, 200, 500, 950, 1550, 2350, 3350, 4550, 5950, 7650, 9650, 11950, 14550, 17450, 20750, 24450, 28550, 33050, 38050];

  private translationSkillFromId = {
    HP: 'HP',
    TP: 'TP',
    DF: 'DEF',
    MDF: 'SPR',
    LCK: 'LUCK',
    AVO: 'EVADE',
    CAV: 'CRITIC_EVADE',
    AP: 'AP',
    ATK: 'ATK',
    MGK: 'MAG',
    DEX: 'DEX',
    HIT: 'ACCURACY',
    CRT: 'CRITIC_RATE',
    SPD: 'AGI'
  };

  constructor(
    private skillService: SkillService,
    private localStorageService: LocalStorageService,
    private navService: NavService,
    private authService: AuthService,
    private apiService: ApiService,
    private toolService: ToolService
  ) {}

  private async getApi(param = null, extraQuery = []) {
    return JSON.parse(JSON.stringify(await this.apiService.get('materia', param, extraQuery)));
  }

  private async getApiUser(type, extra = null) {
    switch (type) {
      case 'get':
        extra.push({name: 'type', value: 'materia'});
        return JSON.parse(JSON.stringify(await this.apiService.get('userData', null, extra)));
      break;
      case 'post':
        return JSON.parse(JSON.stringify(await this.apiService.post('userData', {type: 'materia', data: extra})));
      break;
      case 'delete':
        return JSON.parse(JSON.stringify(await this.apiService.delete('userData', {type: 'materia', storeId: extra})));
      break;
      default:
      break;
    }

    return null;
  }

  async getMateriaForListing(filters = null, sort = 'name', order = 'asc') {
    const materias: Materia[] = [];
    const result = await this.getApi();

    result.materia.forEach(rawMateria => {
      const materia = new Materia();
      materia.constructFromJson(rawMateria);
      materias.push(materia);
    });

    return {
      materia: materias,
      materiaGroup: result.materiaGroup,
      skills: result.skills
    };
  }

  async getMateriaGroups() {
    return await this.getApi(null, [{name: 'onlyGroups', value: 1}]);
  }

  private getLocalStorage() {
    return this.navService.getVersion() === 'JP' ? 'jp_materia' : 'materia';
  }

  getSavedMaterias() {
    return this.localStorageService.get(this.getLocalStorage()) ? this.localStorageService.get(this.getLocalStorage()) : {};
  }

  getSavableData(materia, onlyMateria = true) {
    const data = {
      dataId: materia.dataId,
      level: materia.level,
      rarity: materia.rarity,
      mainStat: materia.mainStat,
      subStats: [],
      skills: materia.skills,
      slot: materia.slot,
      skillsLevel: [],
      storeId: materia.storeId
    };

    materia.subStats.forEach(subStat => {
      data.subStats.push({
        type: subStat.type,
        value: subStat.value
      });
    });

    materia.skillsDetail.forEach(skillDetail => {
      data.skillsLevel.push(skillDetail.level);
    });

    if (!data.storeId) {
      delete data.storeId;
    }

    if (onlyMateria) {
      const user = this.authService.getUser();
      // @ts-ignore
      data.user = user ? user.uid : null;
      // @ts-ignore
      data.customName = Date.now();
    } else {
      delete data.storeId;
    }

    return data;
  }

  materiaAlreadyExists(materia) {
    const savedMaterias = this.getSavedMaterias();
    let materiaFinded = false;

    if (materia.storeId) {
      materiaFinded = true;
    }

    return materiaFinded;
  }

  async saveMateria(materia, method) {
    const savableData = this.getSavableData(materia);

    if (method === 'new' || method === 'share') {
      if (method === 'share') {
        // @ts-ignore
        delete savableData.user;
      }

      const data = await this.getApiUser('post', savableData);

      if (method === 'new') {
        // @ts-ignore
        savableData.storeId = data.storeId;
        const savedMaterias = this.getSavedMaterias();

        if (savedMaterias[materia.dataId]) {
          savedMaterias[materia.dataId].push(savableData);
        } else {
          savedMaterias[materia.dataId] = [savableData];
        }

        this.localStorageService.set(this.getLocalStorage(), savedMaterias);
      }
      materia.storeId = data.storeId;

      return data.storeId;
    } else {
      const data = await this.getApiUser('post', savableData);
      const savedMaterias = this.getSavedMaterias();

      if (materia.initialDataId !== materia.dataId) {
        savedMaterias[materia.initialDataId].splice(savedMaterias[materia.initialDataId].findIndex(searchedMateria => searchedMateria.storeId === materia.storeId), 1);

        if (!savedMaterias[materia.dataId]) {
          savedMaterias[materia.dataId] = [];
        }
        savedMaterias[materia.dataId].push(savableData);
      } else {
        savedMaterias[materia.dataId].forEach((savedMateria, materiaIndex) => {
          if (savedMateria.storeId === materia.storeId) {
            savedMaterias[materia.dataId][materiaIndex] = savableData;
            savedMaterias[materia.dataId][materiaIndex].storeId = materia.storeId;
          }
        });
      }

      this.localStorageService.set(this.getLocalStorage(), savedMaterias);

      return materia.storeId;
    }
  }

  async getExportableLink(materia) {
    if (!materia.storeId || this.hasChangeBeenMade(materia)) {
      return await this.saveMateria(materia, 'share');
    }

    return materia.storeId;
  }

  hasChangeBeenMade(materia) {
    if (materia.storeId) {
      const newData = this.getSavableData(materia);
      let oldData = null;

      if (this.getSavedMaterias()[materia.dataId]) {
        this.getSavedMaterias()[materia.dataId].forEach(savedMateria => {
          if (savedMateria.storeId === materia.storeId) {
            oldData = savedMateria;
            delete oldData.customName;
          }
        });

        // @ts-ignore
        delete newData.customName;

        return !this.toolService.equal(oldData, newData);
      }
    }

    return true;
  }

  async getStoredMateria(storeId) {
    return await this.getApiUser('get', [{name: 'storeId', value: storeId}]);
  }

  async deleteMateria(materia) {
    await this.getApiUser('delete', materia.storeId);

    const savedMaterias = this.getSavedMaterias();

    savedMaterias[materia.dataId].forEach((savedMateria, savedMateriaIndex) => {
      if (savedMateria.storeId === materia.storeId) {
        savedMaterias[materia.dataId].splice(savedMateriaIndex, 1);
      }
    });

    this.localStorageService.set(this.getLocalStorage(), savedMaterias);
  }

  filterMaterias(materias, filters, sort = 'rarity', order = 'desc', rawMaterias, rawSkills) {
    if (filters) {
      const filteredMaterias = [];

      for (const materiaId of Object.keys(materias)) {
        const materiaDataByMateria = materias[materiaId];
        for (const materiaData of materiaDataByMateria) {
          const materia = new Materia();
          this.buildMateriaFromData(materia, materiaData, rawMaterias, rawSkills);

          if ((filters.rarity.length === 0 || filters.rarity.indexOf(materia.rarity) !== -1)) {
            let needToAddMateria = false;
            if ((!filters.type || filters.type.length === 0)) {
              needToAddMateria = true;
            } else {
              if (filters.type && filters.type.length > 0) {
                if (filters.type.indexOf(materia.slot) !== -1) {
                  needToAddMateria = true;
                }
              }
            }

            if (needToAddMateria) {
              filteredMaterias.push(materia);
            }
          }
        }
      }

      return this.sortMaterias(filteredMaterias, sort, order);
    } else {
      return this.sortMaterias(materias, sort, order);
    }
  }

  private sortMaterias(materias, sort = 'rarity', order = 'desc') {
    switch (sort) {
      case 'rarity' :
        return this.toolService.sortByRarity(materias, order);
      break;
      default :
        console.log('not managed sort');
        return materias;
      break;
    }
  }

  getAvailableMainStats(materia, rawMaterias) {
    materia.mainStasAvailable = [];

    rawMaterias.forEach(rawMateria => {
      if (rawMateria.slots.indexOf(materia.slot) !== -1 && rawMateria.rarity === materia.rarity) {
        rawMateria.types.forEach(type => {
          let mainStat = '';
          type.mainStat.forEach((rawMainStat, rawMainStatIndex) => {
            if (rawMainStatIndex > 0) {
              mainStat += '_';
            }

            mainStat += rawMainStat.type;
          });

          if (materia.mainStasAvailable.indexOf(mainStat) === -1) {
            materia.mainStasAvailable.push(mainStat);
          }
        });
      }
    });
  }

  getMateriaFromCharacteristics(materia, rawMaterias, rawSkills) {
    let foundedMateria = false;

    for (const rawMateria of rawMaterias) {
      if (rawMateria.slots.indexOf(materia.slot) !== -1 && rawMateria.rarity === materia.rarity) {
        for (const type of rawMateria.types) {
          let mainStat = '';
          let rawMainStatIndex = 0;
          for (const rawMainStat of type.mainStat) {
            if (rawMainStatIndex > 0) {
              mainStat += '_';
            }

            mainStat += rawMainStat.type;
            rawMainStatIndex++;
          }

          if (mainStat === materia.mainStat) {
            this.updateMateriaForBuilder(materia, rawMateria, rawSkills, type, mainStat);
            foundedMateria = true;
            return;
          }
        }
      }
    }

    if (!foundedMateria) {
      for (const rawMateria of rawMaterias) {
        if (rawMateria.slots.indexOf(materia.slot) !== -1 && rawMateria.rarity === materia.rarity) {
          this.updateMateriaForBuilder(materia, rawMateria, rawSkills, rawMateria.types[0]);
          return;
        }
      }
    }
  }

  private updateMateriaForBuilder(materia, rawMateria, rawSkills, type, mainStat = '') {
    if (mainStat === '') {
      type.mainStat.forEach((rawMainStat, rawMainStatIndex) => {
        if (rawMainStatIndex > 0) {
          mainStat += '_';
        }

        mainStat += rawMainStat.type;
      });
    }

    materia.dataId = rawMateria.dataId;
    materia.maxSkill = rawMateria.maxSkill;
    materia.mainStat = mainStat;
    materia.image = rawMateria.image;
    materia.subStats = type.subStats[0];
    materia.availableSkills = [];
    materia.rawSkills = rawSkills;

    materia.mainStatValue = {
      min: type.mainStat[0].min,
      max: type.mainStat[0].max
    };

    type.skills.forEach(skillId => {
      let formattedEffect = '';
      const formattedEffects = this.skillService.formatEffects(materia, rawSkills.find(searchedSkill => searchedSkill.dataId === skillId), false);
      formattedEffects.before.forEach(beforeEffect => {
        formattedEffect += (formattedEffect !== '' ? ', ' : '') + beforeEffect;
      });

      formattedEffects.after.forEach(afterEffect => {
        formattedEffect += (formattedEffect !== '' ? ', ' : '') + afterEffect;
      });

      materia.availableSkills.push({
        dataId: skillId,
        formattedEffect: formattedEffect
      });

      materia.group = type.group;
    });
    materia.availableSkills = this.sortAvailableSkillsByName(materia.availableSkills);

    materia.skills = [
      materia.availableSkills[0].dataId
    ];

    materia.skillsDetail = [{
      level: 1,
      formattedEffect: '',
        shortEffect: ''
    }];

    materia.skillsNumTable = [];
    for (let i = 0; i < materia.maxSkill; i++) {
      materia.skillsNumTable.push(i);
    }
  }

  async buildMateriaFromData(materia, materiaData, rawMaterias = null, rawSkills = null) {
    let rawMateria = null;

    if (rawMaterias) {
      rawMateria = JSON.parse(JSON.stringify(rawMaterias.find(searchedMateria => searchedMateria.dataId === materiaData.dataId)));
    } else {
      const apiResult = await this.getApi(materiaData.dataId);
      rawMateria = apiResult.materia;
      rawSkills = apiResult.skills;
    }

    materia.dataId = rawMateria.dataId;
    materia.image = rawMateria.image;
    materia.rarity = rawMateria.rarity;
    materia.slot = materiaData.slot;
    materia.maxSkill = rawMateria.maxSkill;

    materia.rawSkills = rawSkills;

    materia.skills = materiaData.skills;
    materia.level = materiaData.level;
    materia.storeId = materiaData.storeId;
    materia.mainStat = materiaData.mainStat;

    materia.skillsNumTable = [];
    for (let i = 0; i < materia.maxSkill; i++) {
      materia.skillsNumTable.push(i);
    }

    materia.availableSkills = [];
    rawMateria.types.forEach(type => {
      let mainStat = '';
      type.mainStat.forEach((rawMainStat, rawMainStatIndex) => {
        if (rawMainStatIndex > 0) {
          mainStat += '_';
        }

        mainStat += rawMainStat.type;
      });

      if (mainStat === materia.mainStat) {
        materia.subStats = type.subStats[0];
        materia.mainStatValue = {
          min: type.mainStat[0].min,
          max: type.mainStat[0].max
        };

        type.skills.forEach(skillId => {
          let formattedEffect = '';
          const formattedEffects = this.skillService.formatEffects(materia, rawSkills.find(searchedSkill => searchedSkill.dataId === skillId), false);
          formattedEffects.before.forEach(beforeEffect => {
            formattedEffect += (formattedEffect !== '' ? ', ' : '') + beforeEffect;
          });

          formattedEffects.after.forEach(afterEffect => {
            formattedEffect += (formattedEffect !== '' ? ', ' : '') + afterEffect;
          });

          materia.availableSkills.push({
            dataId: skillId,
            formattedEffect: formattedEffect
          });
        });

        materia.group = type.group;

        materia.availableSkills = this.sortAvailableSkillsByName(materia.availableSkills);
      }
    });

    materiaData.subStats.forEach(subStatValues => {
      const subStat = materia.subStats.find(searchedStat => searchedStat.type === subStatValues.type);

      subStat.value = subStatValues.value;
    });

    materia.skillsDetail = [];
    materiaData.skillsLevel.forEach((skillLevel, skillLevelIndex) => {
      materia.skillsDetail.push({
        level: skillLevel,
        formattedEffect: '',
        shortEffect: ''
      });
      materia.updateSkill(skillLevelIndex, rawSkills, this.skillService);
    });

    materia.updateLevel();

    return materia;
  }

  copyMateriaFromData(materiaData) {
    const materia = new Materia();
    materiaData = JSON.parse(JSON.stringify(materiaData));

    Object.keys(materiaData).forEach(materiaKey => {
      materia[materiaKey] = materiaData[materiaKey];
    });

    return materia;
  }

  private reduceString(s: any) {
    return (('' + s).toLowerCase() || '' + s).replace(this.sre, '');
  }

  sortAvailableSkillsByName(skills) {
    skills.sort((a: any, b: any) => {
      const x = this.reduceString(a.dataId);
      const y = this.reduceString(b.dataId);

      return x.localeCompare(y, 'ja');
    });

    return skills;
  }

  getSkillLevelFromExp(exp) {
    let level = 0;
    let minusOne = false;

    for (level = 0; level <= this.skillLvTbl.length - 1; level++) {
      if (this.skillLvTbl[level] > exp) {
        minusOne = true;
        break;
      } if (this.skillLvTbl[level] === exp) {
        break;
      }
    }

    return level + (minusOne ? 0 : 1);
  }

  getCharacteristicsFromDataId(dataId) {
    const rarityFromId = {
      UR: 'UR',
      SSR: 'MR',
      SR: 'SR',
      R: 'R',
      N: 'N'
    };

    const tableDateId = dataId.split('_');

    const characteristics = {
      slot: tableDateId[3],
      mainStat: this.translationSkillFromId[tableDateId[5]],
      rarity: rarityFromId[tableDateId[4]]
    };

    return characteristics;
  }

  formatSubStatsFromInventory(dumpMateria, rawMaterias) {
    const subStats = [];

    const rawMateria = rawMaterias.find(searchedMateria => searchedMateria.dataId === dumpMateria.iname);

    if (rawMateria) {
      dumpMateria.statuses.forEach(subStat => {
        const subStatType = this.translationSkillFromId[subStat.iname.split('_')[1]];
        const rawSubStatValue = rawMateria.types[0].subStats[0].find(searchedSubStat => searchedSubStat.type === subStatType);

        if (subStatType && rawSubStatValue) {
          subStats.push({
            type: this.translationSkillFromId[subStat.iname.split('_')[1]],
            value: Math.floor(rawSubStatValue.min[0] + ((rawSubStatValue.max[0] - rawSubStatValue.min[0]) / (20 - 1) * (dumpMateria.lv - 1))) + subStat.val
          });
        }
      });
    }

    return subStats;
  }
}
