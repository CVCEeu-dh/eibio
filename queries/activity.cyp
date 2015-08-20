// name: get_activity
//
MATCH (act:activity {slug: {slug}})
RETURN {
  slug: act.slug,
  uri: 'activity/' + act.slug,
  props: act
}

// name: get_activities
// return a list of activities per position
MATCH (act:activity)
WITH act
ORDER BY act.slug ASC
SKIP {offset}
LIMIT {limit}
WITH act
RETURN {
  slug:     act.slug,
  uri: 'activity/' + act.slug,
  props: act
}

// name: get_activity_related_persons
//
MATCH (act:activity {slug: {slug}})
OPTIONAL MATCH (per)-[r:employed_as]->(act)
WITH act, per, r
SKIP {offset}
LIMIT {limit}
RETURN {
  slug: act.slug,
  uri: 'activity/' + act.slug,
  props: act,
  persons: collect(per),
  rels:    collect(r)
}

// name: merge_activity
//
MERGE (act:activity {slug: {slug}})
  ON CREATE SET
    act.creation_date  = {creation_date},
    act.creation_time  = {creation_time},
    act.position       = {position},
    act.description_fr = {description_fr},
    act.description_en = {description_en},
    act.country        = {country}
    
  ON MATCH SET
    act.position       = {position},
    act.description_fr = {description_fr},
    act.description_en = {description_en}
WITH act
MATCH (per:person {slug:{person_slug}})
MERGE (per)-[r:employed_as {start_date: {start_date}, end_date: {end_date}}]->(act)
  ON CREATE SET
    r.start_date = {start_date},
    r.start_time = {start_time},
    r.end_date   = {end_date},
    r.end_time   = {end_time}
RETURN {
  slug: act.slug,
  uri: 'activity/' + act.slug,
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

// name: get_positions
// return a list of activities per position
MATCH (act:activity)
RETURN {
  position: act.position,
  country:  act.country,
  slug:     act.slug,
  description_fr: act.description_fr,
  description_en: act.description_en
}

// name: merge_activity_lite
//
MERGE (act:activity {slug: {slug}})
  ON CREATE SET
    act.creation_date  = {creation_date},
    act.creation_time  = {creation_time},
    act.position       = {position},
    act.description_fr = {description_fr},
    act.description_en = {description_en},
    act.country        = {country}
  ON MATCH SET
    act.position       = {position},
    act.description_fr = {description_fr},
    act.description_en = {description_en}
RETURN {
  position: act.position,
  country:  act.country,
  slug:     act.slug,
  description_fr: act.description_fr,
  description_en: act.description_en
}