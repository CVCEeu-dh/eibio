/*
  
  Setup js.
  Setup constraint, labels and everything else.
  
*/

var settings  = require('../settings'),
    helpers   = require('../helpers.js'),
    neo4j     = require('seraph')(settings.neo4j.host),
    async     = require('async'),
    _         = require('lodash'),
    clc        = require('cli-color'),
    queries   = require('decypher')('./queries/setup.cyp');

console.log(clc.cyanBright('\n\neibio'), 'installation\n')

// neo4j.query(create_constraint_person_slug, function( err, )
  
var q = async.queue(function (query, nextQuery) {
  console.log(clc.blackBright('...executing'),query.name)
  
  neo4j.query(query.cypher, function (err, result) {
    if(err)
      throw err;
    console.log(clc.greenBright('   done'),  q.length(), clc.blackBright('remaining\n'))
    nextQuery();
  })
}, 1);

q.push(_.map(queries, function (d, i) {
  return {
    cypher: d,
    name: i
  }
}));

q.drain = function() {
  console.log(clc.cyanBright('eibio'), 'installation', clc.greenBright('completed\n'));
};
