// name: get_institutions
// get institutions
MATCH(ins:institution)
RETURN {
  slug: ins.slug,
  uri:  'institution/' + ins.slug,
  props: ins,
  type:  last(labels(ins))
}
SKIP {offset}
LIMIT {limit}


// name: get_institution
// get single institution
MATCH(ins:institution {slug: {slug}})
RETURN {
  slug: ins.slug,
  props:ins,
  type: last(labels(ins))
}

// name: count_institutions
//
MATCH (ins:institution)
RETURN count(DISTINCT(ins)) as total_count


// name: count_institution_related_persons
//
MATCH (ins:institution {slug:{slug}})-[:appears_in]->(act:activity)<-[:employed_as]-(per:person)
RETURN count(DISTINCT(per)) as total_count


// name: get_institution_related_persons
//
MATCH (ins:institution {slug:{slug}})-[:appears_in]->(act:activity)<-[r:employed_as]-(per:person)
WITH DISTINCT per, r, act
RETURN {
  slug: per.slug,
  uri: 'person/' + per.slug,
  props: per,
  activities: collect(act),
  rels:       collect(r),
  start_time: max(r.start_time)
} as person
ORDER BY person.start_time DESC
SKIP {offset}
LIMIT {limit}


// name: merge_institution
//
MERGE (ins:institution {slug: {slug}})
  ON CREATE SET
    ins.name           = {name},
    {if:name_fr}
      ins.name_fr      = {name_fr},
    {/if}
    {if:name_en}
      ins.name_en      = {name_en},
    {/if}
    {if:abstract_fr}
      ins.abstract_fr  = {abstract_fr},
    {/if}
    {if:abstract_en}
      ins.abstract_en  = {abstract_en},
    {/if}
    {if:address}
      ins.address      = {address},
    {/if}
    {if:url}
      ins.url          = {url},
    {/if}
    {if:wiki_id}
      ins.wiki_id      = {wiki_id},
    {/if}
    {if:country}
      ins.country      = {country},
    {/if}
    {if:short_country}
      ins.short_country = {short_country},
    {/if}
    {if:city}
      ins.city         = {city},
    {/if}
    {if:geocode_id}
      ins.geocode_id   = {geocode_id},
    {/if}
    {if:city}
      ins.city         = {city},
    {/if}
    {if:lat}
      ins.lat          = {lat},
    {/if}
    {if:lng}
      ins.lng          = {lng},
    {/if}
    {if:viaf_id}
      ins.viaf_id      = {viaf_id},
    {/if}
    ins.creation_date  = {creation_date},
    ins.creation_time  = {creation_time}
  ON MATCH SET
    {if:address}
      ins.address      = {address},
    {/if}
    {if:short_country}
      ins.short_country = {short_country},
    {/if}
    {if:city}
      ins.city         = {city},
    {/if}
    {if:geocode_id}
      ins.geocode_id   = {geocode_id},
    {/if}
    {if:lat}
      ins.lat          = {lat},
    {/if}
    {if:lng}
      ins.lng          = {lng},
    {/if}
    {if:viaf_id}
      ins.viaf_id      = {viaf_id},
    {/if}
    ins.last_modification_date  = {creation_date},
    ins.last_modification_time  = {creation_time}
RETURN {
  uri: 'institution/'+ins.slug,
  slug:  ins.slug,
  props: ins,
  type:  last(labels(ins))
} as institution

// name: merge_institution_activity_relationship
//
MATCH (ins:institution {slug: {slug}}), (act:activity {slug:{activity_slug}})
MERGE (ins)-[r:appears_in]->(act)
RETURN {
  id: id(ins),
  props: ins,
  type: last(labels(ins))
} as institution


// name: remove_institution
// delete an institution and its links
MATCH (ins:institution {slug: {slug}})
OPTIONAL MATCH (ins)-[r]-()
DELETE ins, r


// name: get_related_institutions_by_activity
// by activity only
MATCH (ins:institution {slug: {slug}})-[r1:appears_in]->(act:activity)<-[r2:appears_in]-(ins2:institution)
WHERE ins.slug <> ins2.slug
RETURN {
   slug: ins2.slug,
   props: ins2,
   amount: count(DISTINCT act),
   activities:  extract(n IN collect(DISTINCT act) | {slug: n.slug, props: n}) ,
   dt: min(abs(r1.start_time - r2.start_time))
  } as shared_activity
ORDER BY shared_activity.amount DESC, shared_activity.dt ASC
SKIP {offset}
LIMIT {limit}


// name: get_related_institutions_by_person
//
MATCH (ins:institution {slug: {slug}})-[r1:appears_in]->(act:activity)--(per:person)--(act2:activity)<-[r2:appears_in]-(ins2:institution)
RETURN {
  slug: ins2.slug,
  props: ins2,
  amount: count(DISTINCT per),
  persons:  extract(n IN collect(DISTINCT per) | {slug: n.slug, props: n}),
  dt: min(abs(r1.start_time - r2.start_time))
} as shared_activity
ORDER BY shared_activity.amount DESC, shared_activity.dt ASC
SKIP {offset}
LIMIT {limit}