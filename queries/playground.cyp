// name: computate_genericity
// computate genericity for each institution based on corpus distribution
MATCH (ent)-[r:appears_in]->(act:activity)
  WITH ent, count(DISTINCT r) as num_of_docs
SET ent.df = num_of_docs
RETURN ent.name, ent.df ORDER BY num_of_docs DESC

// name: computate_activity_genericity
// computate genericity for each institution based on corpus distribution
MATCH (per:person)-[r:employed_as]->(act:activity)
  WITH act, count(DISTINCT r) as num_of_people
SET act.df = num_of_people
RETURN act.name, act.df ORDER BY num_of_people DESC