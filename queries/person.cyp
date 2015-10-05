// name: get_person
// get person with the list of its activities. By SLUG
MATCH (per:person {slug: {slug}})
  OPTIONAL MATCH (per)-[r:employed_as]->(act:activity)
  OPTIONAL MATCH (ins:institution)-[r2:appears_in]->(act)

WITH per, act, r, ins, r2, {
  id: id(ins),
  slug: ins.slug,
  uri: 'institution/' + ins.slug,
  props: ins
} AS institutions

WITH per, {
  id: id(act),
  slug: act.slug,
  uri: 'activity/' + act.slug,
  props: act,
  rel: r,
  institutions: collect(DISTINCT institutions)
} as activities

RETURN {
  slug: per.slug,
  uri: 'person/' + per.slug,
  props: per,
  activities: collect(DISTINCT activities)
}



// name: get_persons
// get just a list of persons
MATCH (per:person)
WITH per
ORDER BY per.last_name ASC
SKIP {offset}
LIMIT {limit}
WITH per
OPTIONAL MATCH (per)-[r:has_nationality]->(nat:nationality)
WITH per, nat
RETURN {
  slug: per.slug,
  uri: 'person/' + per.slug,
  props: per,
  nationalities: extract(n in collect(nat)|{
    slug: n.slug
  })
} as results ORDER BY results.props.last_name

// name: count_persons
//
MATCH (per:person)
RETURN count(per) as total_count

// name: create_person
// It takes into account the slug unicity
CREATE (per:person {
  slug:          {slug},
  name:          {name},
  first_name:    {first_name},
  last_name :    {last_name},
  {if:birth_date}
    birth_date:  {birth_date},
    birth_time:  {birth_time},
  {/if}
  {if:viaf_id}
    viaf_id:     {viaf_id},
  {/if}
  {if:wiki_id}
    wiki_id:     {wiki_id},
  {/if}
  creation_date: {creation_date},
  creation_time: {creation_time}
})
RETURN {
  slug: per.slug,
  uri: 'person/' + per.slug,
  props: per
}


// name: get_slugs
// get just a list of persons
MATCH (per:person)
WHERE has(per.slug)
RETURN per.slug as slug


// name: merge_person
// simple merge person.
MERGE (per:person {original_slug: {original_slug}})
  ON CREATE SET
    per.name = {name},
    per.first_name  = {first_name},
    per.last_name   = {last_name},
    per.birth_date  = {birth_date},
    per.birth_time  = {birth_time},
    {if:birth_place}
      per.birth_place = {birth_place},
    {/if}
    per.creation_date = {creation_date},
    per.creation_time = {creation_time},
    {if:doi}
      per.doi = {doi}
    {/if}
    {if:dois}
      per.dois = {dois}
    {/if}  
    {if:death_date}
      per.death_date  = {death_date},
      per.death_time  = {death_time},
    {/if}
    {if:death_place}
      per.death_place = {death_place},
    {/if}
    {if:viaf_id}
      per.viaf_id  = {viaf_id},
    {/if}
    {if:wiki_id}
      per.wiki_id  = {wiki_id},
    {/if}
    {if:languages}
      per.languages   = {languages},
      
      {each:language in languages}
        per.{:abstract_%(language)} = {{:abstract_%(language)}},
      {/each}
    {/if}
    per.slug = {slug}
  ON MATCH SET
    per.name = {name},
    per.first_name  = {first_name},
    per.last_name   = {last_name},
    per.birth_date  = {birth_date},
    per.birth_time  = {birth_time},
    {if:birth_place}
      per.birth_place = {birth_place},
    {/if}
    per.creation_date = {creation_date},
    per.creation_time = {creation_time},
    {if:doi}
      per.doi = {doi}
    {/if}
    {if:dois}
      per.dois = {dois}
    {/if}  
    {if:death_date}
      per.death_date  = {death_date},
      per.death_time  = {death_time},
    {/if}
    {if:death_place}
      per.death_place = {death_place},
    {/if}
    {if:viaf_id}
      per.viaf_id  = {viaf_id},
    {/if}
    {if:wiki_id}
      per.wiki_id  = {wiki_id},
    {/if}
    {if:languages}
      per.languages   = {languages},
      
      {each:language in languages}
        per.{:abstract_%(language)} = {{:abstract_%(language)}},
      {/each}
    {/if}
    per.slug = {slug}
  RETURN per

// name: merge_incomplete_person
// create a placeholder for a person when we do not have first_name or last_name information
MERGE (per:person {original_slug: {original_slug}})
  ON CREATE SET
    per.name        = {name},
    per.languages   = {languages},
    per.doi         = {doi},
    per.dois        = {dois}
  RETURN per

// name: get_related_persons_by_activity
// by activity only
MATCH (per:person {slug: {slug}})
OPTIONAL MATCH (per)-[r1:employed_as]->(act:activity)-[r2:employed_as]-(per2:person)
WHERE id(per) <> id(per2)
RETURN {
   slug: per2.slug,
   props: per2,
   amount: count(DISTINCT act),
   activities:  extract(n IN collect(DISTINCT act) | {slug: n.slug, props: n}) ,
   dt: min(abs(r1.start_time - r2.start_time))
  } as shared_activity
ORDER BY shared_activity.amount DESC, shared_activity.dt ASC
SKIP {offset}
LIMIT {limit}


// name: get_related_persons_by_institution
//
MATCH (per:person {slug: {slug}})
OPTIONAL MATCH (per)-[r1:employed_as]->(act:activity)--(ins:institution)--(act2:activity)<-[r2:employed_as]-(per2:person)
WHERE per <> per2
RETURN {
  slug: per2.slug,
  props: per2,
  amount: count(DISTINCT ins),
  genericity: sum(coalesce(ins.df,0)),
  institutions:  extract(n IN collect(DISTINCT ins) | {slug: n.slug, props: n}),
  dt: min(abs(r1.start_time - r2.start_time)),
  det: min(abs(r1.end_time - r2.end_time))
} as institution

   ORDER BY institution.genericity ASC, institution.amount DESC, institution.dt ASC, institution.det ASC

SKIP {offset}
LIMIT {limit}


// name: get_related_persons_by_everything
// demo only: IT MUST BE DONE WITH PATHS MATCH p=(per:person {slug: 'konrad-adenauer'})-[*1..3]-(per2:person) ...
MATCH p=(per:person)-[*1..3]-(per2:person)
RETURN DISTINCT {
   slug:per2.slug,
   types: EXTRACT(n in nodes(p)|last(labels(n)))
}


// name: remove_person
// delete a person and its links, completely
MATCH (per:person {slug: {slug}})
OPTIONAL MATCH (per)-[r]-()
DELETE per, r