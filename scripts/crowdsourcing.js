/**
  Like annotator, read the parser result and provide a beter way to check its
  content through google spreadsheet*/
  
var fs         = require('fs'),
    path       = require('path'),
    
    csv        = require('csv'),
    settings   = require('../settings'),
    eibio      = require('../contents/eibio'),
    async      = require('async'),
    _          = require('lodash'),
    
    clc        = require('cli-color'),
    
    

    options  = require('minimist')(process.argv.slice(2));

if(options.dates) {
  
  var records = [],
      max_activities = 0;
  
  for(var i in eibio) {
    for(var j in eibio[i].languages){
      for(var l in eibio[i]['duties_' + eibio[i].languages[j]]) {
        var record = {
          name: eibio[i].name,
          doi: eibio[i].doi,
          language: eibio[i].languages[j],
          birth_date: eibio[i].birth_date,
          birth_place: eibio[i].birth_place,
          death_date: eibio[i].death_date,
          death_place: eibio[i].death_place,
          position: eibio[i]['duties_' + eibio[i].languages[j]][l].position
        };
        
        for(var k in eibio[i]['duties_' + eibio[i].languages[j]][l].years) {
          record['activity_' + k +'_start_date'] = eibio[i]['duties_' + eibio[i].languages[j]][l].years[k][0]
          record['activity_' + k +'_end_date'] = eibio[i]['duties_' + eibio[i].languages[j]][l].years[k][1]
          max_activities = Math.max(max_activities, k);
        }
        records.push(record)
        //console.log(record)
        //console.log(eibio[i]['duties_' + eibio[i].languages[j]][l].position, eibio[i]['duties_' + eibio[i].languages[j]][l].years)
      }
    }
  }
  
  console.log('max activities', max_activities);
  
  // write the records somewhere
  var fields = [
    "doi",
    "name",
    "birth_date",
    "death_date",
    "birth_place",
    "death_place",
    "position"
  ];
  for(var i = 0; i < max_activities + 1; i++)
    fields.push('activity_' + i +'_start_date', 'activity_' + i +'_end_date')
    
  
  csv.stringify(records, {delimiter: '\t', columns: fields, header:true}, function (err, data) {
    if(err)
      throw err;
    
    fs.writeFile(settings.paths.csv.crowdsourcing_dates,
      data, function (err) {
        if(err)
          throw err;
        console.log(clc.blackBright(clc.cyanBright('done, file saved'), settings.paths.csv.crowdsourcing_dates));
      })
    });
  
} else {
  console.log(clc.redBright('function not found. Please append to the cmd one function: dates'))
}