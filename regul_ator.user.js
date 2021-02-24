// ==UserScript==
// @name          Oggetto Redmine regul'ator
// @namespace     rizemun.oggetto
// @version       0.2
// @downloadURL   https://github.com/rizemun/redmine-regulator/raw/master/regul_ator.user.js
// @updateURL     https://github.com/rizemun/redmine-regulator/raw/master/regul_ator.user.js
// @description   Add time-tracking assistant
// @author        Artem Markin <rizeman01@gmail.com>
// @match         https://redmine.oggettoweb.com/issues/*/time_entries/*
// @grant         none
// ==/UserScript==

(function() {
  'use strict';

  const settings = {
    apiKey: '142d740244290eb296e296e2cb715d5c5439093c',
  }

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

  const TIME_TYPE = {
    'REGULAR': 'Regular',
    'FUCKUP': 'Fuc%up',
    'TEAM_FUCKUP': 'Team Fuc%up'
  };

  const ESTIMATES = {
    'Backend development': 18,
    'Frontend development': 19,
    'Testing': 20,
    'Project management': 26,
    'Design':17,

    'ADMIN': 24,
    'REVIEW': 37,
    'BUISNES_ALALITICS': 22,
    'SYSARCH': 23,
    'SETTINGS': 25,
    'MD': 29
  }

  const siteUrl = 'https://redmine.oggettoweb.com/'
  const issueNumber = document.getElementById('time_entry_issue_id').value;

  getData(issueNumber).then((data) => {
    init(data);

    getTimeEntities(data.project.id, issueNumber).then((timeData)=> {
      //console.log('timeData')
      //console.log(timeData)
      renderSpentTime(calcTrackedTime(timeData.time_entries))
    })

  })


  function init(data) {
    events(data);

    createEstimate(` Эстимейт: ${data.estimated_hours}ч`);
    renderEstimate(` Эстимейт: ${data.estimated_hours}ч`)
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

  function getEstimatesbyActivities(activityId, customFields) {
    const activity = ACTIVITIES[activityId];
    return getEstimate(ESTIMATES[activity], customFields)
  }

  function getEstimate(id, customFields) {
    return customFields.find(elem => elem.id === id).value;
  }

  function createEstimate(template) {
    const $estimateElem = $('<span>').attr('id','estimate_block').data('main-estimate', template);
    $('#time_entry_hours').after($estimateElem);
  }

  function renderEstimate(template) {
    $('#estimate_block').html(template)
  }

  function resetEstimate() {
    let $estimate = $('#estimate_block');
    renderEstimate($estimate.data('main-estimate'));
  }


  function renderSpentTime(hours) {
    const estimateElem = document.createElement('span');
    estimateElem.innerHTML = ` Трекнуто времени: ${hours}ч;`;
    const timeInput = document.getElementById('time_entry_hours');
    timeInput.after(estimateElem);
  }

  function calcTrackedTime(timeEntries) {
    console.log(timeEntries)
    return timeEntries.reduce((acc, elem) => {
      let checkType = function(customFields) {
        let types = ['Regular','Fuck%p','Duties']


        types.reduce((acc, type) => {
          customFields.filter(custField => custField.id == 12 && custField.value == type)
        },'')
      }

      let customFields = elem.custom_fields;

      let isRegular = !!customFields.filter(custField => custField.id === 12 && custField.value === TIME_TYPE.REGULAR).length;
      let isDuties = !!customFields.filter(custField => custField.id === 12 && custField.value === TIME_TYPE.TEAM_FUCKUP).length;
      let isFuckup = !!customFields.filter(custField => custField.id === 12 && custField.value === TIME_TYPE.FUCKUP).length;

      if(isDuties) {
        acc += elem.hours
      }
      return acc
    },0)
  }

  async function getData(id) {
    let url = 'https://redmine.oggettoweb.com/issues.json?issue_id='+id;
    let res = await fetch(url, {
      cache: 'no-cache',
      headers: {
        'X-Redmine-API-Key': settings.apiKey
      },

    })

    let jsonRes = await res.json();

    return jsonRes.issues[0]
  }

  async function getTimeEntities(projectId, issueId) {
    const url = `https://redmine.oggettoweb.com/time_entries.json?project_id=${projectId}&issue_id=${issueId}`;
    let res = await fetch(url, {
      cache: 'no-cache',
      headers: {
        'X-Redmine-API-Key': settings.apiKey
      },

    })
    return await res.json();
  }

//https://www.redmine.org/projects/redmine/wiki/Rest_CustomFields
})();
