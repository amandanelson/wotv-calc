import { Injectable } from '@angular/core';

@Injectable()
export class SimulatorService {

  private elementAdvantage = {
    fire: 'ice',
    ice: 'wind',
    wind: 'earth',
    earth: 'lightning',
    lightning: 'water',
    water: 'fire',
    light: 'dark',
    dark: 'light'
  };

  private elementWeakness = {
    fire: 'water',
    ice: 'fire',
    wind: 'ice',
    earth: 'wind',
    lightning: 'earth',
    water: 'lightning',
    light: '',
    dark: ''
  };

  private species = [
    'human',
    'netherBeast',
    'beast',
    'demon',
    'dragon',
    'plant',
    'bird',
    'insect',
    'aquatic',
    'machine',
    'fairy',
    'undead',
    'stone',
    'metal',
    'arcana',
    'slime',
    '???'
  ];

  constructor(
  ) {}

  getSpecies() {
    return this.species;
  }

  calculateDamageSim(unit, dataSimulator) {
    // console.log(unit);
    // console.log(dataSimulator);

    if (dataSimulator && dataSimulator.unit && dataSimulator.unit.selectedSkill) {
      this.manageMaths(unit, dataSimulator);

      this.InitiateRealStats(unit, dataSimulator);
      this.getSkillEffects(unit, dataSimulator);
      this.checkOnPhysicOrMagic(unit, dataSimulator);
      this.applyBuffsAndBreaks(unit, dataSimulator);

      dataSimulator.result.normal = this.calculateDamage(unit, dataSimulator);
      dataSimulator.result.critic = this.calculateDamage(unit, dataSimulator, true);

      this.calculateDamageForConditions(unit, dataSimulator);
    }
  }

  InitiateRealStats(unit, dataSimulator) {
    dataSimulator.realStats = {
      unit: {},
      target: {}
    };

    Object.keys(unit.stats).forEach(statType => {
      dataSimulator.realStats.unit[statType] = unit.stats[statType].total;
    });

    dataSimulator.realStats.unit.faith = parseInt(dataSimulator.unit.faith, 10);
    dataSimulator.realStats.unit.brave = parseInt(dataSimulator.unit.brave, 10);

    Object.keys(dataSimulator.target).forEach(statType => {
      if (statType !== 'race' && statType !== 'element' && statType !== 'breaks') {
        dataSimulator.realStats.target[statType] = parseInt(dataSimulator.target[statType], 10);
      }
    });
  }

  updateRealStat(dataSimulator, type, statType, value) {
    if (!dataSimulator.realStats[type][statType]) {
      dataSimulator.realStats[type][statType] = 0;
    }

    if (type === 'unit') {
      dataSimulator.realStats[type][statType] += value;
    } else {
      dataSimulator.realStats[type][statType] -= value;
    }

    if ((statType === 'faith' || statType === 'brave') && dataSimulator.realStats[type][statType] > 100) {
      dataSimulator.realStats[type][statType] = 100;
    }
  }

  getSkillEffects(unit, dataSimulator) {
    const unitEffectTypes = [
      'atk',
      'mag',
      'dex',
      'agi',
      'luck',
      'raceKiller',
      'elementKiller',
      'elementAtk',
      'damageType',
      'critic_damage',
      'defense_penetration',
      'spirit_penetration',
      'typeResPene',
      'brave',
      'faith'
    ];
    const targetEffectTypes = [
      'def',
      'spr',
      'elementRes',
      'damageTypeRes',
      'attack_res',
      'aoe_res',
      'faith'
    ];

    dataSimulator.skillEffects = {
      unit: {},
      target: {}
    };

    unitEffectTypes.forEach(effectType => {
      dataSimulator.skillEffects.unit[effectType] = {
        value: 0,
        overwriteBuff: false
      };
    });

    targetEffectTypes.forEach(effectType => {
      dataSimulator.skillEffects.target[effectType] = {
        value: 0,
        overwriteBreak: false
      };
    });

    dataSimulator.unit.selectedSkill.effects.forEach(effect => {
      if (effect.timing === 'QUEST_START' || effect.timing === 'SKILL_BEFORE') {
        switch (effect.target) {
          case 'self' :
            this.applyEffectToUnit(unit, dataSimulator, effect);
            break;
          case 'target' :
            this.applyEffectToTarget(unit, dataSimulator, effect);
            break;
          case 'selfSide' :
            this.applyEffectToUnit(unit, dataSimulator, effect);
            break;
          case 'ennemySide' :
            this.applyEffectToTarget(unit, dataSimulator, effect);
            break;
          case 'all' :
            this.applyEffectToTarget(unit, dataSimulator, effect);
            break;
          default :
            if (effect.target === '') { // Killer have no target
              this.applyEffectToUnit(unit, dataSimulator, effect);
            }
            break;
        }
      }
    });

    // console.log('Skill effects');
    // console.log(dataSimulator.skillEffects);

    // console.log('Real stats');
    // console.log(dataSimulator.realStats);
  }

  applyEffectToUnit(unit, dataSimulator, effect) {
    // console.log('applyEffectToUnit');
    // console.log(effect);

    const effectType = effect.type;
    const elementSkill = dataSimulator.unit.selectedSkill.elem && dataSimulator.unit.selectedSkill.elem[0] ? dataSimulator.unit.selectedSkill.elem[0] : unit.element;
    const damageType = dataSimulator.unit.selectedSkill.damage.type;
    const targetElement = dataSimulator.target.element;
    const targetRace = dataSimulator.target.race;

    if (effect.condition) {
      dataSimulator.conditions.push({
        type: 'effect',
        name: effect.condition,
        target: 'unit',
        effect: {
          type: effect.type,
          value: this.getEffectValue(dataSimulator.unit.selectedSkill, effect)
        }
      });
    } else {
      if (effectType === 'ATK'
        || effectType === 'MAG'
        || effectType === 'DEX'
        || effectType === 'LUCK'
        || effectType === 'AGI'
      ) {
        let value = this.getEffectValue(dataSimulator.unit.selectedSkill, effect);

        if (effect.calcType === 'percent') {
          value = this.calculateBuffValue(unit, effectType, value);
        }

        if (value > this.calculateBuffValue(unit, effectType, parseInt(dataSimulator.unit.buffs[effectType.toLowerCase()], 10))) {
          dataSimulator.skillEffects.unit[effectType.toLowerCase()].value = value;
          dataSimulator.skillEffects.unit[effectType.toLowerCase()].overwriteBuff = true;
          this.updateRealStat(dataSimulator, 'unit', effectType, value);
        }
      } else if (effectType === 'DEFENSE_PENETRATION' || effectType === 'SPIRIT_PENETRATION' || effectType === 'CRITIC_DAMAGE') {
        const value = this.getEffectValue(dataSimulator.unit.selectedSkill, effect);

        if (value > parseInt(dataSimulator.unit.buffs[effectType.toLowerCase()], 10)) {
          dataSimulator.skillEffects.unit[effectType.toLowerCase()].value = value;
          dataSimulator.skillEffects.unit[effectType.toLowerCase()].overwriteBuff = true;
          this.updateRealStat(dataSimulator, 'unit', effectType, value);
        }
      } else if (effectType === 'FAITH' || effectType === 'FAITH_FIGHT') {
        let value = this.getEffectValue(dataSimulator.unit.selectedSkill, effect);

        if (effect.calcType === 'percent') {
          value = parseInt(dataSimulator.unit.faith, 10) * value / 100;
        }

        this.updateRealStat(dataSimulator, 'unit', 'faith', value);
      } else if (effectType === 'BRAVERY' || effectType === 'BRAVERY_FIGHT') {
        let value = this.getEffectValue(dataSimulator.unit.selectedSkill, effect);

        if (effect.calcType === 'percent') {
          value = parseInt(dataSimulator.unit.brave, 10) * value / 100;
        }

        this.updateRealStat(dataSimulator, 'unit', 'brave', value);
      } else if (effectType === 'RES_' + damageType.toUpperCase() + '_ATK_PENETRATION') {
        const value = this.getEffectValue(dataSimulator.unit.selectedSkill, effect);

        if (value > parseInt(dataSimulator.unit.buffs.typeResPene, 10)) {
          dataSimulator.skillEffects.unit.typeResPene.value = value;
          dataSimulator.skillEffects.unit.typeResPene.overwriteBuff = true;
          this.updateRealStat(dataSimulator, 'unit', effectType, value);
        }
      } else if (effectType === targetElement.toUpperCase() + '_KILLER') {
        const value = this.getEffectValue(dataSimulator.unit.selectedSkill, effect);

        if (value > parseInt(dataSimulator.unit.buffs.elementKiller, 10)) {
          dataSimulator.skillEffects.unit.elementKiller.value = value;
          dataSimulator.skillEffects.unit.elementKiller.overwriteBuff = true;
          this.updateRealStat(dataSimulator, 'unit', effectType, value);
        }
      } else if (effectType === targetRace.toUpperCase() + '_KILLER') {
        const value = this.getEffectValue(dataSimulator.unit.selectedSkill, effect);

        if (value > parseInt(dataSimulator.unit.buffs.raceKiller, 10)) {
          dataSimulator.skillEffects.unit.raceKiller.value = value;
          dataSimulator.skillEffects.unit.raceKiller.overwriteBuff = true;
          this.updateRealStat(dataSimulator, 'unit', effectType, value);
        }
      } else if (effectType === elementSkill.toUpperCase() + '_ATK') {
        const value = this.getEffectValue(dataSimulator.unit.selectedSkill, effect);

        if (value > parseInt(dataSimulator.unit.buffs.elementAtk, 10)) {
          dataSimulator.skillEffects.unit.elementAtk.value = value;
          dataSimulator.skillEffects.unit.elementAtk.overwriteBuff = true;
          this.updateRealStat(dataSimulator, 'unit', effectType, value);
        }
      } else if (effectType === damageType.toUpperCase() + '_ATK') {
        const value = this.getEffectValue(dataSimulator.unit.selectedSkill, effect);

        if (value > parseInt(dataSimulator.unit.buffs.damageType, 10)) {
          dataSimulator.skillEffects.unit.damageType.value = value;
          dataSimulator.skillEffects.unit.damageType.overwriteBuff = true;
          this.updateRealStat(dataSimulator, 'unit', effectType, value);
        }
      }
    }
  }

  applyEffectToTarget(unit, dataSimulator, effect) {
    // console.log('applyEffectToTarget');
    // console.log(effect);

    const effectType = effect.type;
    const elementSkill = dataSimulator.unit.selectedSkill.elem && dataSimulator.unit.selectedSkill.elem[0] ? dataSimulator.unit.selectedSkill.elem[0] : unit.element;
    const damageType = dataSimulator.unit.selectedSkill.damage.type;

    if (effect.condition) {
      dataSimulator.conditions.push({
        type: 'effect',
        name: effect.condition,
        target: 'target',
        effect: {
          type: effect.type,
          value: this.getEffectValue(dataSimulator.unit.selectedSkill, effect)
        }
      });
    } else {
      if (effectType === 'DEF'
        || effectType === 'SPR'
        || effectType === 'ATTACK_RES'
        || effectType === 'AOE_RES'
      ) {
        const value = this.getPositiveValue(this.getEffectValue(dataSimulator.unit.selectedSkill, effect));

        if (value > this.getPositiveValue(parseInt(dataSimulator.target.breaks[effectType.toLowerCase()], 10))) {
          dataSimulator.skillEffects.target[effectType.toLowerCase()].value = value;
          dataSimulator.skillEffects.target[effectType.toLowerCase()].overwriteBreak = true;
          this.updateRealStat(dataSimulator, 'target', effectType.toLowerCase(), value);
        }
      } else if (effectType === 'FAITH' || effectType === 'FAITH_FIGHT') {
        const value = this.getPositiveValue(this.getEffectValue(dataSimulator.unit.selectedSkill, effect));

        if (value > this.getPositiveValue(parseInt(dataSimulator.target.breaks.faith, 10))) {
          dataSimulator.skillEffects.target.faith.value = value;
          dataSimulator.skillEffects.target.faith.overwriteBreak = true;
          this.updateRealStat(dataSimulator, 'target', 'faith', value);
        }
      } else if (effectType === elementSkill.toUpperCase() + '_RES') {
        const value = this.getPositiveValue(this.getEffectValue(dataSimulator.unit.selectedSkill, effect));

        if (value > this.getPositiveValue(parseInt(dataSimulator.target.breaks.elementRes, 10))) {
          dataSimulator.skillEffects.target.elementRes.value = value;
          dataSimulator.skillEffects.target.elementRes.overwriteBreak = true;
          this.updateRealStat(dataSimulator, 'target', 'elementRes', value);
        }
      } else if (effectType === damageType.toUpperCase() + '_RES') {
        const value = this.getPositiveValue(this.getEffectValue(dataSimulator.unit.selectedSkill, effect));

        if (value > this.getPositiveValue(parseInt(dataSimulator.target.breaks.damageTypeRes, 10))) {
          dataSimulator.skillEffects.target.damageTypeRes.value = value;
          dataSimulator.skillEffects.target.damageTypeRes.overwriteBreak = true;
          this.updateRealStat(dataSimulator, 'target', 'damageTypeRes', value);
        }
      }
    }
  }

  private getPositiveValue(value) {
    if (value < 0) {
      return -value;
    }

    return value;
  }

  private getEffectValue(skill, effect) {
    let value = 0;
    if (typeof(effect.minValue) === 'number' || typeof(effect.value) === 'number') {
      let maxReduceValueFromMath = 0;
      if (skill.maths) {
        skill.maths.forEach(math => {
          if (math.type !== 'MODIFY_ABSORB' && math.dst !== 'DAMAGE' && math.formula === 'CURVE' && math.value < maxReduceValueFromMath) {
            maxReduceValueFromMath = math.value;
          }
        });
      }

      const minValue = (typeof(effect.minValue) === 'number' ? effect.minValue : effect.value) + maxReduceValueFromMath;

      if (effect.minValue !== effect.maxValue) {
        const maxValue = effect.maxValue;

        if (skill.level >= skill.maxLevel) {
          value = maxValue;
        } else {
          value = minValue + ((maxValue - minValue) / (skill.maxLevel - 1) * (skill.level - 1));
          if (value < 0) {
            value = -value;
            value = Math.floor(value);
            value = -value;
          } else {
            value = Math.floor(value);
          }
        }
      } else {
        value = minValue;
      }
    }

    return value;
  }

  private checkOnPhysicOrMagic(unit, dataSimulator) {
    unit.equipments.forEach((equipment, equipmentIndex) => {
      if (equipment) {
        equipment.passiveSkills.forEach(skill => {
          skill.effects.forEach(effect => {
            // buffOnCondition
            if ((effect.buffOnCondition === 'ON_MAGIC_ATTACK' && dataSimulator.unit.selectedSkill.based === 'physic')
              || (effect.buffOnCondition === 'ON_PHYSIC_ATTACK' && dataSimulator.unit.selectedSkill.based === 'magic')
            ) {
              this.updateRealStat(dataSimulator, 'unit', effect.type, -(unit.stats[effect.type]['equipment' + equipmentIndex + '_buff']));
            } else if ((effect.buffOnCondition === 'ON_MAGIC_ATTACK' || effect.buffOnCondition === 'ON_PHYSIC_ATTACK')
              && dataSimulator.unit.selectedSkill.based === 'hybrid'
            ) {

            }
          });
        });
      }
    });

    if (unit.card) {
      Object.keys(unit.card.buffs.self).forEach(buffType => {
        unit.card.buffs.self[buffType].forEach(effect => {
          if (!effect.cond || this.checkCondition(unit, effect.cond)) {
            if ((effect.buffOnCondition === 'ON_MAGIC_ATTACK' && dataSimulator.unit.selectedSkill.based === 'physic')
              || (effect.buffOnCondition === 'ON_PHYSIC_ATTACK' && dataSimulator.unit.selectedSkill.based === 'magic')
            ) {
              this.updateRealStat(dataSimulator, 'unit', buffType, -(effect.value));
            } else if ((effect.buffOnCondition === 'ON_MAGIC_ATTACK' || effect.buffOnCondition === 'ON_PHYSIC_ATTACK')
              && dataSimulator.unit.selectedSkill.based === 'hybrid'
            ) {

            }
          }
        });
      });

      Object.keys(unit.card.buffs.party).forEach(buffType => {
        unit.card.buffs.party[buffType].forEach(effect => {
          if (!effect.cond || this.checkCondition(unit, effect.cond)) {
            if ((effect.buffOnCondition === 'ON_MAGIC_ATTACK' && dataSimulator.unit.selectedSkill.based === 'physic')
              || (effect.buffOnCondition === 'ON_PHYSIC_ATTACK' && dataSimulator.unit.selectedSkill.based === 'magic')
            ) {
              this.updateRealStat(dataSimulator, 'unit', buffType, -(effect.value));
            } else if ((effect.buffOnCondition === 'ON_MAGIC_ATTACK' || effect.buffOnCondition === 'ON_PHYSIC_ATTACK')
              && dataSimulator.unit.selectedSkill.based === 'hybrid'
            ) {

            }
          }
        });
      });
    }

    if (unit.subCard) {
      Object.keys(unit.subCard.buffs.self).forEach(buffType => {
        unit.subCard.buffs.self[buffType].forEach(effect => {
          if (!effect.cond || this.checkCondition(unit, effect.cond)) {
            if ((effect.buffOnCondition === 'ON_MAGIC_ATTACK' && dataSimulator.unit.selectedSkill.based === 'physic')
              || (effect.buffOnCondition === 'ON_PHYSIC_ATTACK' && dataSimulator.unit.selectedSkill.based === 'magic')
            ) {
              this.updateRealStat(dataSimulator, 'unit', buffType, -(effect.value));
            } else if ((effect.buffOnCondition === 'ON_MAGIC_ATTACK' || effect.buffOnCondition === 'ON_PHYSIC_ATTACK')
              && dataSimulator.unit.selectedSkill.based === 'hybrid'
            ) {

            }
          }
        });
      });

      Object.keys(unit.subCard.buffs.party).forEach(buffType => {
        unit.subCard.buffs.party[buffType].forEach(effect => {
          if (!effect.cond || this.checkCondition(unit, effect.cond)) {
            if ((effect.buffOnCondition === 'ON_MAGIC_ATTACK' && dataSimulator.unit.selectedSkill.based === 'physic')
              || (effect.buffOnCondition === 'ON_PHYSIC_ATTACK' && dataSimulator.unit.selectedSkill.based === 'magic')
            ) {
              this.updateRealStat(dataSimulator, 'unit', buffType, -(effect.value));
            } else if ((effect.buffOnCondition === 'ON_MAGIC_ATTACK' || effect.buffOnCondition === 'ON_PHYSIC_ATTACK')
              && dataSimulator.unit.selectedSkill.based === 'hybrid'
            ) {

            }
          }
        });
      });
    }

    unit.teamCards.forEach(card => {
      if (card) {
        Object.keys(card.buffs.party).forEach(buffType => {
          card.buffs.party[buffType].forEach(effect => {
            if (!effect.cond || this.checkCondition(unit, effect.cond)) {
              if ((effect.buffOnCondition === 'ON_MAGIC_ATTACK' && dataSimulator.unit.selectedSkill.based === 'physic')
                || (effect.buffOnCondition === 'ON_PHYSIC_ATTACK' && dataSimulator.unit.selectedSkill.based === 'magic')
              ) {
                this.updateRealStat(dataSimulator, 'unit', buffType, -(effect.value));
              } else if ((effect.buffOnCondition === 'ON_MAGIC_ATTACK' || effect.buffOnCondition === 'ON_PHYSIC_ATTACK')
                && dataSimulator.unit.selectedSkill.based === 'hybrid'
              ) {

              }
            }
          });
        });
      }
    });

    unit.teamSubCards.forEach(card => {
      if (card) {
        Object.keys(card.buffs.party).forEach(buffType => {
          card.buffs.party[buffType].forEach(effect => {
            if (!effect.cond || this.checkCondition(unit, effect.cond)) {
              if ((effect.buffOnCondition === 'ON_MAGIC_ATTACK' && dataSimulator.unit.selectedSkill.based === 'physic')
                || (effect.buffOnCondition === 'ON_PHYSIC_ATTACK' && dataSimulator.unit.selectedSkill.based === 'magic')
              ) {
                this.updateRealStat(dataSimulator, 'unit', buffType, -(effect.value));
              } else if ((effect.buffOnCondition === 'ON_MAGIC_ATTACK' || effect.buffOnCondition === 'ON_PHYSIC_ATTACK')
                && dataSimulator.unit.selectedSkill.based === 'hybrid'
              ) {

              }
            }
          });
        });
      }
    });
  }

  private checkCondition(unit, conditions) {
    let conditionChecked = true;

    conditions.forEach(condition => {
      switch (condition.type) {
        case 'unit':
          if (condition.items.indexOf(unit.dataId) === -1) {
            conditionChecked = false;
          }
          break;
        case 'job':
          const jobs = [];
          condition.items.forEach(job => {
            const tempJob = job.split('_');
            jobs.push(tempJob[0] + '_' + tempJob[1] + '_' + tempJob[2]);
          });

          const tableMainJob = unit.jobs[0].split('_');
          const tableSubJob = unit.jobs[unit.subJob].split('_');
          if (jobs.indexOf(tableMainJob[0] + '_' + tableMainJob[1] + '_' + tableMainJob[2]) === -1
            && jobs.indexOf(tableSubJob[0] + '_' + tableSubJob[1] + '_' + tableSubJob[2]) === -1) {
            conditionChecked = false;
          }
          break;
        case 'mainJob':
          const mainJobs = [];
          condition.items.forEach(job => {
            const tempJob = job.split('_');
            mainJobs.push(tempJob[0] + '_' + tempJob[1] + '_' + tempJob[2]);
          });

          const tableJob = unit.jobs[0].split('_');
          if (mainJobs.indexOf(tableJob[0] + '_' + tableJob[1] + '_' + tableJob[2]) === -1) {
            conditionChecked = false;
          }
          break;
        case 'elem':
          if (condition.items.indexOf(unit.element) === -1) {
            conditionChecked = false;
          }
          break;
        default:
          console.log('Card condition not manage : ' + condition.type);
          break;
      }
    });

    return conditionChecked;
  }

  applyBuffsAndBreaks(unit, dataSimulator) {
    const elementSkill = dataSimulator.unit.selectedSkill.elem && dataSimulator.unit.selectedSkill.elem[0] ? dataSimulator.unit.selectedSkill.elem[0] : unit.element;
    const damageType = dataSimulator.unit.selectedSkill.damage.type;
    const targetElement = dataSimulator.target.element;
    const targetRace = dataSimulator.target.race;

    Object.keys(dataSimulator.unit.buffs).forEach(buffType => {
      if (parseInt(dataSimulator.unit.buffs[buffType], 10) > 0 && !dataSimulator.skillEffects.unit[buffType].overwriteBuff) {
         if (buffType === 'atk'
          || buffType === 'mag'
          || buffType === 'dex'
          || buffType === 'luck'
          || buffType === 'agi'
        ) {
          this.updateRealStat(dataSimulator, 'unit', buffType.toUpperCase(), this.calculateBuffValue(unit, buffType.toUpperCase(), parseInt(dataSimulator.unit.buffs[buffType], 10)));
        } else if (buffType === 'defense_penetration' || buffType === 'spirit_penetration' || buffType === 'critic_damage') {
          this.updateRealStat(dataSimulator, 'unit', buffType.toUpperCase(), parseInt(dataSimulator.unit.buffs[buffType], 10));
        } else if (buffType === 'damageType') {
          this.updateRealStat(dataSimulator, 'unit', damageType.toUpperCase() + '_ATK', parseInt(dataSimulator.unit.buffs[buffType], 10));
        } else if (buffType === 'elementAtk') {
          this.updateRealStat(dataSimulator, 'unit', elementSkill.toUpperCase() + '_ATK', parseInt(dataSimulator.unit.buffs[buffType], 10));
        } else if (buffType === 'elementKiller') {
          this.updateRealStat(dataSimulator, 'unit', targetElement.toUpperCase() + '_KILLER', parseInt(dataSimulator.unit.buffs[buffType], 10));
        } else if (buffType === 'raceKiller') {
          this.updateRealStat(dataSimulator, 'unit', targetRace.toUpperCase() + '_KILLER', parseInt(dataSimulator.unit.buffs[buffType], 10));
        } else if (buffType === 'typeResPene') {
          this.updateRealStat(dataSimulator, 'unit', 'RES_' + damageType.toUpperCase() + '_ATK_PENETRATION', parseInt(dataSimulator.unit.buffs[buffType], 10));
        }
      }
    });

    Object.keys(dataSimulator.target.breaks).forEach(breakType => {
      if (parseInt(dataSimulator.target.breaks[breakType], 10) > 0 && !dataSimulator.skillEffects.target[breakType].overwriteBreak) {
        this.updateRealStat(dataSimulator, 'target', breakType, parseInt(dataSimulator.target.breaks[breakType], 10));
      }
    });
  }

  getEquipmentStats(unit) {
    const stats = {};
    const statTypes = ['ATK', 'MAG', 'DEX', 'LUCK', 'AGI'];

    statTypes.forEach(statType => {
      stats[statType] = unit.stats[statType].totalEquipment ? unit.stats[statType].totalEquipment : 0;
    });

    return stats;
  }

  calculateDamage(unit, dataSimulator, critic = false, addDamageValue = 0) {
    const stats = {
      ATK: dataSimulator.realStats.unit.ATK,
      MAG: dataSimulator.realStats.unit.MAG,
      AGI: dataSimulator.realStats.unit.AGI,
      DEX: dataSimulator.realStats.unit.DEX,
      LUCK: dataSimulator.realStats.unit.LUCK
    };
    const equipmentStats = this.getEquipmentStats(unit);

    let baseDamage = 0;
    if (dataSimulator.unit.selectedSkill.based === 'magic') {
      baseDamage = this.calculateSkillBonus(stats, dataSimulator.unit.selectedSkill.damage.formula, 'magic', equipmentStats);
    } else if (dataSimulator.unit.selectedSkill.based === 'physic') {
      baseDamage = this.calculateSkillBonus(stats, dataSimulator.unit.selectedSkill.damage.formula, 'physic', equipmentStats);
    } else if (dataSimulator.unit.selectedSkill.based === 'hybrid') {
      // @TODO manage kotetsu
    }

    /***************/
    /* Damage Part */
    /***************/
    let damage = Math.floor(baseDamage * this.getMultiplier(unit, dataSimulator, critic, addDamageValue));
    // console.log('damage after multiplier');
    // console.log(damage);

    if (dataSimulator.unit.selectedSkill.based === 'magic') {
      damage = Math.floor(damage * ((parseInt(dataSimulator.unit.faith, 10) + dataSimulator.realStats.target.faith) / 100));
    } else if (dataSimulator.unit.selectedSkill.based === 'physic') {
      damage = Math.floor(damage * (0.5 + (parseInt(dataSimulator.unit.brave, 10) / 100)));
    } else if (dataSimulator.unit.selectedSkill.based === 'hybrid') {
      // @TODO manage kotetsu
    }
    // console.log('damage after brave');
    // console.log(damage);

    damage = Math.floor(damage * (1 + (this.elementAdvantage[unit.element] === dataSimulator.target.element ? 0.25 : 0) - ((this.elementWeakness[unit.element] === dataSimulator.target.element ? 0.25 : 0))));
    // console.log('damage element advantage');
    // console.log(damage);

    /****************/
    /* Defense Part */
    /****************/
    damage = Math.floor(damage * this.getDamageResistanceMultiplier(unit, dataSimulator));
    // console.log('damage after damage resistance, ...');
    // console.log(damage);

    damage = Math.floor(damage * this.getDefensiveMultiplier(unit, dataSimulator, dataSimulator.unit.selectedSkill.based === 'magic' ? 'spr' : 'def'));
    // console.log('damage after DEF, ...');
    // console.log(damage);

    damage = Math.floor(damage * this.getElementResistanceMultiplier(unit, dataSimulator));
    // console.log('damage after element resistance, ...');
    // console.log(damage);

    damage = Math.floor(damage * this.getSingleOrAoeResistanceMultiplier(unit, dataSimulator));
    // console.log('damage after single/aoe resistance, ...');
    // console.log(damage);

    if (damage < 0) {
      damage = 0;
    }

    return damage;
  }

  isMultiHits(skill) {
    return skill.combo ? true : false;
  }

  calculateSkillBonus(stats, formula, damageType, equipmentStats) {
    let damage = 0;
    let mainStat = 0;
    let mainStatEquipment = 0;

    if (damageType === 'magic') {
      mainStat = stats.MAG;
      mainStatEquipment = equipmentStats.MAG;
    } else if (damageType === 'physic') {
      mainStat = stats.ATK;
      mainStatEquipment = equipmentStats.ATK;
    } else {
      // TODO will be hybrid
    }

    if (formula && formula.type === 1) {
      damage += mainStat * (100 + formula[1]) / 100;
    } else if (formula && formula.type === 0) {
      damage += mainStat;

      damage += stats.DEX * (formula[1] ? formula[1] : 0) / 100;
      damage += stats.AGI * (formula[2] ? formula[2] : 0) / 100;
      damage += stats.LUCK * (formula[3] ? formula[3] : 0) / 100;
    } else {
      damage += mainStat;
    }

    // console.log('SKILL BONUS');
    // console.log(Math.floor(damage));
    return Math.floor(damage);
  }

  getMultiplier(unit, dataSimulator, critic = false, addDamageValue = 0) {
    let multiplier = this.getDamageValue(unit, dataSimulator) + addDamageValue;

    // console.log('skill modifier');
    // console.log(multiplier);

    const elementSkill = dataSimulator.unit.selectedSkill.elem && dataSimulator.unit.selectedSkill.elem[0] ? dataSimulator.unit.selectedSkill.elem[0] : unit.element;
    const damageType = dataSimulator.unit.selectedSkill.damage.type;
    const targetElement = dataSimulator.target.element;
    const targetRace = dataSimulator.target.race;

    Object.keys(dataSimulator.realStats.unit).forEach(statType => {
      if (statType === elementSkill.toUpperCase() + '_ATK'
        || (damageType && statType === damageType.toUpperCase() + '_ATK')
        || statType === targetElement.toUpperCase() + '_KILLER'
        || statType === targetRace.toUpperCase() + '_KILLER'
      ) {
        // console.log('multiplier -- ' + statType);
        // console.log(dataSimulator.realStats.unit[statType]);
        multiplier += dataSimulator.realStats.unit[statType];
      }
    });

    if (critic) {
      multiplier += 25 + (dataSimulator.realStats.unit['CRITIC_DAMAGE'] ? dataSimulator.realStats.unit['CRITIC_DAMAGE'] : 0);
    }

    // console.log('total multiplier')
    // console.log(multiplier)

    return multiplier / 100;
  }

  private getDamageValue(unit, dataSimulator) {
    const skill = dataSimulator.unit.selectedSkill;
    const effect = skill.damage;
    let value = 0;

    if (typeof(effect.minValue) === 'number' || typeof(effect.value) === 'number') {
      let maxReduceValueFromMath = 0;
      if (skill.maths) {
        skill.maths.forEach(math => {
          if (math.type !== 'MODIFY_ABSORB' && math.dst === 'DAMAGE' && math.formula === 'CURVE' && math.value < maxReduceValueFromMath) {
            maxReduceValueFromMath = math.value;
          }
        });
      }

      const minValue = 100 + (typeof(effect.minValue) === 'number' ? effect.minValue : effect.value) + maxReduceValueFromMath;

      if (effect.minValue !== effect.maxValue) {
        const valueForLevel = Math.floor(effect.minValue + ((effect.maxValue - effect.minValue) / (skill.maxLevel - 1) * (skill.level - 1)));
        value = 100 + valueForLevel;
      } else {
        value = minValue;
      }
    }

    // Be careful the first hit don't increase chain mod
    let chainMod = 1;
    let ChainModType = false;
    let ChainModElement = false;

    if (skill.damage.type && skill.damage.type !== 'all' && skill.damage.type !== 'magic') {
      ChainModType = true;
    }

    const elementSkill = dataSimulator.unit.selectedSkill.elem && dataSimulator.unit.selectedSkill.elem[0] ? dataSimulator.unit.selectedSkill.elem[0] : unit.element;
    if (elementSkill !== 'neutral') {
      ChainModElement = true;
    }

    if (this.isMultiHits(skill)) {
      value = value * ((100 - skill.combo.rate) * skill.combo.num / 100);

      let multiHitsMod = 0;

      for (let i = 0; i < skill.combo.num; i++) {
        const newMod = 0
          + (ChainModType ? 0.2 * (i + parseInt(dataSimulator.unit.chain.type, 10)) : 0)
          + (ChainModElement ? 0.2 * (i + parseInt(dataSimulator.unit.chain.element, 10)) : 0);

        multiHitsMod += 1 + (newMod > 4 ? 4 : newMod);
      }

      chainMod = multiHitsMod / skill.combo.num;
    } else if (parseInt(dataSimulator.unit.chain.type, 10) >= 1 || parseInt(dataSimulator.unit.chain.element, 10) >= 1) {
      const newMod = 0
        + (ChainModType && parseInt(dataSimulator.unit.chain.type, 10) >= 1 ? 0.2 * parseInt(dataSimulator.unit.chain.type, 10) : 0)
        + (ChainModElement && parseInt(dataSimulator.unit.chain.element, 10) >= 1 ? 0.2 * parseInt(dataSimulator.unit.chain.element, 10) : 0);

      chainMod += (newMod > 4 ? 4 : newMod);
    }

    value = Math.floor(value * chainMod);

    return value;
  }

  getDefensiveMultiplier(unit, dataSimulator, type) {
    const defensiveValue = dataSimulator.realStats.target[type];
    let ignoreDefensive = 0;

    if (defensiveValue > 0) {
      Object.keys(dataSimulator.realStats.unit).forEach(statType => {
        if (statType === (type === 'def' ? 'DEFENSE_PENETRATION' : 'SPIRIT_PENETRATION')) {
          ignoreDefensive = dataSimulator.realStats.unit[statType];
        }
      });
    }

    return 1 - ((defensiveValue / 100) * (1 - (ignoreDefensive / 100)));
  }

  getDamageResistanceMultiplier(unit, dataSimulator) {
    let ignoreDefensive = 0;
    const damageType = dataSimulator.unit.selectedSkill.damage.type;

    if (dataSimulator.realStats.target.damageTypeRes > 0) {
      Object.keys(dataSimulator.realStats.unit).forEach(statType => {
        if (statType === 'RES_' + damageType.toUpperCase() + '_ATK_PENETRATION') {
          ignoreDefensive = dataSimulator.realStats.unit[statType];
        }
      });
    }

    return 1 - ((dataSimulator.realStats.target.damageTypeRes / 100) * (1 - (ignoreDefensive / 100)));
  }

  getElementResistanceMultiplier(unit, dataSimulator) {
    return (1 - dataSimulator.realStats.target.elementRes / 100);
  }

  getSingleOrAoeResistanceMultiplier(unit, dataSimulator) {
    let aoeOrSingleRes = 0;

    if (dataSimulator.unit.selectedSkill.aoe || dataSimulator.unit.selectedSkill.range.s === 13) {
      aoeOrSingleRes = 1 - dataSimulator.realStats.target.aoe_res / 100;
    } else {
      aoeOrSingleRes = 1 - dataSimulator.realStats.target.attack_res / 100;
    }

    return aoeOrSingleRes;
  }

  calculateBuffValue(unit, buffType, value) {
    return Math.floor(unit.stats[buffType].baseTotal * value / 100);
  }

  manageMaths(unit, dataSimulator) {
    dataSimulator.conditions = [];

    if (dataSimulator.unit.selectedSkill.maths) {
      dataSimulator.unit.selectedSkill.maths.forEach(math => {
        if (math.dst === 'DAMAGE') {
          let value = this.getPositiveValue(math.value);

          if (math.formula === 'CURVE' && math.type === 'HEIGHT') {
            const maxHeight = 0
              + (dataSimulator.unit.selectedSkill.range && dataSimulator.unit.selectedSkill.range.h ? dataSimulator.unit.selectedSkill.range.h : 0)
              + (dataSimulator.unit.selectedSkill.aoe && dataSimulator.unit.selectedSkill.aoe.h ? dataSimulator.unit.selectedSkill.aoe.h : 0);

            value = Math.floor(this.getPositiveValue(math.value / math.condition)) * maxHeight;
          }

          dataSimulator.conditions.push({
            type: 'damage',
            name: math.type,
            value: value
          });
        }
      });
    }
  }

  calculateDamageForConditions(unit, dataSimulator) {
    dataSimulator.result.conditions = [];

    dataSimulator.conditions.forEach(condition => {
      if (condition.type === 'damage') {
        dataSimulator.result.conditions.push({
          type: condition.name,
          normal: this.calculateDamage(unit, dataSimulator, false, condition.value),
          critic: this.calculateDamage(unit, dataSimulator, true, condition.value)
        });
      } else { // should be effect
        if (condition.effect.type === 'DEF') {
          const value = this.getPositiveValue(condition.effect.value);

          if (value > this.getPositiveValue(dataSimulator.target.breaks['def'])) {
            this.updateRealStat(dataSimulator, 'target', 'def', value);
          }

          dataSimulator.result.conditions.push({
            type: condition.name,
            normal: this.calculateDamage(unit, dataSimulator, false),
            critic: this.calculateDamage(unit, dataSimulator, true)
          });
        } else if (condition.effect.type !== 'CRITIC_GUARENTED') {
          console.log('Condition effect not manage in sim');
          console.log(condition);
        }
      }
    });
  }
}
