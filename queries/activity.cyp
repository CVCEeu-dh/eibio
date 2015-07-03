// name: merge_activity
//
MERGE (act:activity {position: position})
  ON CREATE SET
    act.language = {language},
    act.years = {years}
  RETURN act