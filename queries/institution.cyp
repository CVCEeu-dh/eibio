// name: merge_institution
MERGE (ins:institution {slug: {slug}})
  ON CREATE SET
    ins.name           = {name},
    ins.creation_date  = {creation_date},
    ins.creation_time  = {creation_time},
    {if:name_fr}
    ins.name_fr        = {name_fr},
    {/if}
    {if:name_fr}
    ins.name_en        = {name_en},
    {/if}
    ins.wiki_id        = {wiki_id},
    {if:country}
    ins.country        = {country}
    {/if}
RETURN {
  id: id(ins),
  props: ins,
  type: last(labels(ins))
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