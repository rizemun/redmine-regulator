// ==UserScript==
// @name          Oggetto Redmine regul'ator
// @namespace     rizemun.oggetto
// @version       0.2.4
// @downloadURL   https://github.com/rizemun/redmine-regulator/raw/master/regul_ator.user.js
// @updateURL     https://github.com/rizemun/redmine-regulator/raw/master/regul_ator.user.js
// @description   Add time-tracking assistant
// @author        Artem Markin <rizeman01@gmail.com>
// @match         https://redmine.oggettoweb.com/issues/*/time_entries/*
// @grant         none
// ==/UserScript==

(function () {
  'use strict';

  class RedmineApiKey {
    constructor() {
      this.settings = {
        itemname: 'redmine-api-key'
      };
    }

    get localKey() {
      return localStorage.getItem(this.settings.itemname)
    }

    set localKey(key) {
      localStorage.setItem(this.settings.itemname, key)
    }

    async loadApiKey() {
      let response = await fetch('https://redmine.oggettoweb.com/my/api_key', {
        headers: {
          accept: 'text/javascript',
          'x-requested-with': 'XMLHttpRequest'
        }
      })
      const data = await response.text();
      const parcedData = data.match(/html[(]'(\w*?)'[)]/)
      const apiKey = (parcedData && parcedData[1])
        ? parcedData[1]
        : '';

      if (!apiKey) {
        console.error('api key not found')
      }

      this.localKey = apiKey;

      return await apiKey;
    }

    removeKey() {
      localStorage.removeItem(this.settings.itemname)
    }
  }

  const settings = async () => {
    const redmineApiKey = new RedmineApiKey();
    return {
      siteUrl: 'https://redmine.oggettoweb.com/',
      apiKey: redmineApiKey.localKey ? redmineApiKey.localKey : await redmineApiKey.loadApiKey()
    }
  };

  settings().then(settings => console.log(settings))


  const ACTIVITIES = {
    8:  'Design',
    11: 'Testing',
    12: 'Backend development',
    13: 'Frontend development',
    16: 'Project management',
    17: 'Settings',
    28: 'Business analysis',
    29: 'System administration',
    25: 'System architect',
    30: 'Mobile development',
    31: 'QA automatization',
    40: 'Review',
    41: 'Refactoring',
    68: 'Web Analysis',
    114: 'Support'
  };

  const ESTIMATES = {
    'Backend development': 18,
    'Frontend development': 19,
    'Testing': 20,
    'Project management': 26,
    'Design': 17,

    'ADMIN': 24,
    'REVIEW': 37,
    'BUISNES_ALALITICS': 22,
    'SYSARCH': 23,
    'SETTINGS': 25,
    'MD': 29
  }

  const TIME_TYPE = {
    'REGULAR': 'Regular',
    'FUCKUP': 'Fuc%up',
    'TEAM_FUCKUP': 'Team Fuc%up'
  };

  const issueNumber = document.getElementById('time_entry_issue_id').value;

  getData(issueNumber).then((data) => {
    init(data);

    getTimeEntities(data.project.id, issueNumber).then((timeData) => {
      //console.log('timeData')
      //console.log(timeData)
      renderSpentTime(calcTrackedTime(timeData.time_entries))
    })

  })

  class estimator {
    constructor() {
      this.cache();
      this.events();

      const issueNumber = document.getElementById('time_entry_issue_id').value;

      this.getIssueData(issueNumber).then((data) => {
        init(data);

        /*getTimeEntities(data.project.id, issueNumber).then((timeData) => {
          //console.log('timeData')
          //console.log(timeData)
          renderSpentTime(calcTrackedTime(timeData.time_entries))
        })*/

      })

    }

    cache() {
      this.settings = {
        selectors: {
          hoursInput: '#time_entry_hours',
          activityInput: '#time_entry_activity_id'
        },
        id: {
          estimateContent: 'estimate_block'
        },
        data: {
          mainEstimate: 'main-estimate'
        }
      }

      this.$hoursinput = $(this.settings.selectors.hoursInput)
      this.$activityInput = $(this.settings.selectors.activityInput)
    }

    events(data) {
      this.$activityInput.on('change', this.onActivityInputChange.bind(this))
    }

    onActivityInputChange(ev) {
      const value = ev.target.value;

      if (!value) {
        this.resetEstimate()
        return
      }
      const estimate = this.getEstimateByActivityId(value, data.custom_fields)
      if (!estimate) {
        this.resetEstimate()
        return
      }
      this.renderEstimate(` ${ACTIVITIES[value]}: ${estimate}ч`)
    }

    createEstimate(template) {
      const $estimateElem = $('<span>')
        .attr('id', this.settings.id.estimateContent)
        .data(this.settings.data.mainEstimate, template);

      this.$hoursinput.after($estimateElem);
      this.$esimateContent = $estimateElem;
    }

    renderEstimate(template) {
      if (!this.$esimateContent) {
        return
      }
      this.$esimateContent.html(template)
    }

    resetEstimate() {
      this.renderEstimate(this.$esimateContent.data(this.settings.data.mainEstimate));
    }

    loadEstimates(data) {
      //todo: реализовать метод
      this.issueData = data;
    }

    getEstimateByActivityId(activityId) {
      const activity = ACTIVITIES[activityId];
      return this.getEstimate(ESTIMATES[activity])
    }

    getEstimateById(id) {
      return issueData.customFields.find(elem => elem.id === id).value;
    }

    /**
     * get issue data via api using issue id
     *
     * @param id
     * @returns {Promise<*>}
     */
    async getIssueData(id) {
      let url = 'https://redmine.oggettoweb.com/issues.json?issue_id=' + id;
      let res = await fetch(url, {
        cache: 'no-cache',
        headers: {
          'X-Redmine-API-Key': await settings().apiKey
        },
      })
      let jsonRes = await res.json();

      this.issueData = jsonRes.issues[0];
      return this.issueData
    }


  }


  function init(data) {
    events(data);
  }

  function events(data) {
    $('#time_entry_activity_id').on('change', (ev) => {
      const value = ev.target.value;
      if (!value) {
        resetEstimate()
        return
      }

      const estimate = getEstimatesbyActivities(value, data.custom_fields)
      if (!estimate) {
        resetEstimate()
        return
      }
      renderEstimate(` ${ACTIVITIES[value]}: ${estimate}ч`)
    })
  }


  function renderSpentTime(hours) {
    const estimateElem = document.createElement('span');
    estimateElem.innerHTML = `Трекнуто времени: ${hours}ч; `;
    const timeInput = document.getElementById('time_entry_hours');
    timeInput.after(estimateElem);
  }

  function calcTrackedTime(timeEntries) {
    console.log(timeEntries)
    return timeEntries.reduce((acc, elem) => {
      let checkType = function (customFields) {
        let types = ['Regular', 'Fuck%p', 'Duties']


        types.reduce((acc, type) => {
          customFields.filter(custField => custField.id == 12 && custField.value == type)
        }, '')
      }

      let customFields = elem.custom_fields;

      let isRegular = !!customFields.filter(custField => custField.id === 12 && custField.value === TIME_TYPE.REGULAR).length;
      let isDuties = !!customFields.filter(custField => custField.id === 12 && custField.value === TIME_TYPE.TEAM_FUCKUP).length;
      let isFuckup = !!customFields.filter(custField => custField.id === 12 && custField.value === TIME_TYPE.FUCKUP).length;

      if (isDuties) {
        acc += elem.hours
      }
      return acc
    }, 0)
  }

  async function getTimeEntities(projectId, issueId) {
    const url = `https://redmine.oggettoweb.com/time_entries.json?project_id=${projectId}&issue_id=${issueId}`;
    let res = await fetch(url, {
      cache: 'no-cache',
      headers: {
        'X-Redmine-API-Key': await settings().apiKey
      },

    })
    return await res.json();
  }

//https://www.redmine.org/projects/redmine/wiki/Rest_CustomFields
})();
