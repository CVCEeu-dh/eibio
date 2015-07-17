// name: merge_activity
//
MERGE (act:activity {slug: {slug}})
  ON CREATE SET
    act.creation_date  = {creation_date},
    act.creation_time  = {creation_time},
    act.description_fr = {description_fr},
    act.description_en = {description_en},
    act.country        = {country}
WITH act
MATCH (per:person {slug:{person_slug}})
MERGE (per)-[r:employed_as]->(act)
  ON CREATE SET
    r.start_date = {start_date},
    r.start_time = {start_time},
    r.end_date   = {end_date},
    r.end_time   = {end_time}
RETURN {
  id: id(act),
  props: act,
  start_date: r.start_date,
  start_time: r.start_time,
  end_date:   r.end_date,
  end_time:   r.end_time
} as activity


// name: remove_activities
// delete an activity and its links
MATCH (act:activity {slug: {slug}})
OPTIONAL MATCH (act)-[r]-()
DELETE act, r