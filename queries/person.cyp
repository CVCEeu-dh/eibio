// name: get_person
// get person with the list of its activities. By SLUG
MATCH (per:person)
WHERE per.slug = {slug} OR {slug} in per.dois
WITH per
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

WITH per, activities
  OPTIONAL MATCH (per)-[r2:has_nationality]->(nat:nationality)
WITH per, activities, {
  id: id(nat),
  slug: nat.slug,
  uri: 'nationality/' + nat.slug,
  props: nat,
  rel: r2
} as nationalities

RETURN {
  slug: per.slug,
  uri: 'person/' + per.slug,
  props: per,
  activities: collect(DISTINCT activities),
  nationalities: collect(DISTINCT nationalities)
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
MERGE (per:person {slug: {slug}})
  ON CREATE SET
    per.name = {name},
    per.name_search = {name_search},
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
      per.doi = {doi},
    {/if}
    {if:dois}
      per.dois = {dois},
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
    {if:name}
      per.name = {name},
    {/if}
    {if:name_search}
      per.name_search = {name_search},
    {/if}
    {if:first_name}
      per.first_name  = {first_name},
    {/if}
    {if:last_name}
      per.last_name   = {last_name},
    {/if}
    {if:birth_date}
      per.birth_date  = {birth_date},
      per.birth_time  = {birth_time},
    {/if}
    {if:birth_place}
      per.birth_place = {birth_place},
    {/if}
    {if:doi}
      per.doi = {doi},
    {/if}
    {if:dois}
      per.dois = {dois},
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
    per.last_modification_date = {creation_date},
    per.last_modification_time = {creation_time},
    
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


// name: count_related_persons_by_media
//
MATCH (per:person {slug: {slug}})-[r_kno:has_media]->(m:media)<-[r_unk:has_media]-(per2:person)
RETURN count(per) as total_count

// name: get_related_persons_by_media
// get the top 3 person who shared most resources with you
MATCH (per:person {slug: {slug}})-[r_kno:has_media]->(med:media)<-[r_unk:has_media]-(per2:person)
WHERE id(per) <> id(per2)
WITH per, per2, count(med) as intersection
ORDER BY intersection DESC
SKIP {offset}
LIMIT {limit}
WITH per, per2, intersection
MATCH (per)-[r_kno:has_media]->(med:media)<-[r_unk:has_media]-(per2)
WITH per, r_kno, per2, med, r_unk, intersection
ORDER BY r_kno.starred DESC, r_unk.starred DESC, r_kno.tf DESC, r_unk.tf DESC
WITH per, per2, intersection, collect({
  id: id(med),
  props: med,
  type: last(labels(med)),
  tf: r_unk.tf,
  tfidf: r_unk.tfidf,
  rating: COALESCE(r_unk.starred,0)
})[0..5] as medias

RETURN {
  id: id(per2),
  props: per2,
  media: medias,
  intersections: intersection
} as item
ORDER BY item.intersections DESC




// name: get_related_persons_by_activity
// by activity only
MATCH (per:person {slug: {slug}})
OPTIONAL MATCH (per)-[r1:employed_as]->(act:activity)-[r2:employed_as]-(per2:person)
WHERE per <> per2
WITH per2, {  
  id: id(act),
  slug: act.slug,
  props: act,
  rel: r2,
  dt: min(abs(r1.start_time - r2.start_time)),
  det: min(abs(r1.end_time - r2.end_time)),
  genericity: act.df
} as shared_activity
RETURN {
   id: id(per2),
   slug: per2.slug,
   props: per2,
   amount: count(DISTINCT shared_activity),
   genericity: min(shared_activity.genericity),
   activities:  collect(shared_activity),
   dt: min(shared_activity.dt),
   det: min(shared_activity.det)
  } as colleague
ORDER BY colleague.dt ASC, colleague.genericity ASC, colleague.det ASC, colleague.amount DESC
SKIP {offset}
LIMIT {limit}


// name: get_related_persons_by_institution
//
MATCH (per:person {slug: {slug}})-[r1:employed_as]->(act:activity)--(ins:institution)--(act2:activity)<-[r2:employed_as]-(per2:person)
WHERE per <> per2
RETURN {
  slug: per2.slug,
  props: per2,
  amount: count(DISTINCT ins),
  genericity: sum(coalesce(ins.df,0))/count(distinct ins),
  institutions:  extract(n IN collect(DISTINCT ins) | {slug: n.slug, props: n}),
  dt: min(abs(r1.start_time - r2.start_time)),
  det: min(abs(r1.end_time - r2.end_time))
} as institution

   ORDER BY institution.dt ASC, institution.genericity ASC, institution.amount DESC,  institution.det ASC

SKIP {offset}
LIMIT {limit}


// name: get_related_persons_by_everything
// demo only: IT MUST BE DONE WITH PATHS MATCH p=(per:person {slug: 'konrad-adenauer'})-[*1..3]-(per2:person) ...
MATCH p=(per:person)-[*1..3]-(per2:person)
RETURN DISTINCT {
   slug:per2.slug,
   types: EXTRACT(n in nodes(p)|last(labels(n)))
}



// name: get_related_medias
//
MATCH (per:person {slug: {slug}})-[r:has_media]->(med:media)
WITH r, med
ORDER BY r.rating DESC, r.tfidf DESC, r.tf DESC
SKIP {offset}
LIMIT {limit}

WITH med, r

OPTIONAL MATCH (med)<-[r1:has_media]-(per:person)
WHERE per.slug <> {slug}
WITH med, r, {
  id: id(per),
  props: per,
  tf: r1.tf,
  tfidf: r1.tfidf,
  rating: COALESCE(r1.starred,0)
} as relatedItem
WITH med, r, filter(x in collect(relatedItem) WHERE x.id IS NOT NULL) as persons
RETURN
{
  id: id(med),
  props: med,
  type: last(labels(med)),
  tf: r.tf,
  tfidf: r.tfidf,
  rating: COALESCE(r.starred,0),
  persons: persons
} as item
ORDER BY item.rating DESC, item.tfidf DESC, item.tf DESC




// name: count_related_medias
//
MATCH (per:person {slug: {slug}})-[r:has_media]->(med:media)
RETURN count(DISTINCT med) as total_count



// name: remove_person
// delete a person and its links, completely
MATCH (per:person {slug: {slug}})
OPTIONAL MATCH (per)-[r]-()
DELETE per, r